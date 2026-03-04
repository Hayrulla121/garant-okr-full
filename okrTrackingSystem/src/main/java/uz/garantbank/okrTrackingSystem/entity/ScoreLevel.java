package uz.garantbank.okrTrackingSystem.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "score_levels")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScoreLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name; // e.g., "Below", "Meets", "Good", "Very Good", "Exceptional"

    @Column(nullable = false)
    private Double scoreValue; // e.g., 0.0, 0.31, 0.51, 0.86, 0.98

    @Column(nullable = false)
    private String color; // e.g., "#d9534f"

    @Column(nullable = false)
    private Integer displayOrder; // For ordering: 0, 1, 2, 3, 4

    @Column(nullable = false)
    private Boolean isDefault; // Whether this is the default configuration
}
