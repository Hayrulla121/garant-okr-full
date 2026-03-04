package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Schema(description = "Detailed department score breakdown with multi-source evaluations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentScoreResult {
    // Automatic OKR (60% weight)
    @Schema(description = "Automatic OKR score (0.0-1.0)", example = "0.65")
    private Double automaticOkrScore;

    @Schema(description = "Automatic OKR score as percentage (0-100%)", example = "62.5")
    private Double automaticOkrPercentage;

    // Director evaluation (20% weight)
    @Schema(description = "Director evaluator name", example = "John Doe")
    private String directorName;

    @Schema(description = "Director evaluator avatar URL", example = "https://example.com/avatar.jpg")
    private String directorAvatar;

    @Schema(description = "Director evaluation score (0.0-1.0, converted from stars)", example = "0.86")
    private Double directorEvaluation;

    @Schema(description = "Director star rating (1-5 stars, for UI display)", example = "4")
    private Integer directorStars;

    @Schema(description = "Director's comment", example = "Strong performance this quarter")
    private String directorComment;

    // HR evaluation (20% weight)
    @Schema(description = "HR evaluator name", example = "Jane Doe")
    private String hrName;

    @Schema(description = "HR evaluator avatar URL", example = "https://example.com/avatar.jpg")
    private String hrAvatar;

    @Schema(description = "HR letter grade", example = "B", allowableValues = { "A", "B", "C", "D" })
    private String hrEvaluationLetter;

    @Schema(description = "HR evaluation as numeric score (A=0.98, B=0.86, C=0.51, D=0.31)", example = "0.86")
    private Double hrEvaluationNumeric;

    @Schema(description = "HR's comment", example = "Good team collaboration")
    private String hrComment;

    // Business Block (separate display, no weight in final calculation)
    @Schema(description = "Business Block evaluator name", example = "Bob Smith")
    private String businessBlockName;

    @Schema(description = "Business Block evaluator avatar URL", example = "https://example.com/avatar.jpg")
    private String businessBlockAvatar;

    @Schema(description = "Business Block evaluation score (0.0-1.0)", example = "0.51")
    private Double businessBlockEvaluation;

    @Schema(description = "Business Block star rating (1-5 stars)", example = "3")
    private Integer businessBlockStars;

    @Schema(description = "Business Block comment", example = "Meets expectations")
    private String businessBlockComment;

    // Combined final score
    @Schema(description = "Final weighted score: auto*60% + director*20% + hr*20%", example = "0.72")
    private Double finalCombinedScore;

    @Schema(description = "Final score as percentage (0-100%)", example = "72.5")
    private Double finalPercentage;

    @Schema(description = "Score level classification", example = "на_уровне_ожиданий", allowableValues = {
            "не_соответствует", "ниже_ожиданий", "на_уровне_ожиданий", "превышает_ожидания", "исключительно" })
    private String scoreLevel;

    @Schema(description = "Hex color for the score level", example = "#4CAF50")
    private String color;

    // Evaluation status flags
    @Schema(description = "Whether a Director evaluation exists", example = "true")
    private Boolean hasDirectorEvaluation;

    @Schema(description = "Whether an HR evaluation exists", example = "true")
    private Boolean hasHrEvaluation;

    @Schema(description = "Whether a Business Block evaluation exists", example = "false")
    private Boolean hasBusinessBlockEvaluation;

    // Evaluation timestamps
    @Schema(description = "When the Director evaluation was submitted")
    private LocalDateTime directorSubmittedAt;

    @Schema(description = "When the Director evaluation was last updated")
    private LocalDateTime directorUpdatedAt;

    @Schema(description = "When the HR evaluation was submitted")
    private LocalDateTime hrSubmittedAt;

    @Schema(description = "When the HR evaluation was last updated")
    private LocalDateTime hrUpdatedAt;

    @Schema(description = "When the Business Block evaluation was submitted")
    private LocalDateTime businessBlockSubmittedAt;

    @Schema(description = "When the Business Block evaluation was last updated")
    private LocalDateTime businessBlockUpdatedAt;
}
