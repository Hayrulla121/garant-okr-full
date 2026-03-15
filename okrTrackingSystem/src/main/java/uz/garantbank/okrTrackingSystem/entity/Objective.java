package uz.garantbank.okrTrackingSystem.entity;


import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "objectives")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = {"department", "employee", "keyResults", "group", "division"})
public class Objective {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer weight; // Percentage weight within department (0-100)

    /**
     * Department this objective belongs to (null for division/group-only OKRs)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    /**
     * Division this objective belongs to (null unless level=DIVISION)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "division_id")
    private Division division;

    /**
     * Group this objective belongs to (null unless level=GROUP)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private OrgGroup group;

    /**
     * Employee this objective is assigned to (null for department OKRs)
     * Only Directors can assign individual OKRs to employees
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private User employee;

    /**
     * Level of this objective (DIVISION, DEPARTMENT, GROUP, or INDIVIDUAL)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ObjectiveLevel level = ObjectiveLevel.DEPARTMENT;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    @OneToMany(mappedBy = "objective", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @Builder.Default
    private List<KeyResult> keyResults = new ArrayList<>();
}

