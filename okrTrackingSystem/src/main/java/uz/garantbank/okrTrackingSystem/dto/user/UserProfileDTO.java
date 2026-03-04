package uz.garantbank.okrTrackingSystem.dto.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.garantbank.okrTrackingSystem.dto.DepartmentDTO;
import uz.garantbank.okrTrackingSystem.dto.EvaluationDTO;
import uz.garantbank.okrTrackingSystem.entity.Role;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Schema(description = "Extended user profile with detailed department info and recent evaluations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileDTO {

    @Schema(description = "User ID", example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID id;

    @Schema(description = "Username", example = "john.doe")
    private String username;

    @Schema(description = "Email", example = "john.doe@garantbank.uz")
    private String email;

    @Schema(description = "Full name", example = "John Doe")
    private String fullName;

    @Schema(description = "User role", example = "EMPLOYEE")
    private Role role;

    @Schema(description = "Profile photo URL", example = "/uploads/photo-abc.jpg")
    private String profilePhotoUrl;

    @Schema(description = "Job title", example = "Senior Developer")
    private String jobTitle;

    @Schema(description = "Phone number", example = "+998 90 123 45 67")
    private String phoneNumber;

    @Schema(description = "Bio", example = "Backend developer")
    private String bio;

    @Schema(description = "Account active status", example = "true")
    @JsonProperty("isActive")
    private boolean isActive;

    @Schema(description = "Whether the user is in read-only mode", example = "false")
    @JsonProperty("readOnly")
    private boolean readOnly;

    @Schema(description = "Last login timestamp")
    private LocalDateTime lastLogin;

    @Schema(description = "Account creation timestamp")
    private LocalDateTime createdAt;

    @Schema(description = "Summary list of assigned departments")
    private List<DepartmentSummaryDTO> assignedDepartments;

    @Schema(description = "Full department details including objectives and scores")
    private List<DepartmentDTO> assignedDepartmentsDetail;

    @Schema(description = "Recent evaluations for this user")
    private List<EvaluationDTO> recentEvaluations;
}
