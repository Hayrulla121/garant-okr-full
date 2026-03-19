package uz.garantbank.okrTrackingSystem.service;

import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uz.garantbank.okrTrackingSystem.dto.*;
import uz.garantbank.okrTrackingSystem.dto.user.DepartmentSummaryDTO;
import uz.garantbank.okrTrackingSystem.entity.*;
import uz.garantbank.okrTrackingSystem.repository.DepartmentRepository;
import uz.garantbank.okrTrackingSystem.repository.DivisionRepository;
import uz.garantbank.okrTrackingSystem.repository.ObjectiveRepository;
import uz.garantbank.okrTrackingSystem.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
public class DivisionService {

    private final DivisionRepository divisionRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final ScoreCalculationService scoreCalculationService;
    private final ObjectiveRepository objectiveRepository;

    public DivisionService(
            DivisionRepository divisionRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            ScoreCalculationService scoreCalculationService,
            ObjectiveRepository objectiveRepository
    ) {
        this.divisionRepository = divisionRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.scoreCalculationService = scoreCalculationService;
        this.objectiveRepository = objectiveRepository;
    }

    /**
     * Create a new division
     */
    public DivisionDTO createDivision(CreateDivisionRequest request) {
        log.debug("Creating division: {}", request.getName());
        // Validation
        if (divisionRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Division with this name already exists");
        }

        // Create entity
        Division division = new Division();
        division.setName(request.getName());

        // Set leader if provided
        if (request.getLeaderId() != null) {
            User leader = userRepository.findById(request.getLeaderId())
                    .orElseThrow(() -> new IllegalArgumentException("Leader not found"));
            division.setDivisionLeader(leader);
        }

        // Save to database
        Division saved = divisionRepository.save(division);

        // Convert to DTO and return
        return convertToDTO(saved);
    }

    /**
     * Get all divisions with their departments
     */
    public List<DivisionDTO> getAllDivisions() {
        List<Division> divisions = divisionRepository.findAllWithDepartments();
        return divisions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get single division by ID
     */
    public DivisionDTO getDivisionById(String id) {
        Division division = divisionRepository.findByIdWithDepartments(id)
                .orElseThrow(() -> new IllegalArgumentException("Division not found"));
        return convertToDTO(division);
    }

    /**
     * Update division
     */
    public DivisionDTO updateDivision(String id, UpdateDivisionRequest request) {
        Division division = divisionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Division not found"));

        // Update name if provided
        if (request.getName() != null && !request.getName().isBlank()) {
            // Check for duplicate name
            if (!division.getName().equals(request.getName())
                    && divisionRepository.existsByName(request.getName())) {
                throw new IllegalArgumentException("Division with this name already exists");
            }
            division.setName(request.getName());
        }

        // Update leader if provided
        if (request.getLeaderId() != null) {
            User leader = userRepository.findById(request.getLeaderId())
                    .orElseThrow(() -> new IllegalArgumentException("Leader not found"));
            division.setDivisionLeader(leader);
        }

        Division updated = divisionRepository.save(division);
        return convertToDTO(updated);
    }

    /**
     * Delete division and cascade-delete all its departments, objectives, and key results.
     */
    @Transactional
    public void deleteDivision(String id) {
        log.debug("Deleting division: {}", id);
        Division division = divisionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Division not found"));

        // Cascade: delete all departments in this division first
        List<Department> departments = departmentRepository.findByDivisionId(id);
        if (!departments.isEmpty()) {
            log.info("Cascade-deleting {} department(s) in division '{}'", departments.size(), division.getName());

            // Remove user-department associations before deleting departments
            for (Department dept : departments) {
                List<User> usersInDept = userRepository.findByAssignedDepartmentId(dept.getId());
                for (User user : usersInDept) {
                    user.getAssignedDepartments().remove(dept);
                }
            }

            departmentRepository.deleteAll(departments);
        }

        divisionRepository.delete(division);
    }

    /**
     * Get division with calculated score
     */
    public DivisionWithScoreDTO getDivisionWithScore(String divisionId) {
        Division division = divisionRepository.findByIdWithDepartments(divisionId)
                .orElseThrow(() -> new IllegalArgumentException("Division not found"));

        // Calculate division score
        ScoreResult score = scoreCalculationService.calculateDivisionScore(
                division.getDepartments()
        );

        DivisionWithScoreDTO dto = new DivisionWithScoreDTO();
        dto.setId(division.getId());
        dto.setName(division.getName());
        dto.setScore(score.getScore());
        dto.setScoreLevel(score.getLevel());
        dto.setColor(score.getColor());
        dto.setPercentage(score.getPercentage());

        return dto;
    }


    /**
     * Get all departments in a division
     */
    public List<DepartmentSummaryDTO> getDepartmentsByDivisionId(String divisionId) {
        // Verify division exists
        if (!divisionRepository.existsById(divisionId)) {
            throw new IllegalArgumentException("Division not found with ID: " + divisionId);
        }

        return departmentRepository.findByDivisionId(divisionId).stream()
                .map(dept -> new DepartmentSummaryDTO(dept.getId(), dept.getName()))
                .collect(Collectors.toList());
    }

    /**
     * Create a division-level objective
     */
    public ObjectiveDTO createDivisionObjective(String divisionId, ObjectiveDTO dto) {
        Division division = divisionRepository.findById(divisionId)
                .orElseThrow(() -> new IllegalArgumentException("Division not found: " + divisionId));

        Objective obj = Objective.builder()
                .name(dto.getName())
                .weight(dto.getWeight() != null ? dto.getWeight() : 0)
                .division(division)
                .level(ObjectiveLevel.DIVISION)
                .build();

        obj = objectiveRepository.save(obj);
        return toObjectiveDTO(obj);
    }

    /**
     * Get objectives for a division
     */
    public List<ObjectiveDTO> getDivisionObjectives(String divisionId) {
        return objectiveRepository.findByDivisionIdWithKeyResults(divisionId).stream()
                .map(this::toObjectiveDTO)
                .collect(Collectors.toList());
    }

    private ObjectiveDTO toObjectiveDTO(Objective obj) {
        List<KeyResultDTO> krs = obj.getKeyResults() != null
                ? obj.getKeyResults().stream().map(this::toKeyResultDTO).collect(Collectors.toList())
                : List.of();

        return ObjectiveDTO.builder()
                .id(obj.getId())
                .name(obj.getName())
                .weight(obj.getWeight())
                .departmentId(obj.getDepartment() != null ? obj.getDepartment().getId() : null)
                .keyResults(krs)
                .score(scoreCalculationService.calculateObjectiveScore(obj.getKeyResults()))
                .build();
    }

    private KeyResultDTO toKeyResultDTO(KeyResult kr) {
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
                .score(scoreCalculationService.calculateKeyResultScore(kr))
                .build();
    }

    /**
     * Convert Entity to DTO
     */
    private DivisionDTO convertToDTO(Division division) {
        DivisionDTO dto = new DivisionDTO();
        dto.setId(division.getId());
        dto.setName(division.getName());
        dto.setCreatedAt(division.getCreatedAt());
        dto.setUpdatedAt(division.getUpdatedAt());

        // Convert leader to summary
        if (division.getDivisionLeader() != null) {
            User leader = division.getDivisionLeader();
            UserSummaryDTO leaderDTO = new UserSummaryDTO(
                    leader.getId(),
                    leader.getUsername(),
                    leader.getFullName(),
                    leader.getProfilePhotoUrl()
            );
            dto.setDivisionLeader(leaderDTO);
        }

        // Convert departments to summaries
        if (division.getDepartments() != null) {
            List<DepartmentSummaryDTO> deptSummaries = division.getDepartments()
                    .stream()
                    .map(dept -> new DepartmentSummaryDTO(dept.getId(), dept.getName()))
                    .collect(Collectors.toList());
            dto.setDepartments(deptSummaries);
        }

        // Add division objectives and score
        List<Objective> divisionObjs = objectiveRepository.findByDivisionIdWithKeyResults(division.getId());
        if (!divisionObjs.isEmpty()) {
            dto.setObjectives(divisionObjs.stream().map(this::toObjectiveDTO).collect(Collectors.toList()));
            dto.setScore(scoreCalculationService.calculateDepartmentScore(divisionObjs));
        }

        return dto;
    }
}

