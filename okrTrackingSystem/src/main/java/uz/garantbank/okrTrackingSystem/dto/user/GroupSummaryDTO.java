package uz.garantbank.okrTrackingSystem.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Lightweight group reference")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupSummaryDTO {

    @Schema(description = "Group ID", example = "group-001")
    private String id;

    @Schema(description = "Group name", example = "Backend Team")
    private String name;

    @Schema(description = "Parent department ID", example = "dept-001")
    private String departmentId;
}
