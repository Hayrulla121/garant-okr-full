package uz.garantbank.okrTrackingSystem.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.garantbank.okrTrackingSystem.entity.ScoreLevel;

import java.util.List;

@Repository
public interface ScoreLevelRepository extends JpaRepository<ScoreLevel, String> {
    List<ScoreLevel> findAllByOrderByDisplayOrderAsc();
}
