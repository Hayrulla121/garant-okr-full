package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Schema(description = "Objective with key results and computed score")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ObjectiveDTO {
    @Schema(description = "Objective ID", example = "obj-001")
    private String id;

    @Schema(description = "Objective name", example = "Improve System Reliability")
    private String name;

    @Schema(description = "Weight as percentage of department total (0-100). All objectives in a department should sum to 100.", example = "40")
    private Integer weight;

    @Schema(description = "Parent department ID", example = "dept-001")
    private String departmentId;

    @Schema(description = "Key results under this objective")
    private List<KeyResultDTO> keyResults;

    @Schema(description = "Computed score based on key result achievements")
    private ScoreResult score;
}
