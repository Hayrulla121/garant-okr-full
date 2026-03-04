package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.garantbank.okrTrackingSystem.entity.Role;

@Schema(description = "User registration request (admin only)")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    @Schema(description = "Unique username", example = "john.doe", requiredMode = Schema.RequiredMode.REQUIRED)
    private String username;

    @Schema(description = "Email address", example = "john.doe@garantbank.uz", requiredMode = Schema.RequiredMode.REQUIRED)
    private String email;

    @Schema(description = "Password (min 6 characters)", example = "securePass123", requiredMode = Schema.RequiredMode.REQUIRED)
    private String password;

    @Schema(description = "User's full display name", example = "John Doe", requiredMode = Schema.RequiredMode.REQUIRED)
    private String fullName;

    @Schema(description = "User role", example = "EMPLOYEE", requiredMode = Schema.RequiredMode.REQUIRED)
    private Role role;

    @Schema(description = "Optional department ID to assign", example = "dept-001")
    private String departmentId;
}
