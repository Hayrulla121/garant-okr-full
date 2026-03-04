package uz.garantbank.okrTrackingSystem.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.garantbank.okrTrackingSystem.entity.Role;

import java.util.List;

@Schema(description = "Request to create a new user (ADMIN only)")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateUserRequest {

    @Schema(description = "Unique username", example = "john.doe", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Username is required")
    private String username;

    @Schema(description = "Email address", example = "john.doe@garantbank.uz", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @Schema(description = "Password (min 6 characters)", example = "securePass123", requiredMode = Schema.RequiredMode.REQUIRED, minLength = 6)
    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @Schema(description = "Full display name", example = "John Doe", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Full name is required")
    private String fullName;

    @Schema(description = "User role", example = "EMPLOYEE", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "Role is required")
    private Role role;

    @Schema(description = "Optional list of department IDs to assign", example = "[\"dept-001\"]")
    private List<String> assignedDepartmentIds;

    @Schema(description = "Job title", example = "Senior Developer")
    private String jobTitle;

    @Schema(description = "Phone number", example = "+998 90 123 45 67")
    private String phoneNumber;

    @Schema(description = "Bio/description", example = "Experienced backend developer")
    private String bio;

    @Schema(description = "Whether user starts in read-only mode (defaults to false)", example = "false")
    private Boolean readOnly;
}
