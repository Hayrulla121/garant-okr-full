package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Schema(description = "Group with objectives, members, and score")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupDTO {

    @Schema(description = "Group ID")
    private String id;

    @Schema(description = "Group name")
    private String name;

    @Schema(description = "Parent department ID")
    private String departmentId;

    @Schema(description = "Department name")
    private String departmentName;

    @Schema(description = "Group leader info")
    private UserSummaryDTO leader;

    @Schema(description = "Group members")
    private List<UserSummaryDTO> members;

    @Schema(description = "Group objectives")
    private List<ObjectiveDTO> objectives;

    @Schema(description = "Group OKR score")
    private ScoreResult score;
}
