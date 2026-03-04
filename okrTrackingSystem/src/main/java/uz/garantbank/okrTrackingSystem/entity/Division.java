package uz.garantbank.okrTrackingSystem.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "division") // <- table name in database
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Division {
    @Id  // ← This is the primary key (unique identifier)
    @Column(name = "id")
    @EqualsAndHashCode.Include
    private String id;  // Using String for UUID consistency

    private String name;

    @ManyToOne(fetch = FetchType.LAZY)  // ← Many divisions can have same leader
    @JoinColumn(name = "leader_id")  // ← Foreign key column name
    private User divisionLeader;


    @OneToMany(mappedBy = "division", cascade = CascadeType.ALL)
    // ↑ One division has many departments
    // mappedBy = "division" means Department entity owns the relationship
    // cascade = ALL means operations (save/delete) cascade to children
    private Set<Department> departments = new HashSet<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist  // ← Runs before saving new division
    protected void onCreate() {
        this.id = UUID.randomUUID().toString();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate  // ← Runs before updating existing division
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

}
