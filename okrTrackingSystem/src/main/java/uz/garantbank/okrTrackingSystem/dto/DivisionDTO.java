package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.garantbank.okrTrackingSystem.dto.user.DepartmentSummaryDTO;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "Division with leader info and department summaries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DivisionDTO {
    @Schema(description = "Division ID", example = "div-001")
    private String id;

    @Schema(description = "Division name", example = "Information Technology")
    private String name;

    @Schema(description = "Division leader (basic info)")
    private UserSummaryDTO divisionLeader;

    @Schema(description = "Departments in this division")
    private List<DepartmentSummaryDTO> departments;

    @Schema(description = "Creation timestamp", example = "2025-01-01T09:00:00")
    private LocalDateTime createdAt;

    @Schema(description = "Last update timestamp", example = "2025-01-15T14:30:00")
    private LocalDateTime updatedAt;
}
