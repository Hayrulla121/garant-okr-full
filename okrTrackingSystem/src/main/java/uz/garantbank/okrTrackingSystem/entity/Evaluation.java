package uz.garantbank.okrTrackingSystem.entity;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Evaluation entity representing a manual rating from an evaluator.
 * Supports multiple evaluator types (Director, HR, Business Block) with different rating scales.
 */
@Entity
@Table(name = "evaluations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = {"evaluator"})
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * User who created this evaluation
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluator_id", nullable = false)
    private User evaluator;

    /**
     * Type of evaluator (determines rating scale and weight)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EvaluatorType evaluatorType;

    /**
     * Type of entity being evaluated ("DEPARTMENT" or "EMPLOYEE")
     */
    @Column(nullable = false)
    private String targetType;

    /**
     * ID of the entity being evaluated
     */
    @Column(nullable = false)
    private UUID targetId;

    /**
     * Numeric rating for DIRECTOR (4.25-5.0) and BUSINESS_BLOCK (1-5)
     * Null for HR evaluations
     */
    private Double numericRating;

    /**
     * Letter grade for HR evaluations (A, B, C, D)
     * Null for Director and Business Block evaluations
     */
    private String letterRating;

    /**
     * Optional comment/notes about the evaluation
     */
    @Column(columnDefinition = "TEXT")
    private String comment;

    /**
     * Current status of the evaluation
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EvaluationStatus status;

    /**
     * Timestamp when evaluation was created
     */
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Timestamp when evaluation was last updated
     */
    private LocalDateTime updatedAt;

    /**
     * Timestamp when evaluation was submitted (status changed to SUBMITTED)
     */
    private LocalDateTime submittedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = EvaluationStatus.DRAFT;
        }
        if (status == EvaluationStatus.SUBMITTED && submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

