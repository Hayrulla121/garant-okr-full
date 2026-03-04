package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Schema(description = "Request to update a division (all fields optional)")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDivisionRequest {
    @Schema(description = "New division name (2-100 characters)", example = "Information Technology & Security")
    @Size(min = 2, max = 100, message = "Name must be 2-100 characters")
    private String name;

    @Schema(description = "New division leader user ID", example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID leaderId;
}
