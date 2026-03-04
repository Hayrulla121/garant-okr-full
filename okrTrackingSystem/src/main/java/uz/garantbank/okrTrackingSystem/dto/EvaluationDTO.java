package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.garantbank.okrTrackingSystem.entity.EvaluationStatus;
import uz.garantbank.okrTrackingSystem.entity.EvaluatorType;

import java.time.LocalDateTime;
import java.util.UUID;

@Schema(description = "Evaluation record from a Director, HR, or Business Block evaluator")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvaluationDTO {
    @Schema(description = "Evaluation ID", example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID id;

    @Schema(description = "ID of the user who created this evaluation", example = "660e8400-e29b-41d4-a716-446655440001")
    private UUID evaluatorId;

    @Schema(description = "Name of the evaluator", example = "Jane Smith")
    private String evaluatorName;

    @Schema(description = "Type of evaluator", example = "DIRECTOR")
    private EvaluatorType evaluatorType;

    @Schema(description = "Target entity type", example = "DEPARTMENT", allowableValues = {"DEPARTMENT", "EMPLOYEE"})
    private String targetType;

    @Schema(description = "ID of the target department or employee", example = "770e8400-e29b-41d4-a716-446655440002")
    private UUID targetId;

    @Schema(description = "Numeric rating (Director: 4.25-5.0 from stars; HR: 4.25-5.0 from letter grade)", example = "4.75")
    private Double numericRating;

    @Schema(description = "Letter rating for HR evaluations", example = "B", allowableValues = {"A", "B", "C", "D"})
    private String letterRating;

    @Schema(description = "Evaluator's comment", example = "Strong performance, exceeds expectations in key areas")
    private String comment;

    @Schema(description = "Evaluation status", example = "SUBMITTED")
    private EvaluationStatus status;

    @Schema(description = "Creation timestamp")
    private LocalDateTime createdAt;

    @Schema(description = "Last update timestamp")
    private LocalDateTime updatedAt;

    @Schema(description = "Submission timestamp (null if still in DRAFT)")
    private LocalDateTime submittedAt;
}
