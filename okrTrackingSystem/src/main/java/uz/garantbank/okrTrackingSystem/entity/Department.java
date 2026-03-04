package uz.garantbank.okrTrackingSystem.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "department")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Department {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    private String id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false) // this ensures that every department belongs to a division
    // ↑ optional = false means every department MUST have a division
    @JoinColumn(name = "division_id", nullable = false)
    // ↑ Creates division_id column as foreign key
    private Division division;

    @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<Objective> objectives = new HashSet<>();

    /**
     * Department leader (user with DEPARTMENT_LEADER role)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leader_id")
    private User departmentLeader;

    /**
     * Users assigned to this department (many-to-many back-reference)
     */
    @ManyToMany(mappedBy = "assignedDepartments", fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private Set<User> assignedUsers = new HashSet<>();

    private LocalDateTime createdAt;
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
