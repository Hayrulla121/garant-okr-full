package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Lightweight division reference")
@Data
@NoArgsConstructor
@Builder
public class DivisionSummaryDTO {
    @Schema(description = "Division ID", example = "div-001")
    private String id;

    @Schema(description = "Division name", example = "Information Technology")
    private String name;

    public DivisionSummaryDTO(String id, String name) {
        this.id = id;
        this.name = name;
    }
}
