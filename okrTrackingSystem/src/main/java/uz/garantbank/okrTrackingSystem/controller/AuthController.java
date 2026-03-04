package uz.garantbank.okrTrackingSystem.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import uz.garantbank.okrTrackingSystem.dto.LoginRequest;
import uz.garantbank.okrTrackingSystem.dto.LoginResponse;
import uz.garantbank.okrTrackingSystem.dto.RegisterRequest;
import uz.garantbank.okrTrackingSystem.dto.UserDTO;
import uz.garantbank.okrTrackingSystem.security.JwtTokenProvider;
import uz.garantbank.okrTrackingSystem.security.UserDetailsImpl;
import uz.garantbank.okrTrackingSystem.service.UserService;

/**
 * Controller for authentication endpoints
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
@Slf4j
@Tag(name = "Authentication", description = "Login, registration, and current user operations")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserService userService;

    @Operation(
            summary = "User login",
            description = "Authenticate with username and password to receive a JWT token. " +
                    "The token should be included in the `Authorization` header as `Bearer <token>` for all subsequent requests."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login successful — returns JWT token and user details",
                    content = @Content(schema = @Schema(implementation = LoginResponse.class))),
            @ApiResponse(responseCode = "401", description = "Invalid credentials", content = @Content)
    })
    @io.swagger.v3.oas.annotations.security.SecurityRequirements // No auth required for login
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        log.info("Login attempt for user: {}", request.getUsername());
        // Authenticate user
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        log.info("Authentication successful for user: {}", request.getUsername());

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Generate JWT token
        String jwt = jwtTokenProvider.generateToken(authentication);
        // Get user details
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // Update last login timestamp
        userService.updateLastLogin(userDetails.getId());

        UserDTO userDTO = userService.getUserById(userDetails.getId());

        log.info("Login completed for user: {}", request.getUsername());

        return ResponseEntity.ok(new LoginResponse(jwt, userDTO));

    }

    @Operation(
            summary = "Register new user",
            description = "Create a new user account. **Requires ADMIN role.** " +
                    "The user will be assigned the specified role and optionally linked to a department."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User registered successfully",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request (e.g., duplicate username)", content = @Content),
            @ApiResponse(responseCode = "403", description = "Only ADMIN can register users", content = @Content)
    })
    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> register(@RequestBody RegisterRequest request) {
        UserDTO user = userService.registerUser(request);
        return ResponseEntity.ok(user);
    }

    @Operation(
            summary = "Get current user",
            description = "Returns the profile information of the currently authenticated user based on the JWT token."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Current user details",
                    content = @Content(schema = @Schema(implementation = UserDTO.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content)
    })
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        UserDTO userDTO = userService.getUserById(userDetails.getId());
        return ResponseEntity.ok(userDTO);
    }

}
