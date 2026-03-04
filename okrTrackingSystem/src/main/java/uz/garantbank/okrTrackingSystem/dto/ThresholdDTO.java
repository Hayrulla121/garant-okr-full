package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Threshold values defining score level boundaries for a Key Result")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThresholdDTO {
    @Schema(description = "Value at or below which score is 'Не соответствует' (0.0)", example = "90.0")
    private Double below;

    @Schema(description = "Value at which score is 'Ниже ожиданий' (0.31)", example = "95.0")
    private Double meets;

    @Schema(description = "Value at which score is 'На уровне ожиданий' (0.51)", example = "97.0")
    private Double good;

    @Schema(description = "Value at which score is 'Превышает ожидания' (0.86)", example = "98.5")
    private Double veryGood;

    @Schema(description = "Value at which score is 'Исключительно' (0.98)", example = "99.5")
    private Double exceptional;
}
