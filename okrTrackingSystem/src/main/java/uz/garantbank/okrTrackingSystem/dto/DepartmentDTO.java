package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.util.*;

@Schema(description = "Department with objectives, scores, and division info")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentDTO {

    @Schema(description = "Parent division summary")
    private DivisionSummaryDTO division;

    @Schema(description = "Division ID (used when creating a department)", example = "div-001")
    private String divisionId;

    @Schema(description = "Department ID", example = "dept-001")
    private String id;

    @Schema(description = "Department name", example = "Software Development")
    private String name;

    @Schema(description = "List of objectives in this department")
    private List<ObjectiveDTO> objectives;

    @Schema(description = "Automatic OKR score computed from key results")
    private ScoreResult score;

    @Schema(description = "Final combined score: 60% OKR + 20% Director + 20% HR")
    private ScoreResult finalScore;

    @Schema(description = "True if the department has both Director and HR evaluations", example = "true")
    private Boolean hasAllEvaluations;

    @Schema(description = "Personal objectives belonging to the department leader (INDIVIDUAL level OKRs)")
    private List<ObjectiveDTO> leaderObjectives;

    @Schema(description = "Weighted OKR score computed from the leader's personal objectives")
    private ScoreResult leaderScore;

    @Schema(description = "Full name of the assigned department leader")
    private String leaderName;

    @Schema(description = "UUID of the assigned department leader")
    private String leaderId;
}
