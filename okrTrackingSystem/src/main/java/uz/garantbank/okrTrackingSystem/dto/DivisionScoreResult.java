package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Division score breakdown with OKR and Director evaluation")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DivisionScoreResult {
    @Schema(description = "Automatic OKR score calculated from departments (0.0-1.0)", example = "0.65")
    private Double automaticOkrScore;

    @Schema(description = "Automatic OKR score as percentage (0-100%)", example = "62.5")
    private Double automaticOkrPercentage;

    @Schema(description = "Director evaluation score (0.0-1.0)", example = "0.86")
    private Double directorEvaluation;

    @Schema(description = "Director star rating (1-5)", example = "4")
    private Integer directorStars;

    @Schema(description = "Director's comment", example = "Division performing well")
    private String directorComment;

    @Schema(description = "Final combined score", example = "0.72")
    private Double finalCombinedScore;

    @Schema(description = "Final score as percentage (0-100%)", example = "72.5")
    private Double finalPercentage;

    @Schema(description = "Score level classification", example = "good")
    private String scoreLevel;

    @Schema(description = "Hex color for score level", example = "#4CAF50")
    private String color;

    @Schema(description = "Whether a Director evaluation exists", example = "true")
    private Boolean hasDirectorEvaluation;
}
