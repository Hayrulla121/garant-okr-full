package uz.garantbank.okrTrackingSystem.dto.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.garantbank.okrTrackingSystem.entity.Role;

import java.util.List;

@Schema(description = "Request to update user details. All fields are optional — only provided fields are updated. " +
        "Fields marked 'ADMIN only' are ignored for non-admin users.")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserRequest {

    @Schema(description = "Full display name", example = "John Doe Updated")
    private String fullName;

    @Schema(description = "Email address", example = "john.updated@garantbank.uz")
    @Email(message = "Email must be valid")
    private String email;

    @Schema(description = "Job title", example = "Lead Developer")
    private String jobTitle;

    @Schema(description = "Phone number", example = "+998 90 987 65 43")
    private String phoneNumber;

    @Schema(description = "Bio/description", example = "Team lead with 5 years experience")
    private String bio;

    @Schema(description = "User role (ADMIN only)", example = "DEPARTMENT_LEADER")
    private Role role;

    @Schema(description = "Department IDs to assign (ADMIN only)", example = "[\"dept-001\", \"dept-002\"]")
    private List<String> assignedDepartmentIds;

    @Schema(description = "Account active status (ADMIN only)", example = "true")
    @JsonProperty("isActive")
    private Boolean isActive;

    @Schema(description = "Whether user can edit assigned departments (ADMIN only)", example = "true")
    @JsonProperty("canEditAssignedDepartments")
    private Boolean canEditAssignedDepartments;

    @Schema(description = "Whether user is in read-only mode (ADMIN only)", example = "false")
    @JsonProperty("readOnly")
    private Boolean readOnly;

    @Schema(description = "New password (optional, for password change)", example = "newSecurePass456")
    private String password;
}
