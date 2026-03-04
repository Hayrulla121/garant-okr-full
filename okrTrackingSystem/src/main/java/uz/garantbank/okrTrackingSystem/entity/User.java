package uz.garantbank.okrTrackingSystem.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * User entity representing a person in the organization.
 * Users have roles that determine their permissions and evaluation capabilities.
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    private UUID id;

    /**
     * Unique username for login
     */
    @Column(unique = true, nullable = false)
    private String username;

    /**
     * Unique email address
     */
    @Column(unique = true, nullable = false)
    private String email;

    /**
     * BCrypt hashed password
     */
    @Column(nullable = false)
    private String password;

    /**
     * Full display name
     */
    private String fullName;

    /**
     * User's role in the organization
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    /**
     * URL to user's profile photo
     */
    @Column(name = "profile_photo_url")
    private String profilePhotoUrl;

    /**
     * User's job title/position
     */
    @Column(name = "job_title")
    private String jobTitle;

    /**
     * User's phone number
     */
    @Column(name = "phone_number")
    private String phoneNumber;

    /**
     * User's bio/description
     */
    @Column(length = 1000)
    private String bio;

    /**
     * Whether the user account is active
     */
    @Column(name = "is_active", nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private boolean isActive = true;

    /**
     * Whether the employee can edit their assigned departments (like a department leader)
     * Only applicable for EMPLOYEE role users
     */
    @Column(name = "can_edit_assigned_departments", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean canEditAssignedDepartments = false;

    /**
     * Whether the user is in read-only mode.
     * Read-only users can view everything but cannot create, update, or delete
     * objectives, key results, or evaluations.
     * Controlled by ADMIN independently of role.
     */
    @Column(name = "read_only", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean readOnly = false;

    /**
     * Timestamp of user's last login
     */
    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    /**
     * Departments the user is assigned to (many-to-many relationship)
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "user_departments",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "department_id")
    )
    @Builder.Default
    @JsonIgnore
    private Set<Department> assignedDepartments = new HashSet<>();

    /**
     * Timestamp when user was created
     */
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Timestamp when user was last updated
     */
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
