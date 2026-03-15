package uz.garantbank.okrTrackingSystem.service;


import uz.garantbank.okrTrackingSystem.dto.*;
import uz.garantbank.okrTrackingSystem.dto.user.*;
import uz.garantbank.okrTrackingSystem.dto.user.GroupSummaryDTO;
import uz.garantbank.okrTrackingSystem.entity.*;
import uz.garantbank.okrTrackingSystem.repository.DepartmentRepository;
import uz.garantbank.okrTrackingSystem.repository.DivisionRepository;
import uz.garantbank.okrTrackingSystem.repository.EvaluationRepository;
import uz.garantbank.okrTrackingSystem.repository.GroupRepository;
import uz.garantbank.okrTrackingSystem.repository.ObjectiveRepository;
import uz.garantbank.okrTrackingSystem.repository.ScoreLevelRepository;
import uz.garantbank.okrTrackingSystem.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing users
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final DivisionRepository divisionRepository;
    private final GroupRepository groupRepository;
    private final ObjectiveRepository objectiveRepository;
    private final ScoreLevelRepository scoreLevelRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileUploadService fileUploadService;
    private final ScoreCalculationService scoreCalculationService;
    private final EvaluationRepository evaluationRepository;

    /**
     * Register a new user (legacy method for backward compatibility)
     */
    @Transactional
    public UserDTO registerUser(RegisterRequest request) {
        CreateUserRequest createRequest = CreateUserRequest.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(request.getPassword())
                .fullName(request.getFullName())
                .role(request.getRole())
                .assignedDepartmentIds(request.getDepartmentId() != null ?
                        Collections.singletonList(request.getDepartmentId()) : null)
                .build();
        return createUser(createRequest);
    }

    /**
     * Create a new user with full control over all fields
     */
    @Transactional
    public UserDTO createUser(CreateUserRequest request) {
        // Validate username and email are unique
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        // Create user
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(request.getRole())
                .jobTitle(request.getJobTitle())
                .phoneNumber(request.getPhoneNumber())
                .bio(request.getBio())
                .isActive(true)
                .readOnly(request.getReadOnly() != null ? request.getReadOnly() : false)
                .assignedDepartments(new HashSet<>())
                .build();

        user = userRepository.save(user);

        // Assign groups if specified (auto-derives departments)
        if (request.getAssignedGroupIds() != null && !request.getAssignedGroupIds().isEmpty()) {
            assignGroupsInternal(user, request.getAssignedGroupIds());
        }
        // Fallback: assign departments directly if no groups but department IDs provided
        else if (request.getAssignedDepartmentIds() != null && !request.getAssignedDepartmentIds().isEmpty()) {
            assignDepartmentsInternal(user, request.getAssignedDepartmentIds());
        }

        return convertToDTO(user);
    }

    /**
     * Update an existing user
     *
     * @param id the user ID to update
     * @param request the update request
     * @param currentUser the user making the request (for permission checking)
     * @return the updated user DTO
     */
    @Transactional
    public UserDTO updateUser(UUID id, UpdateUserRequest request, User currentUser) {
        User user = userRepository.findByIdWithDepartments(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isSelf = currentUser.getId().equals(id);

        if (!isAdmin && !isSelf) {
            throw new AccessDeniedException("You can only update your own profile");
        }

        // Fields anyone can update on their own profile
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }
        if (request.getJobTitle() != null) {
            user.setJobTitle(request.getJobTitle());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }

        // Admin-only fields
        if (isAdmin) {
            log.info("Admin updating user {}: role={}, isActive={}", id, request.getRole(), request.getIsActive());
            if (request.getRole() != null) {
                // If changing away from DEPARTMENT_LEADER, clear leader references
                if (user.getRole() == Role.DEPARTMENT_LEADER && request.getRole() != Role.DEPARTMENT_LEADER) {
                    for (Department dept : user.getAssignedDepartments()) {
                        if (dept.getDepartmentLeader() != null
                                && dept.getDepartmentLeader().getId().equals(id)) {
                            dept.setDepartmentLeader(null);
                            departmentRepository.save(dept);
                        }
                    }
                }
                // If changing TO DEPARTMENT_LEADER, set as leader for assigned departments (if no leader set yet)
                if (user.getRole() != Role.DEPARTMENT_LEADER && request.getRole() == Role.DEPARTMENT_LEADER) {
                    for (Department dept : user.getAssignedDepartments()) {
                        if (dept.getDepartmentLeader() == null) {
                            dept.setDepartmentLeader(user);
                            departmentRepository.save(dept);
                        }
                    }
                }
                user.setRole(request.getRole());
            }
            if (request.getIsActive() != null) {
                log.info("Setting isActive from {} to {}", user.isActive(), request.getIsActive());
                user.setActive(request.getIsActive());
            }
            if (request.getAssignedGroupIds() != null) {
                // Clear old group memberships
                clearUserGroups(user);
                // Clear existing departments and re-derive from groups
                user.getAssignedDepartments().clear();
                assignGroupsInternal(user, request.getAssignedGroupIds());
            } else if (request.getAssignedDepartmentIds() != null) {
                // Fallback: direct department assignment
                user.getAssignedDepartments().clear();
                assignDepartmentsInternal(user, request.getAssignedDepartmentIds());
            }
            if (request.getCanEditAssignedDepartments() != null) {
                user.setCanEditAssignedDepartments(request.getCanEditAssignedDepartments());
            }
            if (request.getReadOnly() != null) {
                user.setReadOnly(request.getReadOnly());
            }
        } else {
            log.info("Non-admin user {} updating their own profile", currentUser.getUsername());
        }

        // Password change (anyone can change their own, admin can change others)
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            if (isAdmin || isSelf) {
                user.setPassword(passwordEncoder.encode(request.getPassword()));
            }
        }

        user = userRepository.save(user);
        return convertToDTO(user);
    }

    /**
     * Delete a user — cleans up all foreign key references first
     */
    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findByIdWithDepartments(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        // 1. Remove as department leader
        for (Department dept : user.getAssignedDepartments()) {
            if (dept.getDepartmentLeader() != null && dept.getDepartmentLeader().getId().equals(id)) {
                dept.setDepartmentLeader(null);
                departmentRepository.save(dept);
            }
        }

        // 2. Remove as division leader
        List<Division> ledDivisions = divisionRepository.findByDivisionLeaderId(id);
        for (Division div : ledDivisions) {
            div.setDivisionLeader(null);
            divisionRepository.save(div);
        }

        // 3. Nullify employee reference on objectives assigned to this user
        List<Objective> assignedObjectives = objectiveRepository.findByEmployeeId(id);
        for (Objective obj : assignedObjectives) {
            obj.setEmployee(null);
            objectiveRepository.save(obj);
        }

        // 4. Delete all evaluations created by this user
        List<Evaluation> createdEvaluations = evaluationRepository.findByEvaluatorId(id);
        evaluationRepository.deleteAll(createdEvaluations);

        // 5. Delete evaluations targeting this user
        List<Evaluation> targetEvaluations = evaluationRepository.findByTargetTypeAndTargetId("EMPLOYEE", id);
        evaluationRepository.deleteAll(targetEvaluations);

        // 6. Clear group memberships
        clearUserGroups(user);

        // 7. Clear department assignments
        user.getAssignedDepartments().clear();
        userRepository.save(user);

        // 7. Delete profile photo if exists
        if (user.getProfilePhotoUrl() != null) {
            fileUploadService.deleteProfilePhoto(user.getProfilePhotoUrl());
        }

        // 8. Delete the user
        userRepository.delete(user);
    }

    /**
     * Assign departments to a user (replaces existing assignments)
     */
    @Transactional
    public UserDTO assignDepartments(UUID userId, List<String> departmentIds) {
        User user = userRepository.findByIdWithDepartments(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        // Clear leader reference from old departments if user was the leader
        if (user.getRole() == Role.DEPARTMENT_LEADER) {
            for (Department dept : user.getAssignedDepartments()) {
                if (dept.getDepartmentLeader() != null
                        && dept.getDepartmentLeader().getId().equals(userId)) {
                    dept.setDepartmentLeader(null);
                    departmentRepository.save(dept);
                }
            }
        }

        user.getAssignedDepartments().clear();
        assignDepartmentsInternal(user, departmentIds);

        user = userRepository.save(user);
        return convertToDTO(user);
    }

    /**
     * Remove a single department from a user
     */
    @Transactional
    public UserDTO removeDepartment(UUID userId, String departmentId) {
        User user = userRepository.findByIdWithDepartments(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        // Clear department leader reference if this user was the leader
        if (user.getRole() == Role.DEPARTMENT_LEADER) {
            Department dept = departmentRepository.findById(departmentId).orElse(null);
            if (dept != null && dept.getDepartmentLeader() != null
                    && dept.getDepartmentLeader().getId().equals(userId)) {
                dept.setDepartmentLeader(null);
                departmentRepository.save(dept);
            }
        }

        user.getAssignedDepartments().removeIf(d -> d.getId().equals(departmentId));
        user = userRepository.save(user);
        return convertToDTO(user);
    }

    /**
     * Get all users assigned to a department
     */
    @Transactional(readOnly = true)
    public List<UserDTO> getUsersByDepartment(String departmentId) {
        return userRepository.findByAssignedDepartmentId(departmentId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Upload a profile photo for a user
     */
    @Transactional
    public UserDTO uploadPhoto(UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        // Delete old photo if exists
        if (user.getProfilePhotoUrl() != null) {
            fileUploadService.deleteProfilePhoto(user.getProfilePhotoUrl());
        }

        // Upload new photo
        String photoUrl = fileUploadService.uploadProfilePhoto(userId, file);
        user.setProfilePhotoUrl(photoUrl);
        user = userRepository.save(user);

        return convertToDTO(user);
    }

    /**
     * Get extended profile for a user
     */
    @Transactional(readOnly = true)
    public UserProfileDTO getProfile(UUID id) {
        User user = userRepository.findByIdWithDepartments(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        List<DepartmentSummaryDTO> deptSummaries = user.getAssignedDepartments().stream()
                .map(d -> DepartmentSummaryDTO.builder()
                        .id(d.getId())
                        .name(d.getName())
                        .build())
                .collect(Collectors.toList());

        // Get detailed department info
        List<DepartmentDTO> deptDetails = user.getAssignedDepartments().stream()
                .map(this::convertDepartmentToDTO)
                .collect(Collectors.toList());

        return UserProfileDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .jobTitle(user.getJobTitle())
                .phoneNumber(user.getPhoneNumber())
                .bio(user.getBio())
                .isActive(user.isActive())
                .readOnly(user.isReadOnly())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .assignedDepartments(deptSummaries)
                .assignedDepartmentsDetail(deptDetails)
                .recentEvaluations(Collections.emptyList()) // TODO: Add evaluation lookup if needed
                .build();
    }

    /**
     * Get user by ID
     */
    @Transactional(readOnly = true)
    public UserDTO getUserById(UUID id) {
        User user = userRepository.findByIdWithDepartments(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        return convertToDTO(user);
    }

    /**
     * Get user by username
     */
    @Transactional(readOnly = true)
    public UserDTO getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        return convertToDTO(user);
    }

    /**
     * Get all users
     */
    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        return userRepository.findAllWithDepartments().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get user entity by ID (internal use)
     */
    @Transactional(readOnly = true)
    public User getUserEntityById(UUID id) {
        return userRepository.findByIdWithDepartments(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
    }

    /**
     * Update last login timestamp
     */
    @Transactional
    public void updateLastLogin(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        user.setLastLogin(java.time.LocalDateTime.now());
        userRepository.save(user);
    }

    /**
     * Internal helper to assign groups to a user and auto-derive department membership
     */
    private void assignGroupsInternal(User user, List<String> groupIds) {
        Set<String> derivedDepartmentIds = new HashSet<>();
        for (String groupId : groupIds) {
            OrgGroup group = groupRepository.findByIdWithMembers(groupId)
                    .orElseThrow(() -> new EntityNotFoundException("Group not found: " + groupId));
            group.getMembers().add(user);
            groupRepository.save(group);
            derivedDepartmentIds.add(group.getDepartment().getId());
        }
        // Auto-assign derived departments
        assignDepartmentsInternal(user, new ArrayList<>(derivedDepartmentIds));
    }

    /**
     * Clear all group memberships for a user
     */
    private void clearUserGroups(User user) {
        Set<OrgGroup> currentGroups = new HashSet<>(user.getAssignedGroups());
        for (OrgGroup group : currentGroups) {
            OrgGroup g = groupRepository.findByIdWithMembers(group.getId()).orElse(null);
            if (g != null) {
                g.getMembers().remove(user);
                groupRepository.save(g);
            }
        }
    }

    /**
     * Internal helper to assign departments to a user
     */
    private void assignDepartmentsInternal(User user, List<String> departmentIds) {
        for (String deptId : departmentIds) {
            Department dept = departmentRepository.findById(deptId)
                    .orElseThrow(() -> new EntityNotFoundException("Department not found: " + deptId));
            user.getAssignedDepartments().add(dept);

            // Set as department leader if user has DEPARTMENT_LEADER role and no leader is set yet
            if (user.getRole() == Role.DEPARTMENT_LEADER && dept.getDepartmentLeader() == null) {
                dept.setDepartmentLeader(user);
                departmentRepository.save(dept);
            }
        }
    }

    /**
     * Convert User entity to DTO
     */
    private UserDTO convertToDTO(User user) {
        List<DepartmentSummaryDTO> deptSummaries = new ArrayList<>();
        if (user.getAssignedDepartments() != null) {
            deptSummaries = user.getAssignedDepartments().stream()
                    .map(d -> DepartmentSummaryDTO.builder()
                            .id(d.getId())
                            .name(d.getName())
                            .build())
                    .collect(Collectors.toList());
        }

        List<GroupSummaryDTO> groupSummaries = new ArrayList<>();
        try {
            if (user.getAssignedGroups() != null) {
                groupSummaries = user.getAssignedGroups().stream()
                        .map(g -> GroupSummaryDTO.builder()
                                .id(g.getId())
                                .name(g.getName())
                                .departmentId(g.getDepartment().getId())
                                .build())
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            // Lazy loading may fail if session is closed; use empty list
        }

        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .jobTitle(user.getJobTitle())
                .phoneNumber(user.getPhoneNumber())
                .bio(user.getBio())
                .isActive(user.isActive())
                .canEditAssignedDepartments(user.isCanEditAssignedDepartments())
                .readOnly(user.isReadOnly())
                .lastLogin(user.getLastLogin())
                .assignedDepartments(deptSummaries)
                .assignedGroups(groupSummaries)
                .createdAt(user.getCreatedAt())
                .build();
    }

    /**
     * Convert Department entity to DTO (simplified for profile)
     */
    private DepartmentDTO convertDepartmentToDTO(Department dept) {
        return DepartmentDTO.builder()
                .id(dept.getId())
                .name(dept.getName())
                .build();
    }

    /**
     * Get all users with their overall scores calculated from assigned departments.
     * The overall score is the average of all assigned department scores.
     * Uses finalScore if available, otherwise falls back to OKR score.
     */
    @Transactional(readOnly = true)
    public List<UserWithScoreDTO> getAllUsersWithScores() {
        try {
            return userRepository.findAllWithDepartments().stream()
                    .map(this::convertToUserWithScoreDTO)
                    .collect(Collectors.toList());
        } finally {
            scoreCalculationService.clearCache();
        }
    }

    /**
     * Convert User entity to UserWithScoreDTO with calculated overall score
     */
    private UserWithScoreDTO convertToUserWithScoreDTO(User user) {
        List<DepartmentSummaryDTO> deptSummaries = new ArrayList<>();
        List<Double> departmentScores = new ArrayList<>();

        if (user.getAssignedDepartments() != null) {
            for (Department dept : user.getAssignedDepartments()) {
                deptSummaries.add(DepartmentSummaryDTO.builder()
                        .id(dept.getId())
                        .name(dept.getName())
                        .build());

                // Calculate department score (finalScore if available, otherwise OKR score)
                DepartmentScoreResult scoreResult = scoreCalculationService
                        .calculateDepartmentScoreWithEvaluations(dept.getId(), dept.getObjectives());

                Double score = scoreResult.getFinalCombinedScore();
                if (score == null) {
                    score = scoreResult.getAutomaticOkrScore();
                }
                if (score != null && score > 0) {
                    departmentScores.add(score);
                }
            }
        }

        // Calculate overall score as average of department scores
        Double overallScore = null;
        String scoreLevel = null;
        String scoreColor = null;
        Double scorePercentage = null;

        if (!departmentScores.isEmpty()) {
            overallScore = departmentScores.stream()
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .orElse(0.0);
            overallScore = Math.round(overallScore * 100.0) / 100.0;

            // Get score level and color from the calculation service
            ScoreResult tempScore = ScoreResult.builder()
                    .score(overallScore)
                    .build();

            // Calculate level and color using a helper
            ScoreResult fullScore = scoreCalculationService.calculateDepartmentScore(Collections.emptySet());
            // Use the createScoreResult-like logic
            scoreLevel = getLevelForScore(overallScore);
            scoreColor = getColorForLevel(scoreLevel);
            scorePercentage = scoreToPercentage(overallScore);
        }

        // Add evaluation disciplinary summary
        List<Evaluation> employeeEvals = evaluationRepository
                .findByTargetTypeAndTargetId("EMPLOYEE", user.getId());
        int totalEvals = employeeEvals.size();
        double meetsThreshold = getMeetsExpectationsThreshold();
        int belowCount = (int) employeeEvals.stream()
                .filter(e -> isEvalBelowExpectations(e, meetsThreshold))
                .count();
        String disciplinaryStatus = computeDisciplinaryStatus(belowCount);

        return UserWithScoreDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .jobTitle(user.getJobTitle())
                .phoneNumber(user.getPhoneNumber())
                .bio(user.getBio())
                .isActive(user.isActive())
                .canEditAssignedDepartments(user.isCanEditAssignedDepartments())
                .readOnly(user.isReadOnly())
                .lastLogin(user.getLastLogin())
                .assignedDepartments(deptSummaries)
                .createdAt(user.getCreatedAt())
                .overallScore(overallScore)
                .scoreLevel(scoreLevel)
                .scoreColor(scoreColor)
                .scorePercentage(scorePercentage)
                .totalEvaluationsCount(totalEvals)
                .belowExpectationsCount(belowCount)
                .disciplinaryStatus(disciplinaryStatus)
                .build();
    }

    /**
     * Get score level for a given score value using dynamic score levels
     */
    private String getLevelForScore(double score) {
        List<ScoreLevel> levels = scoreLevelRepository.findAllByOrderByDisplayOrderAsc();

        if (levels.isEmpty()) {
            // Fallback to default logic (0.0-1.0 normalized scale)
            if (score >= 0.98) return "исключительно";
            if (score >= 0.86) return "превышает_ожидания";
            if (score >= 0.51) return "на_уровне_ожиданий";
            if (score >= 0.31) return "ниже_ожиданий";
            return "не_соответствует";
        }

        // Sort by score value descending to find the appropriate level
        List<ScoreLevel> sortedLevels = levels.stream()
                .sorted(Comparator.comparingDouble(ScoreLevel::getScoreValue).reversed())
                .toList();

        for (ScoreLevel level : sortedLevels) {
            if (score >= level.getScoreValue()) {
                return level.getName().toLowerCase().replace(" ", "_");
            }
        }

        return sortedLevels.get(sortedLevels.size() - 1).getName().toLowerCase().replace(" ", "_");
    }

    /**
     * Get color for a given score level using dynamic score levels
     */
    private String getColorForLevel(String level) {
        List<ScoreLevel> levels = scoreLevelRepository.findAllByOrderByDisplayOrderAsc();

        if (levels.isEmpty()) {
            return switch (level) {
                case "исключительно" -> "#1e7b34";
                case "превышает_ожидания" -> "#28a745";
                case "на_уровне_ожиданий" -> "#5cb85c";
                case "ниже_ожиданий" -> "#f0ad4e";
                default -> "#d9534f";
            };
        }

        String normalizedLevel = level.replace("_", " ");
        for (ScoreLevel scoreLevel : levels) {
            if (scoreLevel.getName().equalsIgnoreCase(normalizedLevel)) {
                return scoreLevel.getColor();
            }
        }

        return levels.get(0).getColor();
    }

    /**
     * Check if an evaluation is "below expectations" based on its rating.
     */
    private boolean isEvalBelowExpectations(Evaluation eval, double meetsThreshold) {
        if (eval.getEvaluatorType() == EvaluatorType.HR) {
            return "D".equals(eval.getLetterRating());
        }
        if (eval.getNumericRating() != null) {
            return eval.getNumericRating() < meetsThreshold;
        }
        return false;
    }

    /**
     * Get the "meets expectations" threshold from score levels (3rd level from bottom).
     */
    private double getMeetsExpectationsThreshold() {
        List<ScoreLevel> levels = scoreLevelRepository.findAllByOrderByDisplayOrderAsc();
        if (levels.size() >= 3) {
            return levels.get(2).getScoreValue();
        }
        return 0.51;
    }

    /**
     * Compute disciplinary status from below-expectations count.
     */
    private String computeDisciplinaryStatus(int belowCount) {
        if (belowCount == 0) return "NONE";
        if (belowCount == 1) return "WATCH";
        if (belowCount == 2) return "WARNING";
        if (belowCount == 3) return "FINE";
        return "TERMINATION_RISK";
    }

    /**
     * Convert score to percentage using dynamic score levels
     */
    private double scoreToPercentage(double score) {
        List<ScoreLevel> levels = scoreLevelRepository.findAllByOrderByDisplayOrderAsc();

        double minScore = 0.0;
        double maxScore = 1.0;

        if (!levels.isEmpty()) {
            minScore = levels.stream().mapToDouble(ScoreLevel::getScoreValue).min().orElse(0.0);
            maxScore = levels.stream().mapToDouble(ScoreLevel::getScoreValue).max().orElse(1.0);
        }

        double range = maxScore - minScore;
        if (range == 0) return 0.0;

        return Math.round(((score - minScore) / range) * 1000.0) / 10.0;
    }
}
