package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import uz.garantbank.okrTrackingSystem.entity.KeyResult;

@Schema(description = "Key Result with thresholds, actual value, and computed score")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KeyResultDTO {
    @Schema(description = "Key Result ID", example = "kr-001")
    private String id;

    @Schema(description = "Key Result name", example = "System uptime percentage")
    private String name;

    @Schema(description = "Detailed description", example = "Measure monthly system uptime across all production services")
    private String description;

    @Schema(description = "Metric type determining score calculation direction", example = "HIGHER_BETTER",
            allowableValues = {"HIGHER_BETTER", "LOWER_BETTER", "QUALITATIVE"})
    private KeyResult.MetricType metricType;

    @Schema(description = "Unit of measurement", example = "%")
    private String unit;

    @Schema(description = "Weight as percentage of objective total (0-100)", example = "50")
    private Integer weight;

    @Schema(description = "Threshold values for each score level")
    private ThresholdDTO thresholds;

    @Schema(description = "Actual measured value", example = "99.5")
    private String actualValue;

    @Schema(description = "Parent objective ID", example = "obj-001")
    private String objectiveId;

    @Schema(description = "Computed score based on actual value vs thresholds")
    private ScoreResult score;

    @Schema(description = "URL to the attached proof/basis file", example = "/uploads/kr-attachments/kr-001_1234567890.pdf")
    private String attachmentUrl;

    @Schema(description = "Original filename of the attachment", example = "quarterly_report.pdf")
    private String attachmentFileName;

    @Schema(description = "Progress percentage (0-100), manually set by ADMIN or DEPARTMENT_LEADER. Null if the current user cannot view progress for this department.", example = "50")
    private Integer progress;
}
