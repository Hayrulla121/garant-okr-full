package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Division with aggregated score from its departments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DivisionWithScoreDTO {
    @Schema(description = "Division ID", example = "div-001")
    private String id;

    @Schema(description = "Division name", example = "Information Technology")
    private String name;

    @Schema(description = "Aggregated score (0.0-1.0)", example = "0.65")
    private Double score;

    @Schema(description = "Score level classification", example = "на_уровне_ожиданий", allowableValues = {"не_соответствует", "ниже_ожиданий", "на_уровне_ожиданий", "превышает_ожидания", "исключительно"})
    private String scoreLevel;

    @Schema(description = "Hex color for score level", example = "#4CAF50")
    private String color;

    @Schema(description = "Score as percentage (0-100)", example = "67.5")
    private Double percentage;
}
