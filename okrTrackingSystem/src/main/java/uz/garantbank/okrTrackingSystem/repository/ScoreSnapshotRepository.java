package uz.garantbank.okrTrackingSystem.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.garantbank.okrTrackingSystem.entity.ScoreSnapshot;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScoreSnapshotRepository extends JpaRepository<ScoreSnapshot, String> {

    List<ScoreSnapshot> findByTargetTypeOrderByYearAscMonthAsc(ScoreSnapshot.TargetType targetType);

    List<ScoreSnapshot> findByTargetIdOrderByYearAscMonthAsc(String targetId);

    Optional<ScoreSnapshot> findByTargetIdAndTargetTypeAndMonthAndYear(
            String targetId, ScoreSnapshot.TargetType targetType, Integer month, Integer year);
}
