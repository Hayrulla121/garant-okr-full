package uz.garantbank.okrTrackingSystem.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Schema(description = "Request to create a new division")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class    CreateDivisionRequest {
    @Schema(description = "Division name (2-100 characters)", example = "Information Technology", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Division name is required")
    @Size(min = 2, max = 100, message = "Name must be 2-100 characters")
    private String name;

    @Schema(description = "Optional ID of the user to assign as division leader", example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID leaderId;
}
