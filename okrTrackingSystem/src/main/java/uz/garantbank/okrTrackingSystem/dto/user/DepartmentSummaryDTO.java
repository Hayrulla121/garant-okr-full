package uz.garantbank.okrTrackingSystem.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Lightweight department reference")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentSummaryDTO {

    @Schema(description = "Department ID", example = "dept-001")
    private String id;

    @Schema(description = "Department name", example = "Software Development")
    private String name;
}
