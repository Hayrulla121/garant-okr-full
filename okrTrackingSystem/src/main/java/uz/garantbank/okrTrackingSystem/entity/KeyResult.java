package uz.garantbank.okrTrackingSystem.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "key_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = {"objective"})
public class KeyResult {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MetricType metricType;

    private String unit;

    @Column(nullable = false)
    private Integer weight; // Percentage weight within objective (0-100)

    // Thresholds for scoring
    private Double thresholdBelow;
    private Double thresholdMeets;
    private Double thresholdGood;
    private Double thresholdVeryGood;
    private Double thresholdExceptional;

    // Actual value (numeric for quantitative, grade string for qualitative)
    private String actualValue;

    // Progress percentage (0-100), manually set by ADMIN or DEPARTMENT_LEADER
    @Column(columnDefinition = "INTEGER DEFAULT 0")
    @lombok.Builder.Default
    private Integer progress = 0;

    // Attachment for actual value proof/basis
    @Column(name = "attachment_url")
    private String attachmentUrl;

    @Column(name = "attachment_file_name")
    private String attachmentFileName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "objective_id", nullable = false)
    private Objective objective;

    public enum MetricType {
        HIGHER_BETTER,
        LOWER_BETTER,
        QUALITATIVE
    }
}
