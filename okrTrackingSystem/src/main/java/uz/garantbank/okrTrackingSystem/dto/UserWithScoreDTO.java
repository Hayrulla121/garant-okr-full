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

@Schema(description = "User with overall performance score — used for Team Overview page")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserWithScoreDTO {
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

    @Schema(description = "Can edit assigned departments", example = "false")
    @JsonProperty("canEditAssignedDepartments")
    private boolean canEditAssignedDepartments;

    @Schema(description = "Whether the user is in read-only mode", example = "false")
    @JsonProperty("readOnly")
    private boolean readOnly;

    @Schema(description = "Last login timestamp")
    private LocalDateTime lastLogin;

    @Schema(description = "Assigned departments")
    private List<DepartmentSummaryDTO> assignedDepartments;

    @Schema(description = "Account creation timestamp")
    private LocalDateTime createdAt;

    @Schema(description = "Overall score — average of assigned department scores (0.0-1.0)", example = "0.65")
    private Double overallScore;

    @Schema(description = "Score level name", example = "на_уровне_ожиданий", allowableValues = {"не_соответствует", "ниже_ожиданий", "на_уровне_ожиданий", "превышает_ожидания", "исключительно"})
    private String scoreLevel;

    @Schema(description = "Color associated with score level", example = "#4CAF50")
    private String scoreColor;

    @Schema(description = "Score as percentage (0-100)", example = "75.0")
    private Double scorePercentage;

    @Schema(description = "Total number of evaluations received as EMPLOYEE target")
    private Integer totalEvaluationsCount;

    @Schema(description = "Number of below-expectations evaluations received")
    private Integer belowExpectationsCount;

    @Schema(
        description = "Disciplinary status based on below-expectations evaluation count",
        allowableValues = {"NONE", "WATCH", "WARNING", "FINE", "TERMINATION_RISK"},
        example = "NONE"
    )
    private String disciplinaryStatus;
}
