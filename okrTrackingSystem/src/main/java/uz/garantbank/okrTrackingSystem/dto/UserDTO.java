package uz.garantbank.okrTrackingSystem.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.garantbank.okrTrackingSystem.dto.user.DepartmentSummaryDTO;
import uz.garantbank.okrTrackingSystem.entity.Role;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Schema(description = "User information (password excluded)")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    @Schema(description = "User ID", example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID id;

    @Schema(description = "Unique username", example = "john.doe")
    private String username;

    @Schema(description = "Email address", example = "john.doe@garantbank.uz")
    private String email;

    @Schema(description = "Full display name", example = "John Doe")
    private String fullName;

    @Schema(description = "User role", example = "EMPLOYEE")
    private Role role;

    @Schema(description = "URL to user's profile photo", example = "/uploads/photo-abc123.jpg")
    private String profilePhotoUrl;

    @Schema(description = "Job title", example = "Senior Developer")
    private String jobTitle;

    @Schema(description = "Phone number", example = "+998 90 123 45 67")
    private String phoneNumber;

    @Schema(description = "User bio/description", example = "Experienced developer focused on backend systems")
    private String bio;

    @Schema(description = "Whether the user account is active", example = "true")
    @JsonProperty("isActive")
    private boolean isActive;

    @Schema(description = "Whether the employee can edit their assigned departments", example = "false")
    @JsonProperty("canEditAssignedDepartments")
    private boolean canEditAssignedDepartments;

    @Schema(description = "Whether the user is in read-only mode (cannot make any edits)", example = "false")
    @JsonProperty("readOnly")
    private boolean readOnly;

    @Schema(description = "Timestamp of last login", example = "2025-01-15T10:30:00")
    private LocalDateTime lastLogin;

    @Schema(description = "Departments the user is assigned to")
    private List<DepartmentSummaryDTO> assignedDepartments;

    @Schema(description = "Account creation timestamp", example = "2025-01-01T09:00:00")
    private LocalDateTime createdAt;
}
