package uz.garantbank.okrTrackingSystem.service;

import uz.garantbank.okrTrackingSystem.dto.EmployeeEvaluationSummaryDTO;
import uz.garantbank.okrTrackingSystem.dto.EvaluationCreateRequest;
import uz.garantbank.okrTrackingSystem.dto.EvaluationDTO;
import uz.garantbank.okrTrackingSystem.entity.*;
import uz.garantbank.okrTrackingSystem.repository.EvaluationRepository;
import uz.garantbank.okrTrackingSystem.repository.ScoreLevelRepository;
import uz.garantbank.okrTrackingSystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing evaluations
 */

/**
 * @Slf4j - is a shortcut that automatically gives the java class a logger, so i can print messages to a console or a file
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EvaluationService {

    private final EvaluationRepository evaluationRepository;
    private final UserRepository userRepository;
    private final ScoreLevelRepository scoreLevelRepository;
    private final DepartmentAccessService departmentAccessService;

    /**
     * Migrate any DRAFT evaluations to SUBMITTED status on application startup.
     * This handles evaluations created before the auto-submit change was made.
     */
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    @Transactional
    public void migrateDraftEvaluationsToSubmitted() {
        List<Evaluation> draftEvals = evaluationRepository.findAll().stream()
                .filter(e -> e.getStatus() == EvaluationStatus.DRAFT)
                .toList();

        if (!draftEvals.isEmpty()) {
            log.info("Found {} DRAFT evaluations to migrate to SUBMITTED", draftEvals.size());
            for (Evaluation eval : draftEvals) {
                log.info("Migrating evaluation: id={}, targetType={}, targetId={}, evaluatorType={}",
                        eval.getId(), eval.getTargetType(), eval.getTargetId(), eval.getEvaluatorType());
                eval.setStatus(EvaluationStatus.SUBMITTED);
                evaluationRepository.save(eval);
            }
            log.info("Successfully migrated {} evaluations to SUBMITTED status", draftEvals.size());
        } else {
            log.info("No DRAFT evaluations found to migrate");
        }
    }

    /**
     * Create a new evaluation
     */
    @Transactional
    public EvaluationDTO createEvaluation(EvaluationCreateRequest request, UUID evaluatorId) {
        log.info("Creating evaluation: evaluatorId={}, targetType={}, targetId={}, evaluatorType={}",
                evaluatorId, request.getTargetType(), request.getTargetId(), request.getEvaluatorType());

        User evaluator = userRepository.findById(evaluatorId)
                .orElseThrow(() -> new IllegalArgumentException("Evaluator not found"));

        // Validate evaluator has permission to evaluate
        validateEvaluationPermissions(evaluator, request.getEvaluatorType(), request.getTargetType(), request.getTargetId());

        // Convert star rating to numeric if provided (for Director)
        Double numericRating = request.getNumericRating();
        if (request.getStarRating() != null && request.getEvaluatorType() == EvaluatorType.DIRECTOR) {
            numericRating = convertStarsToNumeric(request.getStarRating());
        }

        // Validate rating based on evaluator type
        validateRating(request.getEvaluatorType(), numericRating, request.getLetterRating());

        // Create evaluation - auto-submit since we don't need draft workflow
        Evaluation evaluation = Evaluation.builder()
                .evaluator(evaluator)
                .evaluatorType(request.getEvaluatorType())
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .numericRating(numericRating)
                .letterRating(request.getLetterRating())
                .comment(request.getComment())
                .status(EvaluationStatus.SUBMITTED)
                .build();

        evaluation = evaluationRepository.save(evaluation);
        log.info("Evaluation created successfully: id={}, targetId={}, evaluatorType={}, status={}",
                evaluation.getId(), evaluation.getTargetId(), evaluation.getEvaluatorType(), evaluation.getStatus());

        return convertToDTO(evaluation);
    }

    /**
     * Submit an evaluation (change status from DRAFT to SUBMITTED)
     */
    @Transactional
    public EvaluationDTO submitEvaluation(UUID evaluationId, UUID evaluatorId) {
        Evaluation evaluation = evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new IllegalArgumentException("Evaluation not found"));

        // Verify ownership
        if (!evaluation.getEvaluator().getId().equals(evaluatorId)) {
            throw new IllegalArgumentException("You can only submit your own evaluations");
        }

        // Only draft evaluations can be submitted
        if (evaluation.getStatus() != EvaluationStatus.DRAFT) {
            throw new IllegalArgumentException("Only draft evaluations can be submitted");
        }

        evaluation.setStatus(EvaluationStatus.SUBMITTED);
        if (evaluation.getSubmittedAt() == null) {
            evaluation.setSubmittedAt(java.time.LocalDateTime.now());
        }
        evaluation = evaluationRepository.save(evaluation);

        return convertToDTO(evaluation);
    }

    /**
     * Update an existing evaluation
     * Allows evaluators to modify their submitted evaluations
     */
    @Transactional
    public EvaluationDTO updateEvaluation(UUID evaluationId, EvaluationCreateRequest request, UUID evaluatorId) {
        log.info("Updating evaluation: id={}, evaluatorId={}", evaluationId, evaluatorId);

        Evaluation evaluation = evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new IllegalArgumentException("Evaluation not found"));

        // Verify ownership - only the original evaluator can update
        if (!evaluation.getEvaluator().getId().equals(evaluatorId)) {
            throw new IllegalArgumentException("You can only update your own evaluations");
        }

        // Convert star rating to numeric if provided (for Director)
        Double numericRating = request.getNumericRating();
        if (request.getStarRating() != null && evaluation.getEvaluatorType() == EvaluatorType.DIRECTOR) {
            numericRating = convertStarsToNumeric(request.getStarRating());
        }

        // Validate rating based on evaluator type
        validateRating(evaluation.getEvaluatorType(), numericRating, request.getLetterRating());

        // Update the evaluation fields
        evaluation.setNumericRating(numericRating);
        evaluation.setLetterRating(request.getLetterRating());
        evaluation.setComment(request.getComment());

        evaluation = evaluationRepository.save(evaluation);
        log.info("Evaluation updated successfully: id={}, evaluatorType={}", evaluation.getId(), evaluation.getEvaluatorType());

        return convertToDTO(evaluation);
    }

    /**
     * Get all evaluations for a target
     */
    public List<EvaluationDTO> getEvaluationsForTarget(String targetType, UUID targetId) {
        log.info("Fetching evaluations for targetType={}, targetId={}", targetType, targetId);
        List<Evaluation> evals = evaluationRepository.findByTargetTypeAndTargetId(targetType, targetId);
        log.info("Found {} evaluations for target", evals.size());
        return evals.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all evaluations in the system (for debugging)
     */
    public List<EvaluationDTO> getAllEvaluations() {
        List<Evaluation> allEvals = evaluationRepository.findAll();
        log.info("Total evaluations in database: {}", allEvals.size());
        for (Evaluation e : allEvals) {
            log.info("  - Evaluation: id={}, targetType={}, targetId={}, evaluatorType={}, status={}",
                    e.getId(), e.getTargetType(), e.getTargetId(), e.getEvaluatorType(), e.getStatus());
        }
        return allEvals.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get evaluations created by a specific evaluator
     */
    public List<EvaluationDTO> getEvaluationsByEvaluator(UUID evaluatorId) {
        return evaluationRepository.findByEvaluatorId(evaluatorId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get evaluation summary for a specific employee including disciplinary status.
     * Counts "below expectations" evaluations to determine disciplinary action thresholds.
     */
    public EmployeeEvaluationSummaryDTO getEmployeeEvaluationSummary(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<Evaluation> evals = evaluationRepository.findByTargetTypeAndTargetId("EMPLOYEE", userId);

        int belowCount = (int) evals.stream()
                .filter(this::isBelowExpectations)
                .count();

        String disciplinaryStatus = computeDisciplinaryStatus(belowCount);
        String disciplinaryDescription = getDisciplinaryDescription(disciplinaryStatus, belowCount);

        List<EvaluationDTO> recent = evals.stream()
                .sorted(Comparator.comparing(Evaluation::getCreatedAt).reversed())
                .limit(10)
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return EmployeeEvaluationSummaryDTO.builder()
                .userId(userId)
                .userFullName(user.getFullName())
                .totalEvaluations(evals.size())
                .belowExpectationsCount(belowCount)
                .disciplinaryStatus(disciplinaryStatus)
                .disciplinaryDescription(disciplinaryDescription)
                .recentEvaluations(recent)
                .build();
    }

    /**
     * Get all employees with 3 or more below-expectations evaluations.
     * Returns a list of evaluation summaries sorted by belowExpectationsCount descending.
     */
    public List<EmployeeEvaluationSummaryDTO> getAtRiskEmployees() {
        List<User> allUsers = userRepository.findAll();
        return allUsers.stream()
                .map(user -> {
                    List<Evaluation> evals = evaluationRepository
                            .findByTargetTypeAndTargetId("EMPLOYEE", user.getId());
                    int belowCount = (int) evals.stream()
                            .filter(this::isBelowExpectations)
                            .count();
                    String status = computeDisciplinaryStatus(belowCount);
                    List<EvaluationDTO> recent = evals.stream()
                            .sorted(Comparator.comparing(Evaluation::getCreatedAt).reversed())
                            .limit(5)
                            .map(this::convertToDTO)
                            .collect(Collectors.toList());
                    return EmployeeEvaluationSummaryDTO.builder()
                            .userId(user.getId())
                            .userFullName(user.getFullName())
                            .totalEvaluations(evals.size())
                            .belowExpectationsCount(belowCount)
                            .disciplinaryStatus(status)
                            .disciplinaryDescription(getDisciplinaryDescription(status, belowCount))
                            .recentEvaluations(recent)
                            .build();
                })
                .filter(s -> !s.getDisciplinaryStatus().equals("NONE"))
                .sorted(Comparator.comparingInt(EmployeeEvaluationSummaryDTO::getBelowExpectationsCount).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Convenience method to get just the disciplinary status for a user.
     * Used by UserService to enrich UserWithScoreDTO.
     */
    public String getDisciplinaryStatusForUser(UUID userId) {
        List<Evaluation> evals = evaluationRepository.findByTargetTypeAndTargetId("EMPLOYEE", userId);
        int belowCount = (int) evals.stream().filter(this::isBelowExpectations).count();
        return computeDisciplinaryStatus(belowCount);
    }

    /**
     * Get below-expectations count for a user.
     */
    public int getBelowExpectationsCount(UUID userId) {
        List<Evaluation> evals = evaluationRepository.findByTargetTypeAndTargetId("EMPLOYEE", userId);
        return (int) evals.stream().filter(this::isBelowExpectations).count();
    }

    /**
     * Get total evaluations count for a user.
     */
    public int getTotalEvaluationsCount(UUID userId) {
        return evaluationRepository.findByTargetTypeAndTargetId("EMPLOYEE", userId).size();
    }

    /**
     * Determine if an evaluation represents "below expectations" performance.
     * - HR: letter grade "D" = below expectations
     * - Director: numericRating below the meets-expectations threshold (bottom 2 out of 5 levels)
     * - Business Block: numericRating < 3 out of 5
     */
    private boolean isBelowExpectations(Evaluation evaluation) {
        if (evaluation.getEvaluatorType() == EvaluatorType.HR) {
            return "D".equals(evaluation.getLetterRating());
        }
        if (evaluation.getNumericRating() != null) {
            double threshold = getMeetsExpectationsThreshold();
            return evaluation.getNumericRating() < threshold;
        }
        return false;
    }

    /**
     * Get the "meets expectations" threshold from score levels.
     * This is the score value of the 3rd level from the bottom (index 2).
     */
    private double getMeetsExpectationsThreshold() {
        List<ScoreLevel> levels = scoreLevelRepository.findAllByOrderByDisplayOrderAsc();
        if (levels.size() >= 3) {
            return levels.get(2).getScoreValue();
        }
        return 0.51; // default fallback
    }

    /**
     * Compute disciplinary status based on number of below-expectations evaluations.
     */
    private String computeDisciplinaryStatus(int belowCount) {
        if (belowCount == 0) return "NONE";
        if (belowCount == 1) return "WATCH";
        if (belowCount == 2) return "WARNING";
        if (belowCount == 3) return "FINE";
        return "TERMINATION_RISK";
    }

    /**
     * Get human-readable description for a disciplinary status.
     */
    private String getDisciplinaryDescription(String status, int belowCount) {
        return switch (status) {
            case "NONE" -> "Performance is satisfactory.";
            case "WATCH" -> "1 below-expectations evaluation — performance is being monitored.";
            case "WARNING" -> "2 below-expectations evaluations — formal warning issued.";
            case "FINE" -> "3 below-expectations evaluations — subject to financial penalty.";
            case "TERMINATION_RISK" -> belowCount + " below-expectations evaluations — at risk of termination.";
            default -> "Unknown status.";
        };
    }

    /**
     * Delete an evaluation (only drafts can be deleted)
     */
    @Transactional
    public void deleteEvaluation(UUID evaluationId, UUID evaluatorId) {
        Evaluation evaluation = evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new IllegalArgumentException("Evaluation not found"));

        // Verify ownership
        if (!evaluation.getEvaluator().getId().equals(evaluatorId)) {
            throw new IllegalArgumentException("You can only delete your own evaluations");
        }

        // Only drafts can be deleted
        if (evaluation.getStatus() != EvaluationStatus.DRAFT) {
            throw new IllegalArgumentException("Only draft evaluations can be deleted");
        }

        evaluationRepository.delete(evaluation);
    }

    /**
     * Validate evaluator has permission to create this type of evaluation
     */
    private void validateEvaluationPermissions(User evaluator, EvaluatorType evaluatorType, String targetType, UUID targetId) {
        Role userRole = evaluator.getRole();

        switch (evaluatorType) {
            case DIRECTOR:
                if (userRole != Role.DIRECTOR && userRole != Role.ADMIN && userRole != Role.DEPARTMENT_LEADER) {
                    throw new IllegalArgumentException("Only Directors and Department Leaders can create Director evaluations");
                }
                // DEPARTMENT_LEADER can only evaluate departments they are assigned to
                if (userRole == Role.DEPARTMENT_LEADER && "DEPARTMENT".equals(targetType) && targetId != null) {
                    if (!departmentAccessService.isDepartmentAssigned(evaluator, targetId.toString())) {
                        throw new IllegalArgumentException("Department Leaders can only evaluate their assigned departments");
                    }
                }
                break;
            case HR:
                if (userRole != Role.HR && userRole != Role.ADMIN) {
                    throw new IllegalArgumentException("Only HR can create HR evaluations");
                }
                break;
            case BUSINESS_BLOCK:
                if (userRole != Role.BUSINESS_BLOCK && userRole != Role.ADMIN) {
                    throw new IllegalArgumentException("Only Business Block leaders can create Business Block evaluations");
                }
                if (!"DEPARTMENT".equals(targetType)) {
                    throw new IllegalArgumentException("Business Block can only evaluate departments");
                }
                break;
        }
    }

    /**
     * Validate rating based on evaluator type
     */
    private void validateRating(EvaluatorType evaluatorType, Double numericRating, String letterRating) {
        List<ScoreLevel> levels = scoreLevelRepository.findAllByOrderByDisplayOrderAsc();
        double minScore = levels.isEmpty() ? 0.0 : levels.stream().mapToDouble(ScoreLevel::getScoreValue).min().orElse(0.0);
        double maxScore = levels.isEmpty() ? 0.98 : levels.stream().mapToDouble(ScoreLevel::getScoreValue).max().orElse(0.98);

        switch (evaluatorType) {
            case DIRECTOR:
                if (numericRating == null || numericRating < minScore || numericRating > maxScore) {
                    throw new IllegalArgumentException("Director rating must be between " + minScore + " and " + maxScore);
                }
                break;
            case HR:
                if (letterRating == null || !List.of("A", "B", "C", "D").contains(letterRating)) {
                    throw new IllegalArgumentException("HR rating must be A, B, C, or D");
                }
                break;
            case BUSINESS_BLOCK:
                if (numericRating == null || numericRating < 1 || numericRating > 5) {
                    throw new IllegalArgumentException("Business Block rating must be between 1 and 5");
                }
                break;
        }
    }

    /**
     * Convert star rating (1-5) to numeric score using dynamic score levels.
     * Each star maps directly to a score level value instead of linear interpolation.
     */
    private Double convertStarsToNumeric(Integer stars) {
        if (stars < 1 || stars > 5) {
            throw new IllegalArgumentException("Star rating must be between 1 and 5");
        }
        List<ScoreLevel> levels = scoreLevelRepository.findAllByOrderByDisplayOrderAsc();
        if (levels.isEmpty()) {
            // Fallback to default score level values
            return switch (stars) {
                case 1 -> 0.0;
                case 2 -> 0.31;
                case 3 -> 0.51;
                case 4 -> 0.86;
                case 5 -> 0.98;
                default -> 0.0;
            };
        }
        List<ScoreLevel> sorted = levels.stream()
                .sorted(Comparator.comparingDouble(ScoreLevel::getScoreValue))
                .toList();
        int index = Math.min(stars - 1, sorted.size() - 1);
        return sorted.get(index).getScoreValue();
    }

    /**
     * Convert Evaluation entity to DTO
     */
    private EvaluationDTO convertToDTO(Evaluation evaluation) {
        return EvaluationDTO.builder()
                .id(evaluation.getId())
                .evaluatorId(evaluation.getEvaluator().getId())
                .evaluatorName(evaluation.getEvaluator().getFullName())
                .evaluatorType(evaluation.getEvaluatorType())
                .targetType(evaluation.getTargetType())
                .targetId(evaluation.getTargetId())
                .numericRating(evaluation.getNumericRating())
                .letterRating(evaluation.getLetterRating())
                .comment(evaluation.getComment())
                .status(evaluation.getStatus())
                .createdAt(evaluation.getCreatedAt())
                .updatedAt(evaluation.getUpdatedAt())
                .submittedAt(evaluation.getSubmittedAt())
                .build();
    }
}
