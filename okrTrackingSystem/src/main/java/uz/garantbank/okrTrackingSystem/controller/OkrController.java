package uz.garantbank.okrTrackingSystem.controller;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import uz.garantbank.okrTrackingSystem.dto.DepartmentDTO;
import uz.garantbank.okrTrackingSystem.dto.DepartmentScoreResult;
import uz.garantbank.okrTrackingSystem.dto.ImportResultDTO;
import uz.garantbank.okrTrackingSystem.dto.KeyResultDTO;
import uz.garantbank.okrTrackingSystem.dto.ObjectiveDTO;
import uz.garantbank.okrTrackingSystem.entity.KeyResult;
import uz.garantbank.okrTrackingSystem.entity.Objective;
import uz.garantbank.okrTrackingSystem.entity.ScoreSnapshot;
import uz.garantbank.okrTrackingSystem.entity.User;
import uz.garantbank.okrTrackingSystem.repository.KeyResultRepository;
import uz.garantbank.okrTrackingSystem.repository.ObjectiveRepository;
import uz.garantbank.okrTrackingSystem.dto.DivisionDTO;
import uz.garantbank.okrTrackingSystem.service.DepartmentAccessService;
import uz.garantbank.okrTrackingSystem.service.DivisionService;
import uz.garantbank.okrTrackingSystem.service.ExcelExportService;
import uz.garantbank.okrTrackingSystem.service.ExcelImportService;
import uz.garantbank.okrTrackingSystem.service.OkrService;
import uz.garantbank.okrTrackingSystem.service.ScoreSnapshotService;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class OkrController {

    private final OkrService okrService;
    private final ExcelExportService excelExportService;
    private final ExcelImportService excelImportService;
    private final DepartmentAccessService accessService;
    private final DivisionService divisionService;
    private final ObjectiveRepository objectiveRepository;
    private final KeyResultRepository keyResultRepository;
    private final ScoreSnapshotService scoreSnapshotService;

    // ==================== DEPARTMENTS ====================

    @Tag(name = "Departments")
    @Operation(summary = "Get all departments", description = "Returns all departments with their objectives, key results, and computed scores. Accessible to all authenticated users.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of all departments",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = DepartmentDTO.class)))),
            @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content)
    })
    @GetMapping("/departments")
    public ResponseEntity<List<DepartmentDTO>> getAllDepartments() {
        return ResponseEntity.ok(okrService.getAllDepartments());
    }

    @Tag(name = "Departments")
    @Operation(summary = "Get department by ID", description = "Returns a single department with its objectives, key results, and computed scores.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Department found",
                    content = @Content(schema = @Schema(implementation = DepartmentDTO.class))),
            @ApiResponse(responseCode = "404", description = "Department not found", content = @Content)
    })
    @GetMapping("/departments/{id}")
    public ResponseEntity<DepartmentDTO> getDepartment(
            @Parameter(description = "Department ID", required = true) @PathVariable("id") String id) {
        return ResponseEntity.ok(okrService.getDepartment(id));
    }

    @Tag(name = "Departments")
    @Operation(summary = "Create department", description = "Create a new department. **Requires ADMIN or DIRECTOR role.** " +
            "The department must be assigned to an existing division via the `divisionId` field.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Department created",
                    content = @Content(schema = @Schema(implementation = DepartmentDTO.class))),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    @PostMapping("/departments")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR')")
    public ResponseEntity<DepartmentDTO> createDepartment(@RequestBody DepartmentDTO dto) {
        log.info("Creating department: {}", dto.getName());
        accessService.requireWriteAccess(accessService.getCurrentUser());
        return ResponseEntity.ok(okrService.createDepartment(dto));
    }

    @Tag(name = "Departments")
    @Operation(summary = "Update department", description = "Update a department's name and other properties. " +
            "Requires edit permission for the department (ADMIN, DIRECTOR, or assigned DEPARTMENT_LEADER).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Department updated",
                    content = @Content(schema = @Schema(implementation = DepartmentDTO.class))),
            @ApiResponse(responseCode = "403", description = "No edit permission for this department", content = @Content),
            @ApiResponse(responseCode = "404", description = "Department not found", content = @Content)
    })
    @PutMapping("/departments/{id}")
    public ResponseEntity<DepartmentDTO> updateDepartment(
            @Parameter(description = "Department ID", required = true) @PathVariable("id") String id,
            @RequestBody DepartmentDTO dto) {
        User currentUser = accessService.getCurrentUser();
        if (!accessService.canEditDepartment(currentUser, id)) {
            throw new AccessDeniedException("You do not have permission to edit this department");
        }
        return ResponseEntity.ok(okrService.updateDepartment(id, dto));
    }

    @Tag(name = "Departments")
    @Operation(summary = "Delete department", description = "Permanently delete a department and all its objectives/key results. **Requires ADMIN role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Department deleted"),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can delete departments", content = @Content),
            @ApiResponse(responseCode = "404", description = "Department not found", content = @Content)
    })
    @DeleteMapping("/departments/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteDepartment(
            @Parameter(description = "Department ID", required = true) @PathVariable("id") String id) {
        log.info("Deleting department: {}", id);
        accessService.requireWriteAccess(accessService.getCurrentUser());
        okrService.deleteDepartment(id);
        return ResponseEntity.noContent().build();
    }

    @Tag(name = "Departments")
    @Operation(summary = "Get department scores with evaluations",
            description = "Returns detailed score breakdown for a department including automatic OKR score (60%), " +
                    "Director evaluation (20%), HR evaluation (20%), Business Block assessment, and the combined final score.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Department score details",
                    content = @Content(schema = @Schema(implementation = DepartmentScoreResult.class))),
            @ApiResponse(responseCode = "404", description = "Department not found", content = @Content)
    })
    @GetMapping("/departments/{id}/scores")
    public ResponseEntity<DepartmentScoreResult> getDepartmentScores(
            @Parameter(description = "Department ID", required = true) @PathVariable("id") String id) {
        return ResponseEntity.ok(okrService.getDepartmentScoreWithEvaluations(id));
    }

    // ==================== OBJECTIVES ====================

    @Tag(name = "Objectives")
    @Operation(summary = "Create objective", description = "Create a new objective within a department. " +
            "The objective weight should be between 0-100 and all objective weights in a department should sum to 100%. " +
            "Requires edit permission for the department.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Objective created",
                    content = @Content(schema = @Schema(implementation = ObjectiveDTO.class))),
            @ApiResponse(responseCode = "403", description = "No edit permission for this department", content = @Content),
            @ApiResponse(responseCode = "404", description = "Department not found", content = @Content)
    })
    @PostMapping("/departments/{departmentId}/objectives")
    public ResponseEntity<ObjectiveDTO> createObjective(
            @Parameter(description = "Department ID", required = true) @PathVariable("departmentId") String departmentId,
            @RequestBody ObjectiveDTO dto) {
        User currentUser = accessService.getCurrentUser();
        if (!accessService.canEditDepartment(currentUser, departmentId)) {
            throw new AccessDeniedException("You do not have permission to create objectives in this department");
        }
        return ResponseEntity.ok(okrService.createObjective(departmentId, dto));
    }

    @Tag(name = "Objectives")
    @Operation(
        summary = "Create leader objective",
        description = "Create a personal (INDIVIDUAL-level) objective for the department's assigned leader. " +
                "These objectives are shown separately from department objectives and contribute to the leader's personal OKR score. " +
                "Requires ADMIN, DIRECTOR, or department edit permission.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leader objective created",
                    content = @Content(schema = @Schema(implementation = ObjectiveDTO.class))),
            @ApiResponse(responseCode = "400", description = "Department has no leader assigned", content = @Content),
            @ApiResponse(responseCode = "403", description = "No edit permission", content = @Content),
            @ApiResponse(responseCode = "404", description = "Department not found", content = @Content)
    })
    @PostMapping("/departments/{departmentId}/leader-objectives")
    public ResponseEntity<ObjectiveDTO> createLeaderObjective(
            @Parameter(description = "Department ID", required = true) @PathVariable("departmentId") String departmentId,
            @RequestBody ObjectiveDTO dto) {
        User currentUser = accessService.getCurrentUser();
        if (!accessService.canEditDepartment(currentUser, departmentId)) {
            throw new AccessDeniedException("You do not have permission to create leader objectives in this department");
        }
        return ResponseEntity.ok(okrService.createLeaderObjective(departmentId, dto));
    }

    @Tag(name = "Objectives")
    @Operation(summary = "Update objective", description = "Update an objective's name and weight. Requires edit permission for the parent department.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Objective updated",
                    content = @Content(schema = @Schema(implementation = ObjectiveDTO.class))),
            @ApiResponse(responseCode = "403", description = "No edit permission", content = @Content),
            @ApiResponse(responseCode = "404", description = "Objective not found", content = @Content)
    })
    @PutMapping("/objectives/{id}")
    public ResponseEntity<ObjectiveDTO> updateObjective(
            @Parameter(description = "Objective ID", required = true) @PathVariable("id") String id,
            @RequestBody ObjectiveDTO dto) {
        String departmentId = getDepartmentIdFromObjective(id);
        User currentUser = accessService.getCurrentUser();
        if (!accessService.canEditDepartment(currentUser, departmentId)) {
            throw new AccessDeniedException("You do not have permission to edit objectives in this department");
        }
        return ResponseEntity.ok(okrService.updateObjective(id, dto));
    }

    @Tag(name = "Objectives")
    @Operation(summary = "Delete objective", description = "Delete an objective and all its key results. Requires edit permission for the parent department.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Objective deleted"),
            @ApiResponse(responseCode = "403", description = "No edit permission", content = @Content),
            @ApiResponse(responseCode = "404", description = "Objective not found", content = @Content)
    })
    @DeleteMapping("/objectives/{id}")
    public ResponseEntity<Void> deleteObjective(
            @Parameter(description = "Objective ID", required = true) @PathVariable("id") String id) {
        String departmentId = getDepartmentIdFromObjective(id);
        User currentUser = accessService.getCurrentUser();
        if (!accessService.canEditDepartment(currentUser, departmentId)) {
            throw new AccessDeniedException("You do not have permission to delete objectives in this department");
        }
        okrService.deleteObjective(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== KEY RESULTS ====================

    @Tag(name = "Key Results")
    @Operation(summary = "Create key result", description = "Create a new key result within an objective. " +
            "Configure metric type (HIGHER_BETTER, LOWER_BETTER, QUALITATIVE), unit, weight, and threshold values. " +
            "Key result weights within an objective should sum to 100%.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Key result created",
                    content = @Content(schema = @Schema(implementation = KeyResultDTO.class))),
            @ApiResponse(responseCode = "403", description = "No edit permission", content = @Content),
            @ApiResponse(responseCode = "404", description = "Objective not found", content = @Content)
    })
    @PostMapping("/objectives/{objectiveId}/key-results")
    public ResponseEntity<KeyResultDTO> createKeyResult(
            @Parameter(description = "Objective ID", required = true) @PathVariable("objectiveId") String objectiveId,
            @RequestBody KeyResultDTO dto) {
        String departmentId = getDepartmentIdFromObjective(objectiveId);
        User currentUser = accessService.getCurrentUser();
        if (!accessService.canEditDepartment(currentUser, departmentId)) {
            throw new AccessDeniedException("You do not have permission to create key results in this department");
        }
        return ResponseEntity.ok(okrService.createKeyResult(objectiveId, dto));
    }

    @Tag(name = "Key Results")
    @Operation(summary = "Update key result", description = "Update a key result's properties including name, description, metric type, thresholds, and weight.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Key result updated",
                    content = @Content(schema = @Schema(implementation = KeyResultDTO.class))),
            @ApiResponse(responseCode = "403", description = "No edit permission", content = @Content),
            @ApiResponse(responseCode = "404", description = "Key result not found", content = @Content)
    })
    @PutMapping("/key-results/{id}")
    public ResponseEntity<KeyResultDTO> updateKeyResult(
            @Parameter(description = "Key Result ID", required = true) @PathVariable("id") String id,
            @RequestBody KeyResultDTO dto) {
        String departmentId = getDepartmentIdFromKeyResult(id);
        User currentUser = accessService.getCurrentUser();
        if (!accessService.canEditDepartment(currentUser, departmentId)) {
            throw new AccessDeniedException("You do not have permission to edit key results in this department");
        }
        return ResponseEntity.ok(okrService.updateKeyResult(id, dto));
    }

    @Tag(name = "Key Results")
    @Operation(summary = "Update key result actual value",
            description = "Update the actual/measured value of a key result, optionally with a proof attachment. " +
                    "If the platform setting REQUIRE_ATTACHMENT_FOR_ACTUAL_VALUE is enabled, " +
                    "an attachment file is mandatory. " +
                    "The score is automatically recalculated based on the new value and the configured thresholds.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Actual value updated and score recalculated",
                    content = @Content(schema = @Schema(implementation = KeyResultDTO.class))),
            @ApiResponse(responseCode = "400", description = "Missing required attachment or invalid file",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "No edit permission", content = @Content),
            @ApiResponse(responseCode = "404", description = "Key result not found", content = @Content)
    })
    @PutMapping(value = "/key-results/{id}/actual-value")
    public ResponseEntity<KeyResultDTO> updateKeyResultActualValue(
            @Parameter(description = "Key Result ID", required = true) @PathVariable("id") String id,
            @Parameter(description = "The new actual value") @RequestParam("actualValue") String actualValue,
            @Parameter(description = "Proof/basis attachment file (PDF, DOC, DOCX, XLS, XLSX, images)")
            @RequestParam(value = "file", required = false) MultipartFile file) {
        String departmentId = getDepartmentIdFromKeyResult(id);
        User currentUser = accessService.getCurrentUser();
        if (!accessService.canEditDepartment(currentUser, departmentId)) {
            throw new AccessDeniedException("You do not have permission to edit key results in this department");
        }
        return ResponseEntity.ok(okrService.updateKeyResultActualValue(id, actualValue, file));
    }

    @Tag(name = "Key Results")
    @Operation(summary = "Update key result progress",
            description = "Update the progress percentage (0-100) of a key result. " +
                    "Only ADMIN or DEPARTMENT_LEADER assigned to the department can update progress.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Progress updated",
                    content = @Content(schema = @Schema(implementation = KeyResultDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid progress value (must be 0-100)", content = @Content),
            @ApiResponse(responseCode = "403", description = "No permission to edit progress", content = @Content),
            @ApiResponse(responseCode = "404", description = "Key result not found", content = @Content)
    })
    @PutMapping("/key-results/{id}/progress")
    public ResponseEntity<KeyResultDTO> updateKeyResultProgress(
            @Parameter(description = "Key Result ID", required = true) @PathVariable("id") String id,
            @RequestBody java.util.Map<String, Integer> body) {
        String departmentId = getDepartmentIdFromKeyResult(id);
        User currentUser = accessService.getCurrentUser();
        if (!accessService.canEditProgress(currentUser, departmentId)) {
            throw new AccessDeniedException("Only ADMIN or DEPARTMENT_LEADER can update progress");
        }
        return ResponseEntity.ok(okrService.updateKeyResultProgress(id, body.get("progress")));
    }

    @Tag(name = "Key Results")
    @Operation(summary = "Delete key result", description = "Permanently delete a key result. Requires edit permission for the parent department.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Key result deleted"),
            @ApiResponse(responseCode = "403", description = "No edit permission", content = @Content),
            @ApiResponse(responseCode = "404", description = "Key result not found", content = @Content)
    })
    @DeleteMapping("/key-results/{id}")
    public ResponseEntity<Void> deleteKeyResult(
            @Parameter(description = "Key Result ID", required = true) @PathVariable("id") String id) {
        String departmentId = getDepartmentIdFromKeyResult(id);
        User currentUser = accessService.getCurrentUser();
        if (!accessService.canEditDepartment(currentUser, departmentId)) {
            throw new AccessDeniedException("You do not have permission to delete key results in this department");
        }
        okrService.deleteKeyResult(id);
        return ResponseEntity.noContent().build();
    }

    @Tag(name = "Key Results")
    @Operation(summary = "Toggle key result active status",
            description = "Activate or deactivate a key result. Inactive KRs are excluded from score calculation.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "KR active status updated",
                    content = @Content(schema = @Schema(implementation = KeyResultDTO.class))),
            @ApiResponse(responseCode = "403", description = "No edit permission", content = @Content),
            @ApiResponse(responseCode = "404", description = "Key result not found", content = @Content)
    })
    @PutMapping("/key-results/{id}/active")
    public ResponseEntity<KeyResultDTO> toggleKeyResultActive(
            @Parameter(description = "Key Result ID", required = true) @PathVariable("id") String id,
            @RequestBody java.util.Map<String, Boolean> body) {
        String departmentId = getDepartmentIdFromKeyResult(id);
        User currentUser = accessService.getCurrentUser();
        if (!accessService.canEditDepartment(currentUser, departmentId)) {
            throw new AccessDeniedException("You do not have permission to edit key results in this department");
        }
        return ResponseEntity.ok(okrService.toggleKeyResultActive(id, body.getOrDefault("active", true)));
    }

    // ==================== EXPORT ====================

    @Tag(name = "Export")
    @Operation(summary = "Export OKRs to Excel",
            description = "Export all departments, objectives, and key results to an Excel (.xlsx) file. " +
                    "The file includes scores and status information. **Public endpoint — no authentication required.**")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Excel file generated",
                    content = @Content(mediaType = "application/octet-stream")),
            @ApiResponse(responseCode = "500", description = "Export failed", content = @Content)
    })
    @io.swagger.v3.oas.annotations.security.SecurityRequirements // Public endpoint
    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportToExcel(
            @Parameter(description = "If true, each department is exported to a separate sheet")
            @RequestParam(value = "multiSheet", defaultValue = "true") boolean multiSheet) {
        try {
            List<DepartmentDTO> departments = okrService.getAllDepartments();
            List<DivisionDTO> divisions = divisionService.getAllDivisions();
            byte[] excelData = excelExportService.exportToExcel(departments, divisions, multiSheet);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "okr_export.xlsx");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(excelData);
        } catch (Exception e) {
            log.error("Excel export failed", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ==================== IMPORT ====================

    @Tag(name = "Import")
    @Operation(summary = "Import OKRs from Excel",
            description = "Import departments, objectives, and key results from an Excel (.xlsx) file. " +
                    "Upserts by name: existing entities are updated, new ones are created. " +
                    "Supports multi-sheet files (one department per sheet) and single-sheet exports. " +
                    "**Requires ADMIN role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Import completed",
                    content = @Content(schema = @Schema(implementation = ImportResultDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid file", content = @Content),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can import", content = @Content)
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(value = "/import/excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportResultDTO> importFromExcel(
            @Parameter(description = "Excel file (.xlsx) to import")
            @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(ImportResultDTO.builder()
                        .success(false)
                        .message("Файл пуст")
                        .build());
            }

            String filename = file.getOriginalFilename();
            if (filename != null && !filename.endsWith(".xlsx")) {
                return ResponseEntity.badRequest().body(ImportResultDTO.builder()
                        .success(false)
                        .message("Поддерживается только формат .xlsx")
                        .build());
            }

            ImportResultDTO result = excelImportService.importFromExcel(file.getBytes());
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Excel import failed", e);
            return ResponseEntity.internalServerError().body(ImportResultDTO.builder()
                    .success(false)
                    .message("Ошибка импорта: " + e.getMessage())
                    .build());
        }
    }

    // ==================== DEMO DATA ====================

    @Tag(name = "Demo Data")
    @Operation(summary = "Load demo data", description = "Load sample OKR data for testing and demonstration purposes. " +
            "Creates sample divisions, departments, objectives, and key results. **Requires ADMIN role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Demo data loaded — returns all departments",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = DepartmentDTO.class)))),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can load demo data", content = @Content)
    })
    @PostMapping("/demo/load")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<DepartmentDTO>> loadDemoData() {
        accessService.requireWriteAccess(accessService.getCurrentUser());
        return ResponseEntity.ok(okrService.loadDemoData());
    }

    // ==================== SCORE HISTORY ====================

    @Tag(name = "Score History")
    @Operation(summary = "Get score history", description = "Returns historical score snapshots for departments (or divisions). Used for the quarterly line chart.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of score snapshots",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = ScoreSnapshot.class))))
    })
    @GetMapping("/okr/score-history")
    public ResponseEntity<List<ScoreSnapshot>> getScoreHistory(
            @Parameter(description = "Target type: DEPARTMENT or DIVISION", example = "DEPARTMENT")
            @RequestParam(value = "type", defaultValue = "DEPARTMENT") ScoreSnapshot.TargetType type) {
        return ResponseEntity.ok(scoreSnapshotService.getHistory(type));
    }

    @Tag(name = "Score History")
    @Operation(summary = "Close the month", description = "Close the current month: saves a score snapshot for all departments with the current date. **Requires ADMIN role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Month closed and snapshot saved"),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can close the month", content = @Content)
    })
    @PostMapping("/okr/score-history/snapshot")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> closeMonth() {
        scoreSnapshotService.takeSnapshot();
        return ResponseEntity.ok().build();
    }

    // ==================== HELPER METHODS ====================

    private String getDepartmentIdFromObjective(String objectiveId) {
        Objective obj = objectiveRepository.findById(objectiveId)
                .orElseThrow(() -> new EntityNotFoundException("Objective not found: " + objectiveId));
        return obj.getDepartment() != null ? obj.getDepartment().getId() : null;
    }

    private String getDepartmentIdFromKeyResult(String keyResultId) {
        KeyResult kr = keyResultRepository.findById(keyResultId)
                .orElseThrow(() -> new EntityNotFoundException("Key Result not found: " + keyResultId));
        if (kr.getObjective() != null && kr.getObjective().getDepartment() != null) {
            return kr.getObjective().getDepartment().getId();
        }
        return null;
    }
}
