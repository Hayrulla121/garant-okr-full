package uz.garantbank.okrTrackingSystem.service;


import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.garantbank.okrTrackingSystem.dto.*;
import uz.garantbank.okrTrackingSystem.entity.*;
import uz.garantbank.okrTrackingSystem.repository.*;

import org.springframework.web.multipart.MultipartFile;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import uz.garantbank.okrTrackingSystem.security.UserDetailsImpl;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class OkrService {

    @Autowired
    private DepartmentRepository departmentRepository;
    @Autowired
    private ObjectiveRepository objectiveRepository;
    @Autowired
    private KeyResultRepository keyResultRepository;
    @Autowired
    private ScoreCalculationService scoreService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private EvaluationRepository evaluationRepository;
    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Autowired
    private DivisionRepository divisionRepository;
    @Autowired
    private GroupRepository groupRepository;
    @Autowired
    private FileUploadService fileUploadService;
    @Autowired
    private PlatformSettingService platformSettingService;
    @Autowired
    private DepartmentAccessService accessService;
    @Autowired
    private ScoreSnapshotService scoreSnapshotService;
    @PersistenceContext
    private EntityManager entityManager;

    // ==================== DEPARTMENTS ====================

    @Transactional(readOnly = true)
    public List<DepartmentDTO> getAllDepartments() {
        try {
            return departmentRepository.findAllWithObjectives().stream()
                    .map(this::toDepartmentDTO)
                    .collect(Collectors.toList());
        } finally {
            scoreService.clearCache();
        }
    }

    @Transactional(readOnly = true)
    public DepartmentDTO getDepartment(String id) {
        try {
            return departmentRepository.findByIdWithObjectives(id)
                    .map(this::toDepartmentDTO)
                    .orElseThrow(() -> new RuntimeException("Department not found: " + id));
        } finally {
            scoreService.clearCache();
        }
    }

    @Transactional
    public DepartmentDTO createDepartment(DepartmentDTO dto) {
        log.debug("Creating department '{}' in division '{}'", dto.getName(), dto.getDivisionId());
        // NEW: Verify division exists and is required
        if (dto.getDivisionId() == null || dto.getDivisionId().isBlank()) {
            throw new IllegalArgumentException("Division ID is required");
        }

        Division division = divisionRepository.findById(dto.getDivisionId())
                .orElseThrow(() -> new IllegalArgumentException("Division not found with ID: " + dto.getDivisionId()));

        // Build department with division
        Department dept = Department.builder()
                .name(dto.getName())
                .division(division)  // NEW: Set parent division
                .build();

        Department saved = departmentRepository.save(dept);
        return toDepartmentDTO(saved);
    }

    @Transactional
    public DepartmentDTO updateDepartment(String id, DepartmentDTO dto) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Department not found"));

        // Update name if provided
        if (dto.getName() != null && !dto.getName().isBlank()) {
            department.setName(dto.getName());
        }

        // NEW: Update division if provided
        if (dto.getDivisionId() != null && !dto.getDivisionId().isBlank()) {
            Division division = divisionRepository.findById(dto.getDivisionId())
                    .orElseThrow(() -> new IllegalArgumentException("Division not found"));
            department.setDivision(division);
        }

        Department updated = departmentRepository.save(department);
        return toDepartmentDTO(updated);
    }

    @Transactional
    public void deleteDepartment(String id) {
        log.debug("Deleting department: {}", id);
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Department not found: " + id));

        // 1. Delete all evaluations for this department
        try {
            UUID deptUuid = UUID.fromString(id);
            var evaluations = evaluationRepository.findByTargetTypeAndTargetId("DEPARTMENT", deptUuid);
            evaluationRepository.deleteAll(evaluations);
        } catch (IllegalArgumentException e) {
            // ID is not a valid UUID, skip evaluation cleanup
        }

        // 2. Unassign all users from this department
        var usersInDept = userRepository.findByAssignedDepartmentId(id);
        for (var user : usersInDept) {
            user.getAssignedDepartments().remove(dept);
            userRepository.save(user);
        }

        // 3. Clear departmentLeader reference if set
        if (dept.getDepartmentLeader() != null) {
            dept.setDepartmentLeader(null);
            departmentRepository.save(dept);
        }

        // 4. Now delete the department (objectives will be cascade deleted)
        departmentRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public DepartmentScoreResult getDepartmentScoreWithEvaluations(String id) {
        try {
            Department dept = departmentRepository.findByIdWithObjectives(id)
                    .orElseThrow(() -> new RuntimeException("Department not found: " + id));
            return scoreService.calculateDepartmentScoreWithEvaluations(id, dept.getObjectives());
        } finally {
            scoreService.clearCache();
        }
    }

    // ==================== OBJECTIVES ====================

    @Transactional
    public ObjectiveDTO createObjective(String departmentId, ObjectiveDTO dto) {
        Department dept = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new RuntimeException("Department not found"));

        Objective obj = Objective.builder()
                .name(dto.getName())
                .weight(dto.getWeight())
                .department(dept)
                .build();

        return toObjectiveDTO(objectiveRepository.save(obj));
    }

    @Transactional
    public ObjectiveDTO updateObjective(String id, ObjectiveDTO dto) {
        Objective obj = objectiveRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Objective not found"));
        obj.setName(dto.getName());
        obj.setWeight(dto.getWeight());
        return toObjectiveDTO(objectiveRepository.save(obj));
    }

    @Transactional
    public void deleteObjective(String id) {
        objectiveRepository.deleteById(id);
    }

    // ==================== LEADER OBJECTIVES ====================

    /**
     * Create a personal (INDIVIDUAL-level) objective for the department's assigned leader.
     * These objectives are displayed separately from department objectives and have their own score.
     */
    @Transactional
    public ObjectiveDTO createLeaderObjective(String deptId, ObjectiveDTO dto) {
        Department dept = departmentRepository.findById(deptId)
                .orElseThrow(() -> new RuntimeException("Department not found: " + deptId));

        // If employeeId is provided, use that leader; otherwise fall back to departmentLeader
        User targetLeader;
        if (dto.getEmployeeId() != null && !dto.getEmployeeId().isBlank()) {
            targetLeader = userRepository.findById(UUID.fromString(dto.getEmployeeId()))
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + dto.getEmployeeId()));
        } else if (dept.getDepartmentLeader() != null) {
            targetLeader = dept.getDepartmentLeader();
        } else {
            throw new IllegalArgumentException(
                "Department has no leader assigned. Assign a department leader first or provide an employeeId.");
        }

        Objective obj = Objective.builder()
                .name(dto.getName())
                .weight(dto.getWeight() != null ? dto.getWeight() : 0)
                .department(dept)
                .employee(targetLeader)
                .level(ObjectiveLevel.INDIVIDUAL)
                .keyResults(new java.util.ArrayList<>())
                .build();
        return toObjectiveDTO(objectiveRepository.save(obj));
    }

    // ==================== KEY RESULTS ====================

    @Transactional
    public KeyResultDTO createKeyResult(String objectiveId, KeyResultDTO dto) {
        Objective obj = objectiveRepository.findById(objectiveId)
                .orElseThrow(() -> new RuntimeException("Objective not found"));

        // Validate total KR weight does not exceed 100%
        if (dto.getWeight() != null) {
            int existingTotal = obj.getKeyResults().stream()
                    .mapToInt(kr -> kr.getWeight() != null ? kr.getWeight() : 0)
                    .sum();
            int newTotal = existingTotal + dto.getWeight();
            if (newTotal > 100) {
                throw new IllegalArgumentException(
                    "Cannot add Key Result: total weight would be " + newTotal +
                    "% (existing " + existingTotal + "% + new " + dto.getWeight() +
                    "%). Total must not exceed 100%.");
            }
        }

        KeyResult kr = KeyResult.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .metricType(dto.getMetricType())
                .unit(dto.getUnit())
                .weight(dto.getWeight())
                .thresholdBelow(dto.getThresholds().getBelow())
                .thresholdMeets(dto.getThresholds().getMeets())
                .thresholdGood(dto.getThresholds().getGood())
                .thresholdVeryGood(dto.getThresholds().getVeryGood())
                .thresholdExceptional(dto.getThresholds().getExceptional())
                .actualValue(dto.getActualValue())
                .objective(obj)
                .build();

        return toKeyResultDTO(keyResultRepository.save(kr));
    }

    @Transactional
    public KeyResultDTO updateKeyResult(String id, KeyResultDTO dto) {
        KeyResult kr = keyResultRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Key Result not found"));

        // Validate total KR weight does not exceed 100% (exclude this KR's current weight)
        if (dto.getWeight() != null && kr.getObjective() != null) {
            int otherTotal = kr.getObjective().getKeyResults().stream()
                    .filter(other -> !other.getId().equals(kr.getId()))
                    .mapToInt(other -> other.getWeight() != null ? other.getWeight() : 0)
                    .sum();
            int newTotal = otherTotal + dto.getWeight();
            if (newTotal > 100) {
                throw new IllegalArgumentException(
                    "Cannot update Key Result: total weight would be " + newTotal +
                    "% (other KRs " + otherTotal + "% + this " + dto.getWeight() +
                    "%). Total must not exceed 100%.");
            }
        }

        kr.setName(dto.getName());
        kr.setDescription(dto.getDescription());
        kr.setMetricType(dto.getMetricType());
        kr.setUnit(dto.getUnit());
        kr.setActualValue(dto.getActualValue());
        kr.setWeight(dto.getWeight());

        if (dto.getThresholds() != null) {
            kr.setThresholdBelow(dto.getThresholds().getBelow());
            kr.setThresholdMeets(dto.getThresholds().getMeets());
            kr.setThresholdGood(dto.getThresholds().getGood());
            kr.setThresholdVeryGood(dto.getThresholds().getVeryGood());
            kr.setThresholdExceptional(dto.getThresholds().getExceptional());
        }

        return toKeyResultDTO(keyResultRepository.save(kr));
    }

    @Transactional
    public KeyResultDTO updateKeyResultActualValue(String id, String actualValue, MultipartFile attachment) {
        KeyResult kr = keyResultRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Key Result not found"));

        // Check if attachment is required by platform setting
        if (platformSettingService.isAttachmentRequiredForActualValue()) {
            if (attachment == null || attachment.isEmpty()) {
                throw new IllegalArgumentException(
                    "Attachment is required when updating actual values. " +
                    "Please upload a proof/basis file.");
            }
        }

        kr.setActualValue(actualValue);

        // Handle attachment if provided
        if (attachment != null && !attachment.isEmpty()) {
            // Delete old attachment if exists
            if (kr.getAttachmentUrl() != null) {
                fileUploadService.deleteAttachment(kr.getAttachmentUrl());
            }
            String attachmentUrl = fileUploadService.uploadKeyResultAttachment(id, attachment);
            kr.setAttachmentUrl(attachmentUrl);
            kr.setAttachmentFileName(attachment.getOriginalFilename());
        }

        return toKeyResultDTO(keyResultRepository.save(kr));
    }

    @Transactional
    public void deleteKeyResult(String id) {
        keyResultRepository.deleteById(id);
    }

    @Transactional
    public KeyResultDTO updateKeyResultProgress(String id, Integer progress) {
        if (progress == null || progress < 0 || progress > 100) {
            throw new IllegalArgumentException("Progress must be between 0 and 100");
        }
        KeyResult kr = keyResultRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Key Result not found"));
        kr.setProgress(progress);
        return toKeyResultDTO(keyResultRepository.save(kr));
    }

    @Transactional
    public KeyResultDTO toggleKeyResultActive(String id, boolean active) {
        KeyResult kr = keyResultRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Key Result not found"));
        kr.setActive(active);
        return toKeyResultDTO(keyResultRepository.save(kr));
    }

    // ==================== DTO MAPPERS ====================

    private DepartmentDTO toDepartmentDTO(Department department) {
        // Use the builder pattern if your DTO has @Builder annotation
        DepartmentDTO.DepartmentDTOBuilder builder = DepartmentDTO.builder()
                .id(department.getId())
                .name(department.getName());

        // NEW: Add division info to response
        if (department.getDivision() != null) {
            Division div = department.getDivision();
            DivisionSummaryDTO divisionSummary = DivisionSummaryDTO.builder()
                    .id(div.getId())
                    .name(div.getName())
                    .build();
            builder.division(divisionSummary);
        }

        // Add objectives (split by level) and calculate scores
        if (department.getObjectives() != null) {
            // Department-level objectives
            List<ObjectiveDTO> objectiveDTOs = department.getObjectives().stream()
                    .filter(obj -> obj.getLevel() == ObjectiveLevel.DEPARTMENT)
                    .map(this::toObjectiveDTO)
                    .collect(Collectors.toList());
            builder.objectives(objectiveDTOs);

            // Leader's personal (INDIVIDUAL-level) objectives
            List<uz.garantbank.okrTrackingSystem.entity.Objective> leaderObjs = department.getObjectives().stream()
                    .filter(obj -> obj.getLevel() == ObjectiveLevel.INDIVIDUAL)
                    .collect(Collectors.toList());
            if (!leaderObjs.isEmpty()) {
                List<ObjectiveDTO> leaderObjDTOs = leaderObjs.stream()
                        .map(this::toObjectiveDTO)
                        .collect(Collectors.toList());
                builder.leaderObjectives(leaderObjDTOs);
                builder.leaderScore(scoreService.calculateObjectiveScore(
                        leaderObjs.stream().flatMap(o -> o.getKeyResults().stream()).collect(java.util.stream.Collectors.toSet())));
                // Re-calculate properly as weighted dept-level score across leader objectives
                builder.leaderScore(scoreService.calculateDepartmentScore(leaderObjs));
            }

            // Leader name/id from departmentLeader
            if (department.getDepartmentLeader() != null) {
                builder.leaderName(department.getDepartmentLeader().getFullName());
                builder.leaderId(department.getDepartmentLeader().getId().toString());
            }

            // Populate groups
            try {
                List<uz.garantbank.okrTrackingSystem.entity.OrgGroup> groups =
                        groupRepository.findByDepartmentIdWithObjectives(department.getId());
                if (!groups.isEmpty()) {
                    builder.groups(groups.stream().map(this::toGroupDTO).collect(Collectors.toList()));
                }
            } catch (Exception e) {
                log.debug("Could not load groups for department {}: {}", department.getId(), e.getMessage());
            }

            // Populate leaders list: all DEPARTMENT_LEADER users assigned to this department
            List<User> deptUsers = userRepository.findByAssignedDepartmentId(department.getId());
            List<DepartmentDTO.LeaderInfo> leaderInfos = deptUsers.stream()
                    .filter(u -> u.getRole() == Role.DEPARTMENT_LEADER)
                    .map(u -> DepartmentDTO.LeaderInfo.builder()
                            .id(u.getId().toString())
                            .fullName(u.getFullName())
                            .build())
                    .collect(Collectors.toList());
            builder.leaders(leaderInfos);

            // Automatic OKR score — only from DEPARTMENT-level objectives
            List<uz.garantbank.okrTrackingSystem.entity.Objective> deptLevelObjs = department.getObjectives().stream()
                    .filter(obj -> obj.getLevel() == ObjectiveLevel.DEPARTMENT)
                    .collect(Collectors.toList());
            uz.garantbank.okrTrackingSystem.dto.ScoreResult okrScore =
                    scoreService.calculateDepartmentScore(deptLevelObjs);
            builder.score(okrScore);

            // Final combined score: OKR + Director + HR evaluations (dept objectives only)
            DepartmentScoreResult scoreWithEvals =
                    scoreService.calculateDepartmentScoreWithEvaluations(
                            department.getId(), deptLevelObjs);
            if (scoreWithEvals.getFinalCombinedScore() != null) {
                uz.garantbank.okrTrackingSystem.dto.ScoreResult finalScore =
                        uz.garantbank.okrTrackingSystem.dto.ScoreResult.builder()
                                .score(scoreWithEvals.getFinalCombinedScore())
                                .percentage(scoreWithEvals.getFinalPercentage())
                                .level(scoreWithEvals.getScoreLevel())
                                .color(scoreWithEvals.getColor())
                                .build();
                builder.finalScore(finalScore);
            }
        }

        return builder.build();
    }

    private GroupDTO toGroupDTO(OrgGroup group) {
        GroupDTO.GroupDTOBuilder builder = GroupDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .departmentId(group.getDepartment().getId())
                .departmentName(group.getDepartment().getName());

        if (group.getGroupLeader() != null) {
            builder.leader(UserSummaryDTO.builder()
                    .id(group.getGroupLeader().getId())
                    .username(group.getGroupLeader().getUsername())
                    .fullName(group.getGroupLeader().getFullName())
                    .profilePhotoUrl(group.getGroupLeader().getProfilePhotoUrl())
                    .build());
        }

        if (group.getObjectives() != null && !group.getObjectives().isEmpty()) {
            List<Objective> groupObjs = group.getObjectives().stream()
                    .filter(o -> o.getLevel() == ObjectiveLevel.GROUP)
                    .collect(Collectors.toList());
            builder.objectives(groupObjs.stream().map(this::toObjectiveDTO).collect(Collectors.toList()));
            builder.score(scoreService.calculateDepartmentScore(groupObjs));
        } else {
            builder.objectives(java.util.Collections.emptyList());
        }

        // Populate group members
        try {
            OrgGroup withMembers = groupRepository.findByIdWithMembers(group.getId()).orElse(group);
            builder.members(withMembers.getMembers().stream()
                    .map(u -> UserSummaryDTO.builder()
                            .id(u.getId())
                            .username(u.getUsername())
                            .fullName(u.getFullName())
                            .profilePhotoUrl(u.getProfilePhotoUrl())
                            .build())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            builder.members(java.util.Collections.emptyList());
        }

        return builder.build();
    }

    private ObjectiveDTO toObjectiveDTO(Objective obj) {
        List<KeyResultDTO> keyResults = obj.getKeyResults().stream()
                .map(this::toKeyResultDTO)
                .collect(Collectors.toList());

        ObjectiveDTO.ObjectiveDTOBuilder builder = ObjectiveDTO.builder()
                .id(obj.getId())
                .name(obj.getName())
                .weight(obj.getWeight())
                .departmentId(obj.getDepartment() != null ? obj.getDepartment().getId() : null)
                .keyResults(keyResults)
                .score(scoreService.calculateObjectiveScore(obj.getKeyResults()));

        if (obj.getEmployee() != null) {
            builder.employeeId(obj.getEmployee().getId().toString());
            builder.employeeName(obj.getEmployee().getFullName());
        }

        return builder.build();
    }

    private KeyResultDTO toKeyResultDTO(KeyResult kr) {
        // Determine if current user can view progress for this KR's department
        Integer progress = null;
        try {
            String departmentId = kr.getObjective().getDepartment().getId();
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
                UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
                User currentUser = userRepository.findById(userDetails.getId()).orElse(null);
                if (currentUser != null && accessService.canViewProgress(currentUser, departmentId)) {
                    progress = kr.getProgress();
                }
            }
        } catch (Exception e) {
            // If we can't determine visibility, hide progress
        }

        return KeyResultDTO.builder()
                .id(kr.getId())
                .name(kr.getName())
                .description(kr.getDescription())
                .metricType(kr.getMetricType())
                .unit(kr.getUnit())
                .weight(kr.getWeight())
                .thresholds(ThresholdDTO.builder()
                        .below(kr.getThresholdBelow())
                        .meets(kr.getThresholdMeets())
                        .good(kr.getThresholdGood())
                        .veryGood(kr.getThresholdVeryGood())
                        .exceptional(kr.getThresholdExceptional())
                        .build())
                .actualValue(kr.getActualValue())
                .objectiveId(kr.getObjective().getId())
                .score(scoreService.calculateKeyResultScore(kr))
                .attachmentUrl(kr.getAttachmentUrl())
                .attachmentFileName(kr.getAttachmentFileName())
                .progress(progress)
                .active(kr.getActive() != null ? kr.getActive() : true)
                .build();
    }

    @Transactional
    public List<DepartmentDTO> loadDemoData() {
        try {
            log.info("Loading demo data...");

            // ── Clear existing data (respect FK order) ────────────────────────────
            scoreSnapshotService.deleteAll();
            evaluationRepository.deleteAll();
            var allUsers = userRepository.findAllWithDepartments();
            for (var u : allUsers) u.getAssignedDepartments().clear();
            userRepository.saveAll(allUsers);
            groupRepository.deleteAll();
            var allDepts = departmentRepository.findAll();
            for (var d : allDepts) d.setDepartmentLeader(null);
            departmentRepository.saveAll(allDepts);
            departmentRepository.deleteAll();
            userRepository.deleteAll();
            divisionRepository.deleteAll();
            entityManager.flush();

            // ── DIVISIONS ─────────────────────────────────────────────────────────
            Division divRetail    = mkDiv("Розничный бизнес");
            Division divCorporate = mkDiv("Корпоративный бизнес");
            Division divOpsIT     = mkDiv("Операции и ИТ");
            Division divRisk      = mkDiv("Управление рисками");

            // ── DEPARTMENTS ───────────────────────────────────────────────────────
            Department dRetailSales  = mkDept("Отдел розничных продаж",          divRetail);
            Department dCustService  = mkDept("Отдел обслуживания клиентов",      divRetail);
            Department dCorpSales    = mkDept("Корпоративные продажи",            divCorporate);
            Department dPMO          = mkDept("PMO - Управление проектами",       divCorporate);
            Department dITDev        = mkDept("ИТ-разработка и цифровизация",     divOpsIT);
            Department dOpsSupport   = mkDept("Операционная поддержка",           divOpsIT);
            Department dCreditRisk   = mkDept("Управление кредитными рисками",    divRisk);
            Department dCompliance   = mkDept("Комплаенс и регуляторика",         divRisk);

            // ── USERS ─────────────────────────────────────────────────────────────

            // Core roles
            User admin = mkUser("admin",    "admin@garantbank.uz",   "admin123",      "System Administrator",  Role.ADMIN,          null, null);
            User dir1  = mkUser("director", "director@garantbank.uz","director123",   "Алишер Каримов",        Role.DIRECTOR,       "Председатель правления", null);
            User dir2  = mkUser("director2","director2@garantbank.uz","director123",  "Фарход Мусаев",         Role.DIRECTOR,       "Заместитель председателя", null);
            User hr1   = mkUser("hr",       "hr@garantbank.uz",      "hr123",         "Гульнора Азимова",      Role.HR,             "Начальник отдела кадров", null);
            User hr2   = mkUser("hr2",      "hr2@garantbank.uz",     "hr123",         "Малика Юсупова",        Role.HR,             "HR-специалист", null);
            User biz1  = mkUser("business", "business@garantbank.uz","business123",   "Шерзод Рахимов",        Role.BUSINESS_BLOCK, "Руководитель бизнес-блока", null);

            // Department leaders
            User ldrRetailSales = mkUser("leader_retail",   "leader.retail@garantbank.uz", "leader123", "Нилуфар Хасанова",    Role.DEPARTMENT_LEADER, "Начальник отдела розничных продаж",   dRetailSales);
            User ldrCustSvc     = mkUser("leader_custsvc",  "leader.custsvc@garantbank.uz","leader123", "Отабек Мирзаев",      Role.DEPARTMENT_LEADER, "Начальник отдела клиентского сервиса", dCustService);
            User ldrCorpSales   = mkUser("leader_corp",     "leader.corp@garantbank.uz",   "leader123", "Зафар Ахмедов",       Role.DEPARTMENT_LEADER, "Начальник корпоративных продаж",       dCorpSales);
            User ldrPMO         = mkUser("leader_pmo",      "leader.pmo@garantbank.uz",    "leader123", "Умида Усманова",      Role.DEPARTMENT_LEADER, "Руководитель PMO",                     dPMO);
            User ldrIT          = mkUser("leader_it",       "leader.it@garantbank.uz",     "leader123", "Санжар Тошматов",     Role.DEPARTMENT_LEADER, "Директор по ИТ",                       dITDev);
            User ldrOps         = mkUser("leader_ops",      "leader.ops@garantbank.uz",    "leader123", "Камола Раximова",     Role.DEPARTMENT_LEADER, "Начальник операционного отдела",       dOpsSupport);
            User ldrRisk        = mkUser("leader_risk",     "leader.risk@garantbank.uz",   "leader123", "Бехзод Назаров",      Role.DEPARTMENT_LEADER, "Начальник отдела рисков",              dCreditRisk);
            User ldrCompliance  = mkUser("leader_compliance","leader.compliance@garantbank.uz","leader123","Феруза Каримова",  Role.DEPARTMENT_LEADER, "Начальник комплаенс-отдела",           dCompliance);

            // Employees
            User emp1  = mkUser("emp_retail1",  "emp.retail1@garantbank.uz",  "emp123", "Бахром Иброхимов",  Role.EMPLOYEE, "Старший менеджер по продажам",    dRetailSales);
            User emp2  = mkUser("emp_retail2",  "emp.retail2@garantbank.uz",  "emp123", "Дилноза Турсунова", Role.EMPLOYEE, "Менеджер по продажам",             dRetailSales);
            User emp3  = mkUser("emp_custsvc1", "emp.custsvc1@garantbank.uz", "emp123", "Азиз Рустамов",     Role.EMPLOYEE, "Специалист клиентского сервиса",   dCustService);
            User emp4  = mkUser("emp_custsvc2", "emp.custsvc2@garantbank.uz", "emp123", "Мадина Алиева",     Role.EMPLOYEE, "Ведущий специалист по клиентам",   dCustService);
            User emp5  = mkUser("emp_corp1",    "emp.corp1@garantbank.uz",    "emp123", "Жасур Холматов",    Role.EMPLOYEE, "Менеджер по корпоративным клиентам", dCorpSales);
            User emp6  = mkUser("emp_pmo1",     "emp.pmo1@garantbank.uz",     "emp123", "Зебо Юлдашева",     Role.EMPLOYEE, "Проектный менеджер",               dPMO);
            User emp7  = mkUser("emp_it1",      "emp.it1@garantbank.uz",      "emp123", "Рустам Абдуллаев",  Role.EMPLOYEE, "Senior Java Developer",            dITDev);
            User emp8  = mkUser("emp_it2",      "emp.it2@garantbank.uz",      "emp123", "Гулбахор Эргашева", Role.EMPLOYEE, "Frontend Developer",               dITDev);
            User emp9  = mkUser("emp_ops1",     "emp.ops1@garantbank.uz",     "emp123", "Шохрух Исмоилов",   Role.EMPLOYEE, "Специалист бэк-офиса",             dOpsSupport);
            User emp10 = mkUser("emp_risk1",    "emp.risk1@garantbank.uz",    "emp123", "Наргиза Сайдалиева",Role.EMPLOYEE, "Риск-аналитик",                    dCreditRisk);

            // Set department leaders
            setLeader(dRetailSales, ldrRetailSales);
            setLeader(dCustService, ldrCustSvc);
            setLeader(dCorpSales,   ldrCorpSales);
            setLeader(dPMO,         ldrPMO);
            setLeader(dITDev,       ldrIT);
            setLeader(dOpsSupport,  ldrOps);
            setLeader(dCreditRisk,  ldrRisk);
            setLeader(dCompliance,  ldrCompliance);

            // ── OBJECTIVES & KEY RESULTS ──────────────────────────────────────────

            // ── 1. РОЗНИЧНЫЕ ПРОДАЖИ (high performer ~0.82) ──────────────────────
            createDemoObjective(dRetailSales, "Рост розничного кредитного портфеля", 30, new DemoKR[]{
                new DemoKR("Объём выданных потребительских кредитов (млрд сум)",   HIGHER, "млрд", 40, 50.0, 70.0,  90.0, 110.0, 130.0, "118"),
                new DemoKR("Количество новых заёмщиков за квартал",               HIGHER, "чел",  35, 500.0, 800.0, 1100.0,1400.0,1700.0, "1350"),
                new DemoKR("Доля просроченной задолженности (%)",                  LOWER,  "%",    25, 8.0,   5.0,   3.0,  1.5,   0.5,   "1.8")
            });
            createDemoObjective(dRetailSales, "Увеличение клиентской базы", 35, new DemoKR[]{
                new DemoKR("Новые активные клиенты (тыс. чел)",                   HIGHER, "тыс",  50, 2.0,  3.5,   5.0,  7.0,  10.0,  "7.2"),
                new DemoKR("Уровень удержания клиентов (%)",                       HIGHER, "%",    50, 70.0, 80.0,  88.0, 94.0, 100.0, "91")
            });
            createDemoObjective(dRetailSales, "Цифровые продажи и онлайн-каналы", 35, new DemoKR[]{
                new DemoKR("Доля продаж через мобильное приложение (%)",           HIGHER, "%",    40, 20.0, 35.0,  50.0, 65.0, 80.0,  "58"),
                new DemoKR("Конверсия заявок на кредит онлайн (%)",               HIGHER, "%",    35, 15.0, 22.0,  30.0, 38.0, 45.0,  "33"),
                new DemoKR("Время обработки заявки на кредит (часы)",             LOWER,  "ч",    25, 24.0, 12.0,  6.0,  3.0,  1.0,   "4")
            });

            // ── 2. ОБСЛУЖИВАНИЕ КЛИЕНТОВ (mixed ~0.65) ───────────────────────────
            createDemoObjective(dCustService, "Качество клиентского сервиса", 40, new DemoKR[]{
                new DemoKR("NPS (Net Promoter Score)",                            HIGHER, "балл", 35, 20.0, 35.0,  50.0, 65.0, 80.0,  "47"),
                new DemoKR("Среднее время ожидания в очереди (мин)",              LOWER,  "мин",  35, 15.0, 10.0,  6.0,  3.0,  1.0,   "7"),
                new DemoKR("Доля жалоб, решённых с первого обращения (%)",        HIGHER, "%",    30, 50.0, 65.0,  75.0, 85.0, 95.0,  "72")
            });
            createDemoObjective(dCustService, "Операционная эффективность колл-центра", 35, new DemoKR[]{
                new DemoKR("Среднее время обработки звонка (сек)",                LOWER,  "сек",  50, 300.0,240.0,180.0,120.0, 90.0,  "155"),
                new DemoKR("Доля отвеченных звонков в течение 30 сек (%)",        HIGHER, "%",    50, 60.0, 72.0,  82.0, 90.0, 98.0,  "76")
            });
            createDemoObjective(dCustService, "Развитие персонала", 25, new DemoKR[]{
                new DemoKR("Прохождение сертификации сотрудниками (%)",           HIGHER, "%",    50, 40.0, 60.0,  75.0, 88.0,100.0, "60"),
                new DemoKR("Оценка качества обучения (опрос)",                    QUALITATIVE, "", 50, 0.0, 0.0, 0.0, 0.0, 0.0, "C")
            });

            // ── 3. КОРПОРАТИВНЫЕ ПРОДАЖИ (strong ~0.88) ──────────────────────────
            createDemoObjective(dCorpSales, "Рост корпоративного кредитного портфеля", 35, new DemoKR[]{
                new DemoKR("Объём корпоративных кредитов (трлн сум)",             HIGHER, "трлн", 40, 1.0,  1.5,   2.0,  2.5,  3.0,   "2.7"),
                new DemoKR("Количество новых корпоративных клиентов",             HIGHER, "кл",   35, 10.0, 18.0,  25.0, 32.0, 40.0,  "35"),
                new DemoKR("Доля NPL в корпоративном портфеле (%)",               LOWER,  "%",    25, 6.0,  4.0,   2.5,  1.0,  0.5,   "0.9")
            });
            createDemoObjective(dCorpSales, "Транзакционный бизнес и комиссионный доход", 35, new DemoKR[]{
                new DemoKR("Доходы от РКО (млрд сум)",                            HIGHER, "млрд", 50, 10.0, 15.0,  20.0, 27.0, 35.0,  "28"),
                new DemoKR("Количество активных корпоративных счетов",            HIGHER, "шт",   50, 200.0,280.0, 360.0,440.0,520.0, "415")
            });
            createDemoObjective(dCorpSales, "Развитие продуктовой линейки", 30, new DemoKR[]{
                new DemoKR("Новые продукты выведены на рынок (шт)",               HIGHER, "шт",   50, 1.0,  2.0,   3.0,  4.0,  5.0,   "4"),
                new DemoKR("Оценка удовлетворённости корпоративных клиентов",     QUALITATIVE,"", 50, 0.0,  0.0,   0.0,  0.0,  0.0,   "A")
            });

            // ── 4. PMO (average ~0.70) ────────────────────────────────────────────
            createDemoObjective(dPMO, "Своевременная реализация проектов", 25, new DemoKR[]{
                new DemoKR("Проекты завершённые в срок (% от кол-ва)",            HIGHER, "%",    40, 50.0, 60.0,  80.0,100.0,100.0, "78"),
                new DemoKR("Задачи в JIRA, завершённые в срок (%)",               HIGHER, "%",    35, 50.0, 65.0,  80.0, 95.0,100.0, "82"),
                new DemoKR("Переносы сроков задач (% от общего кол-ва)",          LOWER,  "%",    25, 30.0, 20.0,  15.0,  5.0,  0.0, "12")
            });
            createDemoObjective(dPMO, "Управление рисками и бюджетом", 25, new DemoKR[]{
                new DemoKR("Проекты в рамках бюджета (% без превышения)",         HIGHER, "%",    30, 50.0, 60.0,  75.0, 90.0,100.0, "73"),
                new DemoKR("Неучтённые риски после начала проекта (кол-во)",      LOWER,  "",     25, 10.0,  5.0,   2.0,  1.0,  0.0, "3"),
                new DemoKR("Точность оценки трудозатрат (%)",                     HIGHER, "%",    25, 50.0, 60.0,  75.0, 85.0,100.0, "68"),
                new DemoKR("Процент рисков с планами митигации (%)",              HIGHER, "%",    20, 20.0, 50.0,  65.0, 80.0,100.0, "72")
            });
            createDemoObjective(dPMO, "Автоматизация и аналитика", 25, new DemoKR[]{
                new DemoKR("Уровень автоматизации процессов (%)",                  HIGHER, "%",    50, 50.0, 65.0,  78.0, 90.0,100.0, "71"),
                new DemoKR("Качество описания бизнес-процессов (% ошибок)",        LOWER,  "%",    50, 20.0, 15.0,  10.0,  5.0,  0.0, "11")
            });
            createDemoObjective(dPMO, "Человеческий капитал и обучение", 25, new DemoKR[]{
                new DemoKR("Укомплектованность штата (%)",                        HIGHER, "%",    40, 60.0, 75.0,  85.0, 95.0,100.0, "83"),
                new DemoKR("Сотрудники, прошедшие обучение Agile/Scrum (%)",      HIGHER, "%",    30, 50.0, 70.0,  85.0, 95.0,100.0, "90"),
                new DemoKR("Качество программы развития сотрудников",             QUALITATIVE,"", 30, 0.0,  0.0,   0.0,  0.0,  0.0, "B")
            });

            // ── 5. ИТ-РАЗРАБОТКА (high performer ~0.90) ──────────────────────────
            createDemoObjective(dITDev, "Цифровая трансформация продуктов", 30, new DemoKR[]{
                new DemoKR("Новые цифровые фичи выпущены в продакшн (шт)",        HIGHER, "шт",   40, 5.0,  10.0,  15.0, 20.0, 25.0,  "22"),
                new DemoKR("Аптайм систем (%)",                                   HIGHER, "%",    35, 95.0, 97.0,  99.0, 99.5, 99.9,  "99.7"),
                new DemoKR("Время деплоя новой версии (ч)",                       LOWER,  "ч",    25, 8.0,  4.0,   2.0,  1.0,  0.5,   "1.2")
            });
            createDemoObjective(dITDev, "Безопасность и качество ПО", 35, new DemoKR[]{
                new DemoKR("Критические уязвимости, устранённые в срок (%)",      HIGHER, "%",    50, 60.0, 75.0,  88.0, 95.0,100.0, "97"),
                new DemoKR("Покрытие кода автотестами (%)",                       HIGHER, "%",    50, 40.0, 55.0,  68.0, 80.0, 90.0,  "82")
            });
            createDemoObjective(dITDev, "Мобильный банк и пользовательский опыт", 35, new DemoKR[]{
                new DemoKR("Рейтинг мобильного приложения (App Store / GP)",      HIGHER, "★",    40, 3.5,  3.8,   4.2,  4.5,  4.8,   "4.6"),
                new DemoKR("Ежемесячные активные пользователи (тыс.)",            HIGHER, "тыс",  35, 50.0, 80.0, 120.0,170.0,220.0, "195"),
                new DemoKR("Среднее время загрузки страницы (сек)",               LOWER,  "сек",  25, 5.0,  3.0,   2.0,  1.0,  0.5,   "0.8")
            });

            // ── 6. ОПЕРАЦИОННАЯ ПОДДЕРЖКА (below average ~0.48) ──────────────────
            createDemoObjective(dOpsSupport, "Операционная безошибочность", 40, new DemoKR[]{
                new DemoKR("Доля операций без ошибок (%)",                        HIGHER, "%",    50, 85.0, 90.0,  95.0, 98.0,100.0, "91"),
                new DemoKR("Время обработки платежей (мин)",                      LOWER,  "мин",  50, 60.0, 40.0,  20.0, 10.0,  5.0, "35")
            });
            createDemoObjective(dOpsSupport, "Соблюдение регуляторных сроков", 35, new DemoKR[]{
                new DemoKR("Отчёты в ЦБ, сданные в срок (%)",                     HIGHER, "%",    50, 70.0, 80.0,  90.0, 97.0,100.0, "82"),
                new DemoKR("Нарушения регуляторных требований (кол-во)",           LOWER,  "",     50, 10.0,  6.0,   3.0,  1.0,  0.0, "5")
            });
            createDemoObjective(dOpsSupport, "Управление операционными рисками", 25, new DemoKR[]{
                new DemoKR("Инциденты операционного риска (кол-во)",              LOWER,  "",     50, 15.0, 10.0,   5.0,  2.0,  0.0, "9"),
                new DemoKR("Оценка внутреннего аудита",                           QUALITATIVE,"", 50, 0.0,  0.0,    0.0,  0.0,  0.0, "D")
            });

            // ── 7. КРЕДИТНЫЕ РИСКИ (good ~0.78) ──────────────────────────────────
            createDemoObjective(dCreditRisk, "Качество кредитного портфеля", 40, new DemoKR[]{
                new DemoKR("Доля NPL в совокупном портфеле (%)",                  LOWER,  "%",    40, 8.0,  5.0,   3.0,  1.5,  0.5,   "2.1"),
                new DemoKR("Коэффициент покрытия резервами (%)",                  HIGHER, "%",    35, 80.0, 90.0, 100.0,110.0,120.0, "108"),
                new DemoKR("Средний скоринговый балл новых заёмщиков",            HIGHER, "балл", 25, 550.0,620.0, 680.0,730.0,780.0, "705")
            });
            createDemoObjective(dCreditRisk, "Мониторинг и раннее предупреждение", 35, new DemoKR[]{
                new DemoKR("Кредиты, выявленные на ранних стадиях дефолта (%)",   HIGHER, "%",    50, 40.0, 55.0,  70.0, 85.0,100.0, "78"),
                new DemoKR("Время реагирования на тревожные сигналы (дни)",       LOWER,  "дн",   50, 10.0,  7.0,   4.0,  2.0,  1.0, "3")
            });
            createDemoObjective(dCreditRisk, "Стресс-тестирование и модели", 25, new DemoKR[]{
                new DemoKR("Стресс-тесты проведены по плану (%)",                 HIGHER, "%",    50, 60.0, 75.0,  88.0, 95.0,100.0, "90"),
                new DemoKR("Точность предсказательных моделей (%)",               HIGHER, "%",    50, 65.0, 75.0,  83.0, 90.0, 95.0,  "87")
            });

            // ── 8. КОМПЛАЕНС (below expectations ~0.35) ───────────────────────────
            createDemoObjective(dCompliance, "Выполнение регуляторных требований", 40, new DemoKR[]{
                new DemoKR("Нарушения нормативных актов (кол-во)",                LOWER,  "",     40, 20.0, 12.0,   6.0,  2.0,  0.0, "15"),
                new DemoKR("Обучение сотрудников по AML/CFT (%)",                 HIGHER, "%",    35, 40.0, 58.0,  72.0, 86.0,100.0, "51"),
                new DemoKR("Сдача регуляторных отчётов в срок (%)",               HIGHER, "%",    25, 60.0, 72.0,  83.0, 93.0,100.0, "66")
            });
            createDemoObjective(dCompliance, "Управление AML-рисками", 35, new DemoKR[]{
                new DemoKR("Подозрительные транзакции, рассмотренные в срок (%)", HIGHER, "%",    50, 50.0, 65.0,  78.0, 90.0,100.0, "62"),
                new DemoKR("Ложноположительные срабатывания AML-фильтров (%)",    LOWER,  "%",    50, 30.0, 22.0,  15.0,  8.0,  3.0, "24")
            });
            createDemoObjective(dCompliance, "Внутренние проверки и аудит", 25, new DemoKR[]{
                new DemoKR("Рекомендации аудита, выполненные в срок (%)",         HIGHER, "%",    50, 40.0, 55.0,  70.0, 85.0,100.0, "58"),
                new DemoKR("Оценка внутреннего аудита по комплаенсу",             QUALITATIVE,"", 50, 0.0,  0.0,   0.0,  0.0,  0.0, "D")
            });

            // ── LEADER OBJECTIVES (INDIVIDUAL-level personal OKRs) ───────────────

            // Умида Усманова — PMO Leader
            createLeaderObjective(dPMO, ldrPMO, "Стратегическое лидерство команды", 50, new DemoKR[]{
                new DemoKR("Проведение стратегических сессий с командой (кол-во)", HIGHER, "",  50, 1.0,  2.0,  4.0,  6.0,  8.0,  "5"),
                new DemoKR("Удовлетворённость команды руководством (%)",           HIGHER, "%", 50, 50.0, 60.0, 70.0, 80.0, 90.0, "75")
            });
            createLeaderObjective(dPMO, ldrPMO, "Развитие и менторинг сотрудников", 50, new DemoKR[]{
                new DemoKR("Часы менторинга за квартал (ч)",                       HIGHER, "ч", 60, 5.0, 10.0, 20.0, 30.0, 40.0, "25"),
                new DemoKR("Оценка программы развития командой",                   QUALITATIVE,"",40, 0.0, 0.0,  0.0,  0.0,  0.0,  "B")
            });

            // Санжар Тошматов — IT Leader
            createLeaderObjective(dITDev, ldrIT, "Техническое лидерство и архитектура", 50, new DemoKR[]{
                new DemoKR("Проведение архитектурных ревью (кол-во)",              HIGHER, "",  40, 1.0,  2.0,  4.0,  6.0,  8.0,  "7"),
                new DemoKR("Документирование ключевых технических решений (%)",    HIGHER, "%", 35, 40.0, 55.0, 70.0, 85.0,100.0, "88"),
                new DemoKR("Среднее время ревью pull-request (ч)",                 LOWER,  "ч", 25, 24.0, 12.0,  6.0,  3.0,  1.0,  "2.5")
            });
            createLeaderObjective(dITDev, ldrIT, "Развитие инженерной культуры", 50, new DemoKR[]{
                new DemoKR("Проведение tech-talk сессий (кол-во)",                 HIGHER, "",  50, 1.0,  2.0,  4.0,  6.0,  8.0,  "5"),
                new DemoKR("Оценка инженерной культуры командой",                 QUALITATIVE,"",50, 0.0,  0.0,  0.0,  0.0,  0.0,  "A")
            });

            // Нилуфар Хасанова — Retail Sales Leader
            createLeaderObjective(dRetailSales, ldrRetailSales, "Личный вклад в продажи", 60, new DemoKR[]{
                new DemoKR("Личный объём проведённых переговоров с клиентами",     HIGHER, "",  50, 5.0, 10.0, 18.0, 25.0, 35.0, "22"),
                new DemoKR("Конверсия личных переговоров в сделки (%)",            HIGHER, "%", 50, 20.0,30.0, 40.0, 50.0, 65.0, "45")
            });
            createLeaderObjective(dRetailSales, ldrRetailSales, "Управление и мотивация команды", 40, new DemoKR[]{
                new DemoKR("Индекс вовлечённости сотрудников (опрос, %)",          HIGHER, "%", 50, 50.0,62.0, 72.0, 82.0, 92.0, "78"),
                new DemoKR("Текучесть кадров в отделе (%)",                        LOWER,  "%", 50, 20.0,15.0, 10.0,  5.0,  2.0, "7")
            });

            // Зафар Ахмедов — Corporate Sales Leader
            createLeaderObjective(dCorpSales, ldrCorpSales, "Личный портфель ключевых клиентов", 100, new DemoKR[]{
                new DemoKR("Объём сделок с личными ключевыми клиентами (млрд)",    HIGHER, "млрд",50, 0.2, 0.5,  0.8,  1.2,  1.8, "1.3"),
                new DemoKR("NPS ключевых клиентов под личным ведением",            HIGHER, "балл",50, 20.0,35.0, 50.0, 65.0, 80.0, "68")
            });

            // ── GROUPS ──────────────────────────────────────────────────────────────
            // Retail Sales groups
            OrgGroup grpRetailLoans = mkGroup("Группа потребительского кредитования", dRetailSales, ldrRetailSales);
            addGroupMembers(grpRetailLoans, emp1, emp2);
            OrgGroup grpRetailCards = mkGroup("Группа карточных продуктов", dRetailSales, null);

            // Customer Service groups
            OrgGroup grpCallCenter = mkGroup("Колл-центр", dCustService, ldrCustSvc);
            addGroupMembers(grpCallCenter, emp3);
            OrgGroup grpBranchService = mkGroup("Обслуживание в филиалах", dCustService, null);
            addGroupMembers(grpBranchService, emp4);

            // IT Development groups
            OrgGroup grpBackend = mkGroup("Backend-разработка", dITDev, ldrIT);
            addGroupMembers(grpBackend, emp7);
            OrgGroup grpFrontend = mkGroup("Frontend-разработка", dITDev, null);
            addGroupMembers(grpFrontend, emp8);

            // PMO groups
            OrgGroup grpProjectMgmt = mkGroup("Управление проектами", dPMO, ldrPMO);
            addGroupMembers(grpProjectMgmt, emp6);

            // Operations groups
            OrgGroup grpPayments = mkGroup("Платёжные операции", dOpsSupport, ldrOps);
            addGroupMembers(grpPayments, emp9);

            // Risk groups
            OrgGroup grpCreditAnalysis = mkGroup("Кредитный анализ", dCreditRisk, ldrRisk);
            addGroupMembers(grpCreditAnalysis, emp10);

            // ── DIVISION OBJECTIVES ─────────────────────────────────────────────────
            createDivisionObjective(divRetail, "Рост розничного бизнеса", 50, new DemoKR[]{
                new DemoKR("Совокупный розничный доход (млрд сум)",     HIGHER, "млрд", 50, 100.0, 150.0, 200.0, 260.0, 320.0, "245"),
                new DemoKR("Доля рынка в розничных кредитах (%)",       HIGHER, "%",    50, 3.0,   5.0,   7.0,   9.0,   12.0,  "7.8")
            });
            createDivisionObjective(divRetail, "Клиентский опыт и лояльность", 50, new DemoKR[]{
                new DemoKR("NPS по розничному сегменту",                HIGHER, "балл", 50, 20.0, 35.0, 50.0, 65.0, 80.0, "55"),
                new DemoKR("Индекс удовлетворённости клиентов (%)",    HIGHER, "%",    50, 60.0, 70.0, 80.0, 88.0, 95.0, "82")
            });

            createDivisionObjective(divCorporate, "Рост корпоративного портфеля", 60, new DemoKR[]{
                new DemoKR("Совокупный корпоративный доход (трлн сум)", HIGHER, "трлн", 50, 1.0, 1.5, 2.2, 3.0, 4.0, "2.8"),
                new DemoKR("Количество корпоративных клиентов",        HIGHER, "кл",   50, 100.0, 150.0, 200.0, 270.0, 350.0, "230")
            });
            createDivisionObjective(divCorporate, "Эффективность проектного управления", 40, new DemoKR[]{
                new DemoKR("Проекты завершённые в срок и бюджете (%)",  HIGHER, "%",    100, 50.0, 65.0, 78.0, 88.0, 95.0, "80")
            });

            createDivisionObjective(divOpsIT, "Технологическое развитие", 50, new DemoKR[]{
                new DemoKR("Аптайм критичных систем (%)",               HIGHER, "%",    50, 95.0, 97.0, 99.0, 99.5, 99.9, "99.6"),
                new DemoKR("Внедрение новых технологий (шт)",          HIGHER, "шт",   50, 2.0,  4.0,  6.0,  8.0,  10.0, "7")
            });
            createDivisionObjective(divOpsIT, "Операционная надёжность", 50, new DemoKR[]{
                new DemoKR("Количество инцидентов (кол-во)",           LOWER,  "",     50, 20.0, 12.0, 6.0, 3.0, 0.0, "5"),
                new DemoKR("Время восстановления после сбоев (ч)",     LOWER,  "ч",    50, 8.0,  4.0,  2.0, 1.0, 0.5, "1.5")
            });

            createDivisionObjective(divRisk, "Качество управления рисками", 60, new DemoKR[]{
                new DemoKR("Совокупный NPL портфеля (%)",              LOWER,  "%",    50, 8.0, 5.0, 3.0, 1.5, 0.5, "2.5"),
                new DemoKR("Точность риск-моделей (%)",                HIGHER, "%",    50, 65.0, 75.0, 83.0, 90.0, 95.0, "86")
            });
            createDivisionObjective(divRisk, "Регуляторное соответствие", 40, new DemoKR[]{
                new DemoKR("Нарушения регуляторных требований (кол-во)",LOWER,  "",     50, 15.0, 8.0, 4.0, 1.0, 0.0, "6"),
                new DemoKR("Своевременная сдача отчётов (%)",           HIGHER, "%",    50, 70.0, 80.0, 90.0, 96.0, 100.0, "88")
            });

            // ── GROUP OBJECTIVES ────────────────────────────────────────────────────
            createGroupObjective(grpRetailLoans, dRetailSales, "Выполнение плана по кредитованию", 60, new DemoKR[]{
                new DemoKR("Выдано кредитов (млрд сум)",               HIGHER, "млрд", 50, 20.0, 35.0, 50.0, 65.0, 80.0, "58"),
                new DemoKR("Средний чек кредита (млн сум)",            HIGHER, "млн",  50, 5.0,  8.0,  12.0, 16.0, 20.0, "14")
            });
            createGroupObjective(grpRetailLoans, dRetailSales, "Качество кредитного портфеля", 40, new DemoKR[]{
                new DemoKR("Доля просрочки в группе (%)",              LOWER,  "%",    100, 8.0, 5.0, 3.0, 1.5, 0.5, "2.2")
            });

            createGroupObjective(grpCallCenter, dCustService, "Эффективность колл-центра", 100, new DemoKR[]{
                new DemoKR("Уровень обслуживания (% звонков < 30 сек)",HIGHER, "%",    40, 60.0, 72.0, 82.0, 90.0, 98.0, "78"),
                new DemoKR("Среднее время обработки звонка (сек)",     LOWER,  "сек",  30, 300.0, 240.0, 180.0, 120.0, 90.0, "160"),
                new DemoKR("Удовлетворённость клиентов колл-центра (%)", HIGHER, "%", 30, 60.0, 70.0, 80.0, 88.0, 95.0, "75")
            });

            createGroupObjective(grpBackend, dITDev, "Качество и скорость разработки", 60, new DemoKR[]{
                new DemoKR("Покрытие кода тестами (%)",                HIGHER, "%",    50, 40.0, 55.0, 68.0, 80.0, 90.0, "78"),
                new DemoKR("Количество критических багов в продакшн",  LOWER,  "",     50, 10.0, 6.0, 3.0, 1.0, 0.0, "2")
            });
            createGroupObjective(grpBackend, dITDev, "Техническое развитие", 40, new DemoKR[]{
                new DemoKR("Внедрение новых технологий (шт)",          HIGHER, "шт",   100, 1.0, 2.0, 3.0, 4.0, 5.0, "3")
            });

            createGroupObjective(grpFrontend, dITDev, "UX и производительность", 100, new DemoKR[]{
                new DemoKR("Рейтинг мобильного приложения (★)",       HIGHER, "★",    50, 3.5, 3.8, 4.2, 4.5, 4.8, "4.4"),
                new DemoKR("Среднее время загрузки страницы (сек)",    LOWER,  "сек",  50, 5.0, 3.0, 2.0, 1.0, 0.5, "1.1")
            });

            createGroupObjective(grpProjectMgmt, dPMO, "Реализация проектов", 100, new DemoKR[]{
                new DemoKR("Проекты завершённые в срок (%)",           HIGHER, "%",    50, 50.0, 60.0, 80.0, 100.0, 100.0, "75"),
                new DemoKR("Точность оценки трудозатрат (%)",          HIGHER, "%",    50, 50.0, 60.0, 75.0, 85.0, 100.0, "70")
            });

            createGroupObjective(grpPayments, dOpsSupport, "Точность и скорость обработки", 100, new DemoKR[]{
                new DemoKR("Доля операций без ошибок (%)",             HIGHER, "%",    50, 85.0, 90.0, 95.0, 98.0, 100.0, "93"),
                new DemoKR("Время обработки платежей (мин)",           LOWER,  "мин",  50, 60.0, 40.0, 20.0, 10.0, 5.0, "25")
            });

            createGroupObjective(grpCreditAnalysis, dCreditRisk, "Качество анализа", 100, new DemoKR[]{
                new DemoKR("Точность скоринговых моделей (%)",         HIGHER, "%",    50, 65.0, 75.0, 83.0, 90.0, 95.0, "85"),
                new DemoKR("Время рассмотрения заявки (дни)",          LOWER,  "дн",   50, 10.0, 7.0, 4.0, 2.0, 1.0, "3")
            });

            entityManager.flush();
            entityManager.clear();

            log.info("Demo data loaded successfully! 4 divisions, 8 departments, 11 groups, 20 users, division/department/group/leader objectives added.");

            // Generate quarterly score history for the chart
            scoreSnapshotService.generateDemoHistory();

            return getAllDepartments();
        } finally {
            scoreService.clearCache();
        }
    }

    // Shorthand metric types
    private static final KeyResult.MetricType HIGHER = KeyResult.MetricType.HIGHER_BETTER;
    private static final KeyResult.MetricType LOWER  = KeyResult.MetricType.LOWER_BETTER;
    private static final KeyResult.MetricType QUALITATIVE = KeyResult.MetricType.QUALITATIVE;

    private Division mkDiv(String name) {
        Division d = new Division();
        d.setName(name);
        return divisionRepository.save(d);
    }

    private Department mkDept(String name, Division div) {
        Department d = Department.builder().name(name).division(div).build();
        return departmentRepository.save(d);
    }

    private User mkUser(String username, String email, String password, String fullName,
                        Role role, String jobTitle, Department dept) {
        User u = User.builder()
                .username(username).email(email)
                .password(passwordEncoder.encode(password))
                .fullName(fullName).role(role).jobTitle(jobTitle)
                .isActive(true).assignedDepartments(new java.util.HashSet<>())
                .build();
        u = userRepository.save(u);
        if (dept != null) {
            u.getAssignedDepartments().add(dept);
            u = userRepository.save(u);
        }
        return u;
    }

    private void setLeader(Department dept, User leader) {
        dept.setDepartmentLeader(leader);
        departmentRepository.save(dept);
    }

    private OrgGroup mkGroup(String name, Department dept, User leader) {
        OrgGroup g = OrgGroup.builder()
                .name(name).department(dept).groupLeader(leader)
                .members(new java.util.HashSet<>()).objectives(new java.util.HashSet<>())
                .build();
        return groupRepository.save(g);
    }

    private void addGroupMembers(OrgGroup group, User... users) {
        for (User u : users) group.getMembers().add(u);
        groupRepository.save(group);
    }

    private void createDivisionObjective(Division div, String name, Integer weight, DemoKR[] krs) {
        Objective objective = new Objective();
        objective.setName(name);
        objective.setWeight(weight);
        objective.setDivision(div);
        objective.setLevel(ObjectiveLevel.DIVISION);
        objective = objectiveRepository.save(objective);
        createKRsForObjective(objective, krs);
    }

    private void createGroupObjective(OrgGroup group, Department dept, String name, Integer weight, DemoKR[] krs) {
        Objective objective = new Objective();
        objective.setName(name);
        objective.setWeight(weight);
        objective.setGroup(group);
        objective.setDepartment(dept);
        objective.setLevel(ObjectiveLevel.GROUP);
        objective = objectiveRepository.save(objective);
        createKRsForObjective(objective, krs);
    }

    private void createKRsForObjective(Objective objective, DemoKR[] krs) {
        for (DemoKR kr : krs) {
            KeyResult keyResult = new KeyResult();
            keyResult.setName(kr.name);
            keyResult.setMetricType(kr.type);
            keyResult.setUnit(kr.unit);
            keyResult.setWeight(kr.weight);
            keyResult.setThresholdBelow(kr.below);
            keyResult.setThresholdMeets(kr.meets);
            keyResult.setThresholdGood(kr.good);
            keyResult.setThresholdVeryGood(kr.veryGood);
            keyResult.setThresholdExceptional(kr.exceptional);
            keyResult.setActualValue(kr.actualValue);
            keyResult.setDescription(kr.description);
            keyResult.setObjective(objective);
            keyResultRepository.save(keyResult);
        }
    }

    private void createDemoObjective(Department dept, String name, Integer weight, DemoKR[] krs) {
        Objective objective = new Objective();
        objective.setName(name);
        objective.setWeight(weight);
        objective.setDepartment(dept);
        objective = objectiveRepository.save(objective);

        for (DemoKR kr : krs) {
            KeyResult keyResult = new KeyResult();
            keyResult.setName(kr.name);
            keyResult.setMetricType(kr.type);
            keyResult.setUnit(kr.unit);
            keyResult.setWeight(kr.weight);
            keyResult.setThresholdBelow(kr.below);
            keyResult.setThresholdMeets(kr.meets);
            keyResult.setThresholdGood(kr.good);
            keyResult.setThresholdVeryGood(kr.veryGood);
            keyResult.setThresholdExceptional(kr.exceptional);
            keyResult.setActualValue(kr.actualValue);
            keyResult.setDescription(kr.description);
            keyResult.setObjective(objective);
            keyResultRepository.save(keyResult);
        }
    }

    /** Create an INDIVIDUAL-level (leader personal) objective for demo data */
    private void createLeaderObjective(Department dept, User leader, String name, Integer weight, DemoKR[] krs) {
        Objective objective = new Objective();
        objective.setName(name);
        objective.setWeight(weight);
        objective.setDepartment(dept);
        objective.setEmployee(leader);
        objective.setLevel(ObjectiveLevel.INDIVIDUAL);
        objective = objectiveRepository.save(objective);

        for (DemoKR kr : krs) {
            KeyResult keyResult = new KeyResult();
            keyResult.setName(kr.name);
            keyResult.setMetricType(kr.type);
            keyResult.setUnit(kr.unit);
            keyResult.setWeight(kr.weight);
            keyResult.setThresholdBelow(kr.below);
            keyResult.setThresholdMeets(kr.meets);
            keyResult.setThresholdGood(kr.good);
            keyResult.setThresholdVeryGood(kr.veryGood);
            keyResult.setThresholdExceptional(kr.exceptional);
            keyResult.setActualValue(kr.actualValue);
            keyResult.setDescription(kr.description);
            keyResult.setObjective(objective);
            keyResultRepository.save(keyResult);
        }
    }

    private static class DemoKR {
        String name;
        KeyResult.MetricType type;
        String unit;
        Integer weight;
        Double below, meets, good, veryGood, exceptional;
        String actualValue;
        String description;

        DemoKR(String name, KeyResult.MetricType type, String unit, Integer weight,
               Double below, Double meets, Double good, Double veryGood, Double exceptional,
               String actualValue) {
            this.name = name;
            this.type = type;
            this.unit = unit;
            this.weight = weight;
            this.below = below;
            this.meets = meets;
            this.good = good;
            this.veryGood = veryGood;
            this.exceptional = exceptional;
            this.actualValue = actualValue;
            this.description = "";
        }

        DemoKR(String name, KeyResult.MetricType type, String unit, Integer weight,
               Double below, Double meets, Double good, Double veryGood, Double exceptional,
               String actualValue, String description) {
            this(name, type, unit, weight, below, meets, good, veryGood, exceptional, actualValue);
            this.description = description;
        }
    }

    // ==================== IMPORT UPSERT METHODS ====================

    /**
     * Find or create a division by name for import.
     */
    @Transactional
    public Division findOrCreateDivision(String divisionName) {
        return divisionRepository.findByName(divisionName)
                .orElseGet(() -> {
                    Division division = new Division();
                    division.setName(divisionName);
                    return divisionRepository.save(division);
                });
    }

    /**
     * Find or create a department by name within a division for import.
     */
    @Transactional
    public Department findOrCreateDepartment(String deptName, String divisionId) {
        return departmentRepository.findByNameAndDivisionId(deptName, divisionId)
                .orElseGet(() -> {
                    Division division = divisionRepository.findById(divisionId)
                            .orElseThrow(() -> new IllegalArgumentException("Division not found: " + divisionId));
                    Department dept = Department.builder()
                            .name(deptName)
                            .division(division)
                            .build();
                    return departmentRepository.save(dept);
                });
    }

    /**
     * Find or create/update an objective by name within a department for import.
     */
    @Transactional
    public Objective upsertObjective(String deptId, String objName, int weight, ObjectiveLevel level, java.util.UUID employeeId) {
        Objective obj;
        if (level == ObjectiveLevel.INDIVIDUAL && employeeId != null) {
            obj = objectiveRepository.findByNameAndDepartmentIdAndEmployeeId(objName, deptId, employeeId)
                    .orElse(null);
        } else {
            obj = objectiveRepository.findByNameAndDepartmentId(objName, deptId)
                    .filter(o -> o.getLevel() == ObjectiveLevel.DEPARTMENT)
                    .orElse(null);
        }

        if (obj != null) {
            obj.setWeight(weight);
            return objectiveRepository.save(obj);
        }

        Department dept = departmentRepository.findById(deptId)
                .orElseThrow(() -> new IllegalArgumentException("Department not found: " + deptId));

        Objective.ObjectiveBuilder builder = Objective.builder()
                .name(objName)
                .weight(weight)
                .department(dept)
                .level(level);

        if (level == ObjectiveLevel.INDIVIDUAL && employeeId != null) {
            User employee = userRepository.findById(employeeId)
                    .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + employeeId));
            builder.employee(employee);
        }

        return objectiveRepository.save(builder.build());
    }

    /**
     * Find or create a group by name within a department for import.
     */
    @Transactional
    public OrgGroup findOrCreateGroup(String groupName, String departmentId) {
        return groupRepository.findByNameAndDepartmentId(groupName, departmentId)
                .orElseGet(() -> {
                    Department dept = departmentRepository.findById(departmentId)
                            .orElseThrow(() -> new IllegalArgumentException("Department not found: " + departmentId));
                    OrgGroup group = OrgGroup.builder()
                            .name(groupName)
                            .department(dept)
                            .build();
                    return groupRepository.save(group);
                });
    }

    /**
     * Upsert a division-level objective by name for import.
     */
    @Transactional
    public Objective upsertDivisionObjective(String divisionId, String objName, int weight) {
        Objective obj = objectiveRepository.findByNameAndDivisionId(objName, divisionId).orElse(null);
        if (obj != null) {
            obj.setWeight(weight);
            return objectiveRepository.save(obj);
        }
        Division div = divisionRepository.findById(divisionId)
                .orElseThrow(() -> new IllegalArgumentException("Division not found: " + divisionId));
        return objectiveRepository.save(Objective.builder()
                .name(objName).weight(weight).division(div).level(ObjectiveLevel.DIVISION).build());
    }

    /**
     * Upsert a group-level objective by name for import.
     */
    @Transactional
    public Objective upsertGroupObjective(String groupId, String deptId, String objName, int weight) {
        Objective obj = objectiveRepository.findByNameAndGroupId(objName, groupId).orElse(null);
        if (obj != null) {
            obj.setWeight(weight);
            return objectiveRepository.save(obj);
        }
        OrgGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found: " + groupId));
        Department dept = departmentRepository.findById(deptId)
                .orElseThrow(() -> new IllegalArgumentException("Department not found: " + deptId));
        return objectiveRepository.save(Objective.builder()
                .name(objName).weight(weight).group(group).department(dept).level(ObjectiveLevel.GROUP).build());
    }

    /**
     * Find or create/update a key result by name within an objective for import.
     */
    @Transactional
    public KeyResult upsertKeyResult(String objectiveId, String krName,
                                      KeyResult.MetricType metricType, String unit, int weight,
                                      Double below, Double meets, Double good, Double veryGood, Double exceptional,
                                      String actualValue) {
        KeyResult kr = keyResultRepository.findByNameAndObjectiveId(krName, objectiveId)
                .orElse(null);

        if (kr != null) {
            kr.setMetricType(metricType);
            kr.setUnit(unit);
            kr.setWeight(weight);
            kr.setThresholdBelow(below);
            kr.setThresholdMeets(meets);
            kr.setThresholdGood(good);
            kr.setThresholdVeryGood(veryGood);
            kr.setThresholdExceptional(exceptional);
            kr.setActualValue(actualValue);
            return keyResultRepository.save(kr);
        }

        Objective objective = objectiveRepository.findById(objectiveId)
                .orElseThrow(() -> new IllegalArgumentException("Objective not found: " + objectiveId));

        KeyResult newKr = KeyResult.builder()
                .name(krName)
                .metricType(metricType)
                .unit(unit)
                .weight(weight)
                .thresholdBelow(below)
                .thresholdMeets(meets)
                .thresholdGood(good)
                .thresholdVeryGood(veryGood)
                .thresholdExceptional(exceptional)
                .actualValue(actualValue)
                .objective(objective)
                .build();
        return keyResultRepository.save(newKr);
    }
}
