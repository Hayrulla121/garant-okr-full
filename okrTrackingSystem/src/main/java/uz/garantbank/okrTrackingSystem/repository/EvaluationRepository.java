package uz.garantbank.okrTrackingSystem.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.garantbank.okrTrackingSystem.entity.Evaluation;
import uz.garantbank.okrTrackingSystem.entity.EvaluationStatus;
import uz.garantbank.okrTrackingSystem.entity.EvaluatorType;
import uz.garantbank.okrTrackingSystem.entity.User;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Evaluation entity operations.
 * Provides methods for retrieving and managing evaluations.
 */
@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, UUID> {

    /**
     * Find all evaluations for a specific target (department or employee)
     *
     * @param targetType the type of target ("DEPARTMENT" or "EMPLOYEE")
     * @param targetId the ID of the target entity
     * @return list of evaluations
     */
    List<Evaluation> findByTargetTypeAndTargetId(String targetType, UUID targetId);

    /**
     * Find all evaluations created by a specific evaluator
     *
     * @param evaluatorId the ID of the evaluator user
     * @return list of evaluations
     */
    List<Evaluation> findByEvaluatorId(UUID evaluatorId);

    /**
     * Find a specific evaluation by target, evaluator type, and status
     *
     * @param targetType the type of target
     * @param targetId the ID of the target
     * @param evaluatorType the type of evaluator
     * @param status the status of the evaluation
     * @return optional evaluation
     */
    Optional<Evaluation> findByTargetTypeAndTargetIdAndEvaluatorTypeAndStatus(
            String targetType,
            UUID targetId,
            EvaluatorType evaluatorType,
            EvaluationStatus status
    );

    /**
     * Check if an evaluation already exists for this evaluator/target combination
     * Used to prevent duplicate evaluations
     *
     * @param evaluator the evaluator user
     * @param targetType the type of target
     * @param targetId the ID of the target
     * @param evaluatorType the type of evaluator
     * @return true if evaluation exists, false otherwise
     */
    boolean existsByEvaluatorAndTargetTypeAndTargetIdAndEvaluatorType(
            User evaluator,
            String targetType,
            UUID targetId,
            EvaluatorType evaluatorType
    );

    /**
     * Find all submitted evaluations for a target
     *
     * @param targetType the type of target
     * @param targetId the ID of the target
     * @param status the status to filter by
     * @return list of evaluations
     */
    List<Evaluation> findByTargetTypeAndTargetIdAndStatus(
            String targetType,
            UUID targetId,
            EvaluationStatus status
    );
}
