package uz.garantbank.okrTrackingSystem.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "score_snapshots", uniqueConstraints =
    @UniqueConstraint(columnNames = {"target_id", "target_type", "SNAPSHOT_MONTH", "SNAPSHOT_YEAR"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScoreSnapshot {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "target_id", nullable = false)
    private String targetId;

    @Column(name = "target_name")
    private String targetName;

    @Column(name = "target_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private TargetType targetType;

    @Column(name = "\"QUARTER\"")
    private Integer quarter;

    @Column(name = "\"SNAPSHOT_YEAR\"", nullable = false)
    private Integer year;

    @Column(name = "\"SNAPSHOT_MONTH\"", nullable = false)
    private Integer month;

    @Column(nullable = false)
    private Double score;

    private String scoreLevel;

    private String color;

    @Column(name = "snapshot_date")
    private LocalDateTime snapshotDate;

    public enum TargetType {
        DEPARTMENT, DIVISION
    }
}
