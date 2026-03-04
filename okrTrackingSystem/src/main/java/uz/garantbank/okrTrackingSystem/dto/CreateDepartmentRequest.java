package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Schema(description = "Request to create a new department")
@Data
public class CreateDepartmentRequest {
    @Schema(description = "Department name (2-100 characters)", example = "Software Development", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Department name is required")
    @Size(min = 2, max = 100, message = "Name must be 2-100 characters")
    private String name;

    @Schema(description = "ID of the division this department belongs to", example = "div-001", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Division ID is required")
    private String divisionId;
}
