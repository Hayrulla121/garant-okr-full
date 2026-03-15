package uz.garantbank.okrTrackingSystem.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.garantbank.okrTrackingSystem.dto.DepartmentScoreResult;
import uz.garantbank.okrTrackingSystem.dto.ScoreResult;
import uz.garantbank.okrTrackingSystem.entity.Department;
import uz.garantbank.okrTrackingSystem.entity.ObjectiveLevel;
import uz.garantbank.okrTrackingSystem.entity.ScoreSnapshot;
import uz.garantbank.okrTrackingSystem.repository.DepartmentRepository;
import uz.garantbank.okrTrackingSystem.repository.ScoreSnapshotRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScoreSnapshotService {

    private final ScoreSnapshotRepository snapshotRepository;
    private final DepartmentRepository departmentRepository;
    private final ScoreCalculationService scoreService;

    /**
     * Take a snapshot of current department scores for the current month ("Close the Month").
     */
    @Transactional
    public void takeSnapshot() {
        LocalDateTime now = LocalDateTime.now();
        int month = now.getMonthValue();
        int year = now.getYear();

        log.info("Taking score snapshot (close month) for {}/{}", month, year);

        List<Department> departments = departmentRepository.findAllWithObjectives();

        for (Department dept : departments) {
            try {
                var deptObjectives = dept.getObjectives().stream()
                        .filter(o -> o.getLevel() == ObjectiveLevel.DEPARTMENT)
                        .toList();

                DepartmentScoreResult result = scoreService.calculateDepartmentScoreWithEvaluations(
                        dept.getId(), deptObjectives);
                double score = result.getFinalCombinedScore() != null ? result.getFinalCombinedScore() : 0.0;
                ScoreResult scoreResult = scoreService.createScoreResult(score);

                upsertSnapshot(dept.getId(), dept.getName(), ScoreSnapshot.TargetType.DEPARTMENT,
                        month, year, score, scoreResult.getLevel(), scoreResult.getColor());
            } catch (Exception e) {
                log.warn("Failed to snapshot department {}: {}", dept.getName(), e.getMessage());
            }
        }

        scoreService.clearCache();
        log.info("Score snapshot completed for {}/{}", month, year);
    }

    /**
     * Get all snapshots for a given target type (e.g. DEPARTMENT).
     */
    @Transactional(readOnly = true)
    public List<ScoreSnapshot> getHistory(ScoreSnapshot.TargetType targetType) {
        return snapshotRepository.findByTargetTypeOrderByYearAscMonthAsc(targetType);
    }

    /**
     * Generate demo history data — 12 months of fake scores for all departments.
     */
    @Transactional
    public void generateDemoHistory() {
        log.info("Generating demo score history...");

        List<Department> departments = departmentRepository.findAllWithObjectives();
        int currentYear = LocalDateTime.now().getYear();
        Random rng = new Random(42);

        for (Department dept : departments) {
            try {
                var deptObjectives = dept.getObjectives().stream()
                        .filter(o -> o.getLevel() == ObjectiveLevel.DEPARTMENT)
                        .toList();

                ScoreResult autoScore = scoreService.calculateDepartmentScore(deptObjectives);
                double baseScore = autoScore.getScore() != null ? autoScore.getScore() : 0.5;
                if (baseScore < 0.3) baseScore = 0.3 + rng.nextDouble() * 0.4;

                for (int m = 1; m <= 12; m++) {
                    double trend = (m - 1) * 0.02;
                    double variation = (rng.nextDouble() - 0.5) * 0.15;
                    double score = Math.max(0.1, Math.min(1.0, baseScore + trend + variation));
                    ScoreResult sr = scoreService.createScoreResult(score);

                    upsertSnapshot(dept.getId(), dept.getName(), ScoreSnapshot.TargetType.DEPARTMENT,
                            m, currentYear, score, sr.getLevel(), sr.getColor());
                }
            } catch (Exception e) {
                log.warn("Failed to generate demo history for {}: {}", dept.getName(), e.getMessage());
            }
        }

        scoreService.clearCache();
        log.info("Demo score history generated for {} departments", departments.size());
    }

    @Transactional
    public void deleteAll() {
        snapshotRepository.deleteAll();
    }

    private void upsertSnapshot(String targetId, String targetName, ScoreSnapshot.TargetType targetType,
                                int month, int year, double score, String level, String color) {
        ScoreSnapshot snapshot = snapshotRepository
                .findByTargetIdAndTargetTypeAndMonthAndYear(targetId, targetType, month, year)
                .orElse(ScoreSnapshot.builder()
                        .targetId(targetId)
                        .targetType(targetType)
                        .month(month)
                        .year(year)
                        .build());

        snapshot.setTargetName(targetName);
        snapshot.setScore(score);
        snapshot.setScoreLevel(level);
        snapshot.setColor(color);
        snapshot.setSnapshotDate(LocalDateTime.now());

        snapshotRepository.save(snapshot);
    }
}
