package uz.garantbank.okrTrackingSystem.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.garantbank.okrTrackingSystem.dto.EmployeeEvaluationSummaryDTO;
import uz.garantbank.okrTrackingSystem.dto.EvaluationCreateRequest;
import uz.garantbank.okrTrackingSystem.dto.EvaluationDTO;
import uz.garantbank.okrTrackingSystem.security.UserDetailsImpl;
import uz.garantbank.okrTrackingSystem.service.DepartmentAccessService;
import uz.garantbank.okrTrackingSystem.service.EvaluationService;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/evaluations")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
@Tag(name = "Evaluations", description = "Multi-source performance evaluations (Director, HR, Business Block)")
public class EvaluationController {

    private final EvaluationService evaluationService;
    private final DepartmentAccessService accessService;

    @Operation(
            summary = "Create evaluation",
            description = """
                    Create a new performance evaluation for a department or employee.

                    **Evaluator types and their rating scales:**
                    - `DIRECTOR` — 1-5 star rating (converted to 4.25-5.0 score)
                    - `HR` — Letter grade: A (5.0), B (4.75), C (4.5), D (4.25)
                    - `BUSINESS_BLOCK` — 1-5 star rating (displayed separately, not in final calculation)

                    Evaluations are created in `DRAFT` status and must be submitted separately.

                    **Requires:** DIRECTOR, HR, BUSINESS_BLOCK, or ADMIN role."""
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Evaluation created in DRAFT status",
                    content = @Content(schema = @Schema(implementation = EvaluationDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request (e.g., invalid rating)", content = @Content),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    @PostMapping
    @PreAuthorize("hasAnyRole('DIRECTOR', 'HR', 'BUSINESS_BLOCK', 'ADMIN', 'DEPARTMENT_LEADER')")
    public ResponseEntity<EvaluationDTO> createEvaluation(
            @RequestBody EvaluationCreateRequest request,
            Authentication authentication) {
        accessService.requireWriteAccess(accessService.getCurrentUser());
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        log.info("Creating evaluation by user {} for target {}/{}", userDetails.getId(), request.getTargetType(), request.getTargetId());
        EvaluationDTO evaluation = evaluationService.createEvaluation(request, userDetails.getId());
        return ResponseEntity.ok(evaluation);
    }

    @Operation(
            summary = "Submit evaluation",
            description = "Change an evaluation from `DRAFT` to `SUBMITTED` status. " +
                    "Once submitted, the evaluation contributes to the department/employee's final score calculation. " +
                    "Only the original evaluator can submit their own evaluation."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Evaluation submitted",
                    content = @Content(schema = @Schema(implementation = EvaluationDTO.class))),
            @ApiResponse(responseCode = "403", description = "Not the evaluation owner", content = @Content),
            @ApiResponse(responseCode = "404", description = "Evaluation not found", content = @Content)
    })
    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('DIRECTOR', 'HR', 'BUSINESS_BLOCK', 'ADMIN', 'DEPARTMENT_LEADER')")
    public ResponseEntity<EvaluationDTO> submitEvaluation(
            @Parameter(description = "Evaluation ID (UUID)", required = true) @PathVariable("id") UUID id,
            Authentication authentication) {
        accessService.requireWriteAccess(accessService.getCurrentUser());
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        EvaluationDTO evaluation = evaluationService.submitEvaluation(id, userDetails.getId());
        return ResponseEntity.ok(evaluation);
    }

    @Operation(
            summary = "Update evaluation",
            description = "Modify an existing evaluation. Evaluators can update their evaluations " +
                    "even after submission (to correct mistakes). Only the original evaluator can update."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Evaluation updated",
                    content = @Content(schema = @Schema(implementation = EvaluationDTO.class))),
            @ApiResponse(responseCode = "403", description = "Not the evaluation owner", content = @Content),
            @ApiResponse(responseCode = "404", description = "Evaluation not found", content = @Content)
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('DIRECTOR', 'HR', 'BUSINESS_BLOCK', 'ADMIN', 'DEPARTMENT_LEADER')")
    public ResponseEntity<EvaluationDTO> updateEvaluation(
            @Parameter(description = "Evaluation ID (UUID)", required = true) @PathVariable("id") UUID id,
            @RequestBody EvaluationCreateRequest request,
            Authentication authentication) {
        accessService.requireWriteAccess(accessService.getCurrentUser());
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        EvaluationDTO evaluation = evaluationService.updateEvaluation(id, request, userDetails.getId());
        return ResponseEntity.ok(evaluation);
    }

    @Operation(
            summary = "Get evaluations for target",
            description = "Retrieve all evaluations for a specific department or employee. " +
                    "Returns evaluations from all evaluator types (Director, HR, Business Block)."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of evaluations for the target",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = EvaluationDTO.class))))
    })
    @GetMapping("/target/{type}/{id}")
    public ResponseEntity<List<EvaluationDTO>> getEvaluationsForTarget(
            @Parameter(description = "Target type", required = true, schema = @Schema(allowableValues = {"DEPARTMENT", "EMPLOYEE"}))
            @PathVariable("type") String type,
            @Parameter(description = "Target ID (UUID)", required = true) @PathVariable("id") UUID id) {
        List<EvaluationDTO> evaluations = evaluationService.getEvaluationsForTarget(type.toUpperCase(), id);
        return ResponseEntity.ok(evaluations);
    }

    @Operation(
            summary = "Get my evaluations",
            description = "Retrieve all evaluations created by the currently authenticated user."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of user's evaluations",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = EvaluationDTO.class))))
    })
    @GetMapping("/my")
    public ResponseEntity<List<EvaluationDTO>> getMyEvaluations(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<EvaluationDTO> evaluations = evaluationService.getEvaluationsByEvaluator(userDetails.getId());
        return ResponseEntity.ok(evaluations);
    }

    @Operation(
            summary = "Get all evaluations",
            description = "Retrieve all evaluations in the system. **Requires ADMIN role.** Intended for debugging and administration."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "All evaluations",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = EvaluationDTO.class)))),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can view all evaluations", content = @Content)
    })
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<EvaluationDTO>> getAllEvaluations() {
        List<EvaluationDTO> evaluations = evaluationService.getAllEvaluations();
        return ResponseEntity.ok(evaluations);
    }

    @Operation(
            summary = "Get employee evaluation summary",
            description = "Get a detailed evaluation summary for a specific employee, including total evaluations, " +
                    "below-expectations count, disciplinary status, and recent evaluation history. " +
                    "Accessible by ADMIN and DIRECTOR; other users can only view their own summary."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Employee evaluation summary",
                    content = @Content(schema = @Schema(implementation = EmployeeEvaluationSummaryDTO.class))),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "User not found", content = @Content)
    })
    @GetMapping("/employee/{userId}/summary")
    public ResponseEntity<EmployeeEvaluationSummaryDTO> getEmployeeEvaluationSummary(
            @Parameter(description = "Employee User ID (UUID)", required = true) @PathVariable("userId") UUID userId,
            Authentication authentication) {
        UserDetailsImpl currentUser = (UserDetailsImpl) authentication.getPrincipal();
        boolean isSelf = currentUser.getId().equals(userId);
        boolean hasPrivilege = accessService.hasHighLevelRole(accessService.getCurrentUser());
        if (!isSelf && !hasPrivilege) {
            throw new org.springframework.security.access.AccessDeniedException(
                "You can only view your own evaluation summary");
        }
        try {
            return ResponseEntity.ok(evaluationService.getEmployeeEvaluationSummary(userId));
        } catch (IllegalArgumentException e) {
            // User not found — likely a stale session after DB reset; treat as unauthorized
            return ResponseEntity.status(401).build();
        }
    }

    @Operation(
            summary = "Get at-risk employees",
            description = "Get all employees who have at least one below-expectations evaluation. " +
                    "Results are sorted by below-expectations count descending. **Requires ADMIN or DIRECTOR role.**"
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of at-risk employee summaries",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = EmployeeEvaluationSummaryDTO.class)))),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    @GetMapping("/at-risk")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR', 'HR')")
    public ResponseEntity<List<EmployeeEvaluationSummaryDTO>> getAtRiskEmployees() {
        return ResponseEntity.ok(evaluationService.getAtRiskEmployees());
    }

    @Operation(
            summary = "Delete evaluation",
            description = "Delete a draft evaluation. Only evaluations in `DRAFT` status can be deleted. " +
                    "Only the original evaluator can delete their evaluation."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Evaluation deleted"),
            @ApiResponse(responseCode = "400", description = "Cannot delete non-draft evaluation", content = @Content),
            @ApiResponse(responseCode = "403", description = "Not the evaluation owner", content = @Content),
            @ApiResponse(responseCode = "404", description = "Evaluation not found", content = @Content)
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('DIRECTOR', 'HR', 'BUSINESS_BLOCK', 'ADMIN', 'DEPARTMENT_LEADER')")
    public ResponseEntity<Void> deleteEvaluation(
            @Parameter(description = "Evaluation ID (UUID)", required = true) @PathVariable("id") UUID id,
            Authentication authentication) {
        accessService.requireWriteAccess(accessService.getCurrentUser());
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        evaluationService.deleteEvaluation(id, userDetails.getId());
        return ResponseEntity.noContent().build();
    }
}
