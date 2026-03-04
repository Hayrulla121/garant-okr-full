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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import uz.garantbank.okrTrackingSystem.dto.UserDTO;
import uz.garantbank.okrTrackingSystem.dto.UserWithScoreDTO;
import uz.garantbank.okrTrackingSystem.dto.user.AssignDepartmentsRequest;
import uz.garantbank.okrTrackingSystem.dto.user.CreateUserRequest;
import uz.garantbank.okrTrackingSystem.dto.user.UpdateUserRequest;
import uz.garantbank.okrTrackingSystem.dto.user.UserProfileDTO;
import uz.garantbank.okrTrackingSystem.entity.Role;
import uz.garantbank.okrTrackingSystem.entity.User;
import uz.garantbank.okrTrackingSystem.service.DepartmentAccessService;
import uz.garantbank.okrTrackingSystem.service.UserService;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
@Tag(name = "Users", description = "User management, profiles, department assignments, and photo uploads")
public class UserManagementController {

    private final UserService userService;
    private final DepartmentAccessService accessService;

    @Operation(summary = "Get all users",
            description = "Returns all users in the system. **Requires ADMIN or DIRECTOR role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of all users",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = UserDTO.class)))),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR')")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @Operation(summary = "Get all users with scores",
            description = "Returns all users with their overall performance scores calculated from assigned departments. " +
                    "Used for the Team Overview page. **Requires ADMIN or DIRECTOR role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of users with score data",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = UserWithScoreDTO.class)))),
            @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    @GetMapping("/with-scores")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR')")
    public ResponseEntity<List<UserWithScoreDTO>> getAllUsersWithScores() {
        return ResponseEntity.ok(userService.getAllUsersWithScores());
    }

    @Operation(summary = "Get user by ID",
            description = "Returns user details by ID. ADMIN and DIRECTOR can view any user. Other users can only view their own profile.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User found",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "403", description = "Can only view own profile", content = @Content),
            @ApiResponse(responseCode = "404", description = "User not found", content = @Content)
    })
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(
            @Parameter(description = "User ID (UUID)", required = true) @PathVariable UUID id) {
        User currentUser = accessService.getCurrentUser();
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isDirector = currentUser.getRole() == Role.DIRECTOR;
        boolean isSelf = currentUser.getId().equals(id);

        if (!isAdmin && !isDirector && !isSelf) {
            throw new AccessDeniedException("You can only view your own profile");
        }

        return ResponseEntity.ok(userService.getUserById(id));
    }

    @Operation(summary = "Create user",
            description = "Create a new user account with specified role and optional department assignments. **Requires ADMIN role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User created",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request (e.g., duplicate username/email)", content = @Content),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can create users", content = @Content)
    })
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody CreateUserRequest request) {
        log.info("Creating user: {}", request.getUsername());
        return ResponseEntity.ok(userService.createUser(request));
    }

    @Operation(summary = "Update user",
            description = """
                    Update user details.

                    **ADMIN** can update all fields including role, department assignments, and account status.

                    **Regular users** can only update their own profile fields: fullName, email, jobTitle, phoneNumber, bio, password."""
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User updated",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request", content = @Content),
            @ApiResponse(responseCode = "403", description = "Cannot update admin-only fields", content = @Content),
            @ApiResponse(responseCode = "404", description = "User not found", content = @Content)
    })
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(
            @Parameter(description = "User ID (UUID)", required = true) @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        User currentUser = accessService.getCurrentUser();
        return ResponseEntity.ok(userService.updateUser(id, request, currentUser));
    }

    @Operation(summary = "Delete user",
            description = "Permanently delete a user account. Users cannot delete their own account. **Requires ADMIN role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "User deleted"),
            @ApiResponse(responseCode = "400", description = "Cannot delete your own account", content = @Content),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can delete users", content = @Content),
            @ApiResponse(responseCode = "404", description = "User not found", content = @Content)
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(
            @Parameter(description = "User ID (UUID)", required = true) @PathVariable UUID id) {
        User currentUser = accessService.getCurrentUser();

        if (currentUser.getId().equals(id)) {
            throw new IllegalArgumentException("You cannot delete your own account");
        }

        log.info("Deleting user: {}", id);
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Assign departments to user",
            description = "Assign one or more departments to a user. Replaces existing department assignments. **Requires ADMIN role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Departments assigned — returns updated user",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can assign departments", content = @Content),
            @ApiResponse(responseCode = "404", description = "User or department not found", content = @Content)
    })
    @PostMapping("/{id}/departments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> assignDepartments(
            @Parameter(description = "User ID (UUID)", required = true) @PathVariable UUID id,
            @Valid @RequestBody AssignDepartmentsRequest request) {
        return ResponseEntity.ok(userService.assignDepartments(id, request.getDepartmentIds()));
    }

    @Operation(summary = "Remove department from user",
            description = "Remove a specific department assignment from a user. **Requires ADMIN role.**")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Department removed — returns updated user",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can remove departments", content = @Content),
            @ApiResponse(responseCode = "404", description = "User or department not found", content = @Content)
    })
    @DeleteMapping("/{id}/departments/{deptId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> removeDepartment(
            @Parameter(description = "User ID (UUID)", required = true) @PathVariable UUID id,
            @Parameter(description = "Department ID to remove", required = true) @PathVariable String deptId) {
        return ResponseEntity.ok(userService.removeDepartment(id, deptId));
    }

    @Operation(summary = "Upload profile photo",
            description = "Upload a profile photo for a user. Accepts JPEG, PNG, and GIF files up to 5MB. " +
                    "ADMIN can upload for any user; other users can only upload their own photo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Photo uploaded — returns updated user",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid file (wrong type or too large)", content = @Content),
            @ApiResponse(responseCode = "403", description = "Can only upload own photo", content = @Content)
    })
    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserDTO> uploadPhoto(
            @Parameter(description = "User ID (UUID)", required = true) @PathVariable UUID id,
            @Parameter(description = "Profile photo file (JPEG, PNG, GIF; max 5MB)")
            @RequestParam("photo") MultipartFile file) {
        User currentUser = accessService.getCurrentUser();
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isSelf = currentUser.getId().equals(id);

        if (!isAdmin && !isSelf) {
            throw new AccessDeniedException("You can only upload your own profile photo");
        }

        return ResponseEntity.ok(userService.uploadPhoto(id, file));
    }

    @Operation(summary = "Get users by department",
            description = "Returns all users assigned to a specific department.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of users in the department",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = UserDTO.class)))),
            @ApiResponse(responseCode = "404", description = "Department not found", content = @Content)
    })
    @GetMapping("/by-department/{deptId}")
    public ResponseEntity<List<UserDTO>> getUsersByDepartment(
            @Parameter(description = "Department ID", required = true) @PathVariable String deptId) {
        return ResponseEntity.ok(userService.getUsersByDepartment(deptId));
    }

    @Operation(summary = "Get my profile",
            description = "Returns the extended profile of the currently authenticated user, including " +
                    "detailed department information and recent evaluations.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User profile with detailed departments and evaluations",
                    content = @Content(schema = @Schema(implementation = UserProfileDTO.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content)
    })
    @GetMapping("/me/profile")
    public ResponseEntity<UserProfileDTO> getMyProfile() {
        User currentUser = accessService.getCurrentUser();
        return ResponseEntity.ok(userService.getProfile(currentUser.getId()));
    }

}
