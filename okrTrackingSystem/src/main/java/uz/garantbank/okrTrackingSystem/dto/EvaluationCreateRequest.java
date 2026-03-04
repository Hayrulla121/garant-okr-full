package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.garantbank.okrTrackingSystem.entity.EvaluatorType;

import java.util.UUID;

@Schema(description = "Request to create or update an evaluation")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationCreateRequest {
    @Schema(description = "Target entity type", example = "DEPARTMENT", allowableValues = {"DEPARTMENT", "EMPLOYEE"}, requiredMode = Schema.RequiredMode.REQUIRED)
    private String targetType;

    @Schema(description = "ID of the target department or employee", example = "550e8400-e29b-41d4-a716-446655440000", requiredMode = Schema.RequiredMode.REQUIRED)
    private UUID targetId;

    @Schema(description = "Evaluator type", example = "DIRECTOR", requiredMode = Schema.RequiredMode.REQUIRED)
    private EvaluatorType evaluatorType;

    @Schema(description = "Numeric rating — for DIRECTOR (4.25-5.0) or BUSINESS_BLOCK (4.25-5.0)", example = "4.75")
    private Double numericRating;

    @Schema(description = "Star rating — for DIRECTOR and BUSINESS_BLOCK (1-5 stars, converted to 4.25-5.0)", example = "4")
    private Integer starRating;

    @Schema(description = "Letter rating — for HR evaluations", example = "B", allowableValues = {"A", "B", "C", "D"})
    private String letterRating;

    @Schema(description = "Evaluator's comment", example = "Good progress on quarterly objectives")
    private String comment;
}
