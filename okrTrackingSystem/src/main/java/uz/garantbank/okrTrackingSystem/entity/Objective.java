package uz.garantbank.okrTrackingSystem.entity;


import jakarta.persistence.*;
import lombok.*;
import java.util.*;

@Entity
@Table(name = "objectives")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = {"department", "employee", "keyResults"})
public class Objective {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer weight; // Percentage weight within department (0-100)

    /**
     * Department this objective belongs to (null for individual employee OKRs)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    /**
     * Employee this objective is assigned to (null for department OKRs)
     * Only Directors can assign individual OKRs to employees
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private User employee;

    /**
     * Level of this objective (DEPARTMENT or INDIVIDUAL)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ObjectiveLevel level = ObjectiveLevel.DEPARTMENT;

    @OneToMany(mappedBy = "objective", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<KeyResult> keyResults = new HashSet<>();
}

