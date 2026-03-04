package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Schema(description = "Computed score with level classification and color")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScoreResult {
    @Schema(description = "Numeric score (0.0-1.0)", example = "0.65")
    private Double score;

    @Schema(description = "Score level classification", example = "на_уровне_ожиданий", allowableValues = {"не_соответствует", "ниже_ожиданий", "на_уровне_ожиданий", "превышает_ожидания", "исключительно"})
    private String level;

    @Schema(description = "Hex color for the score level", example = "#4CAF50")
    private String color;

    @Schema(description = "Score as percentage (0-100)", example = "75.0")
    private Double percentage;
}
