package uz.garantbank.okrTrackingSystem.controller;

import io.swagger.v3.oas.annotations.Operation;
import lombok.extern.slf4j.Slf4j;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.garantbank.okrTrackingSystem.dto.ScoreLevelDTO;
import uz.garantbank.okrTrackingSystem.service.ScoreLevelService;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/score-levels")
@Tag(name = "Score Levels", description = "Score level configuration for the OKR scoring system")
public class ScoreLevelController {
    private final ScoreLevelService scoreLevelService;

    public ScoreLevelController(ScoreLevelService scoreLevelService) {
        this.scoreLevelService = scoreLevelService;
    }

    @Operation(summary = "Get all score levels",
            description = "Returns all configured score levels ordered by display order. " +
                    "Default levels: Не соответствует (0-0.3), Ниже ожиданий (0.31-0.50), На уровне ожиданий (0.51-0.85), Превышает ожидания (0.86-0.97), Исключительно (0.98-1.0).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of score levels",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = ScoreLevelDTO.class))))
    })
    @GetMapping
    public ResponseEntity<List<ScoreLevelDTO>> getAllScoreLevels() {
        return ResponseEntity.ok(scoreLevelService.getAllScoreLevels());
    }

    @Operation(summary = "Update score levels",
            description = "Replace all score levels with the provided list. " +
                    "Each level must have a unique name, score value, color, and display order.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Score levels updated — returns new configuration",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = ScoreLevelDTO.class)))),
            @ApiResponse(responseCode = "400", description = "Invalid configuration", content = @Content)
    })
    @PutMapping
    public ResponseEntity<List<ScoreLevelDTO>> updateScoreLevels(@RequestBody List<ScoreLevelDTO> levelDTOs) {
        log.info("Updating score levels: {} levels", levelDTOs.size());
        return ResponseEntity.ok(scoreLevelService.updateScoreLevels(levelDTOs));
    }

    @Operation(summary = "Reset score levels to defaults",
            description = "Reset all score levels to the system defaults: Не соответствует (0-0.3), Ниже ожиданий (0.31-0.50), На уровне ожиданий (0.51-0.85), Превышает ожидания (0.86-0.97), Исключительно (0.98-1.0).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Score levels reset to defaults")
    })
    @PostMapping("/reset")
    public ResponseEntity<Void> resetToDefaults() {
        scoreLevelService.resetToDefaults();
        return ResponseEntity.ok().build();
    }
}
