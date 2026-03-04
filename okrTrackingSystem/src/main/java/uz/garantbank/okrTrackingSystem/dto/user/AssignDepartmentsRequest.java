package uz.garantbank.okrTrackingSystem.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Schema(description = "Request to assign departments to a user")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignDepartmentsRequest {

    @Schema(description = "List of department IDs to assign", example = "[\"dept-001\", \"dept-002\"]", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Department IDs are required")
    private List<String> departmentIds;
}
