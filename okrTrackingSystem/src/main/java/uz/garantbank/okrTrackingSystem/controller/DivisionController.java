package uz.garantbank.okrTrackingSystem.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.garantbank.okrTrackingSystem.dto.CreateDivisionRequest;
import uz.garantbank.okrTrackingSystem.dto.DivisionDTO;
import uz.garantbank.okrTrackingSystem.dto.DivisionWithScoreDTO;
import uz.garantbank.okrTrackingSystem.dto.UpdateDivisionRequest;
import uz.garantbank.okrTrackingSystem.dto.user.DepartmentSummaryDTO;
import uz.garantbank.okrTrackingSystem.service.DepartmentAccessService;
import uz.garantbank.okrTrackingSystem.service.DivisionAccessService;
import uz.garantbank.okrTrackingSystem.service.DivisionService;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/divisions")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
@Tag(name = "Divisions", description = "Division management — top-level organizational units")
public class DivisionController {

    private final DivisionService divisionService;
    private final DivisionAccessService divisionAccessService;
    private final DepartmentAccessService departmentAccessService;

    public DivisionController(
            DivisionService divisionService,
            DivisionAccessService divisionAccessService,
            DepartmentAccessService departmentAccessService
    ) {
        this.divisionService = divisionService;
        this.divisionAccessService = divisionAccessService;
        this.departmentAccessService = departmentAccessService;
    }

    @Operation(summary = "Get all divisions",
            description = "Returns all divisions with their leader info and department summaries. Accessible to all authenticated users.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of all divisions",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = DivisionDTO.class))))
    })
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DivisionDTO>> getAllDivisions() {
        List<DivisionDTO> divisions = divisionService.getAllDivisions();
        return ResponseEntity.ok(divisions);
    }

    @Operation(summary = "Get division by ID",
            description = "Returns a single division with its leader info and department summaries.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Division found",
                    content = @Content(schema = @Schema(implementation = DivisionDTO.class))),
            @ApiResponse(responseCode = "404", description = "Division not found", content = @Content)
    })
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DivisionDTO> getDivisionById(
            @Parameter(description = "Division ID", required = true) @PathVariable String id) {
        DivisionDTO division = divisionService.getDivisionById(id);
        return ResponseEntity.ok(division);
    }

    @Operation(summary = "Create division",
            description = "Create a new division. Optionally assign a division leader. **Requires ADMIN or DIRECTOR role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Division created",
                    content = @Content(schema = @Schema(implementation = DivisionDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request (e.g., name too short)", content = @Content),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR')")
    public ResponseEntity<DivisionDTO> createDivision(
            @Valid @RequestBody CreateDivisionRequest request
    ) {
        log.info("Creating division: {}", request.getName());
        departmentAccessService.requireWriteAccess(departmentAccessService.getCurrentUser());
        DivisionDTO created = divisionService.createDivision(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @Operation(summary = "Update division",
            description = "Update a division's name and/or leader. Requires edit permission (ADMIN, DIRECTOR, or division leader).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Division updated",
                    content = @Content(schema = @Schema(implementation = DivisionDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request", content = @Content),
            @ApiResponse(responseCode = "403", description = "No edit permission for this division", content = @Content),
            @ApiResponse(responseCode = "404", description = "Division not found", content = @Content)
    })
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DivisionDTO> updateDivision(
            @Parameter(description = "Division ID", required = true) @PathVariable String id,
            @Valid @RequestBody UpdateDivisionRequest request,
            Authentication authentication
    ) {
        departmentAccessService.requireWriteAccess(departmentAccessService.getCurrentUser());
        if (!divisionAccessService.canUserEditDivision(authentication, id)) {
            throw new AccessDeniedException("You don't have permission to edit this division");
        }

        DivisionDTO updated = divisionService.updateDivision(id, request);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "Delete division",
            description = "Delete a division. The division must have no departments assigned. **Requires ADMIN role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Division deleted"),
            @ApiResponse(responseCode = "400", description = "Division still has departments", content = @Content),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can delete divisions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Division not found", content = @Content)
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteDivision(
            @Parameter(description = "Division ID", required = true) @PathVariable String id) {
        log.info("Deleting division: {}", id);
        departmentAccessService.requireWriteAccess(departmentAccessService.getCurrentUser());
        divisionService.deleteDivision(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get departments in division",
            description = "Returns a summary list of all departments belonging to the specified division.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of departments in the division",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = DepartmentSummaryDTO.class)))),
            @ApiResponse(responseCode = "404", description = "Division not found", content = @Content)
    })
    @GetMapping("/{id}/departments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DepartmentSummaryDTO>> getDepartmentsByDivision(
            @Parameter(description = "Division ID", required = true) @PathVariable String id
    ) {
        List<DepartmentSummaryDTO> departments =
                divisionService.getDepartmentsByDivisionId(id);
        return ResponseEntity.ok(departments);
    }

    @Operation(summary = "Get division score",
            description = "Returns the division's aggregated score calculated from its departments' scores, " +
                    "including score level and color classification.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Division score details",
                    content = @Content(schema = @Schema(implementation = DivisionWithScoreDTO.class))),
            @ApiResponse(responseCode = "404", description = "Division not found", content = @Content)
    })
    @GetMapping("/{id}/score")
    public ResponseEntity<DivisionWithScoreDTO> getDivisionScore(
            @Parameter(description = "Division ID", required = true) @PathVariable String id) {
        DivisionWithScoreDTO result = divisionService.getDivisionWithScore(id);
        return ResponseEntity.ok(result);
    }

}
