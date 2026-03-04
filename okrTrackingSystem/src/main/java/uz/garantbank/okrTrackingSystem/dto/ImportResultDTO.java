package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.List;

@Schema(description = "Result of an Excel import operation")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportResultDTO {

    @Schema(description = "Whether the import completed successfully", example = "true")
    private boolean success;

    @Schema(description = "Summary message", example = "Import completed successfully")
    private String message;

    @Schema(description = "Warning messages for partial issues")
    private List<String> warnings;

    @Schema(description = "Number of departments imported/updated", example = "3")
    private int departmentsImported;

    @Schema(description = "Number of objectives imported/updated", example = "12")
    private int objectivesImported;

    @Schema(description = "Number of key results imported/updated", example = "45")
    private int keyResultsImported;
}
