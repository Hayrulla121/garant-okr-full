package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Schema(description = "Evaluation summary for an employee including disciplinary status")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeEvaluationSummaryDTO {

    @Schema(description = "Employee user ID")
    private UUID userId;

    @Schema(description = "Employee full name")
    private String userFullName;

    @Schema(description = "Total number of evaluations received")
    private int totalEvaluations;

    @Schema(description = "Number of evaluations rated as below expectations")
    private int belowExpectationsCount;

    @Schema(
        description = "Disciplinary status based on below-expectations count",
        allowableValues = {"NONE", "WATCH", "WARNING", "FINE", "TERMINATION_RISK"},
        example = "WARNING"
    )
    private String disciplinaryStatus;

    @Schema(description = "Human-readable description of the disciplinary status")
    private String disciplinaryDescription;

    @Schema(description = "Recent evaluation history (up to 10 most recent)")
    private List<EvaluationDTO> recentEvaluations;
}
