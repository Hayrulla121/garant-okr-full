package uz.garantbank.okrTrackingSystem.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.garantbank.okrTrackingSystem.entity.KeyResult;

import java.util.List;

@Repository
public interface KeyResultRepository extends JpaRepository<KeyResult, String> {
    List<KeyResult> findByObjectiveId(String objectiveId);

    // Find key result by name within an objective (for import upsert)
    java.util.Optional<KeyResult> findByNameAndObjectiveId(String name, String objectiveId);
}