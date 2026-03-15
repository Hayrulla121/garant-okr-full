package uz.garantbank.okrTrackingSystem.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.garantbank.okrTrackingSystem.entity.Department;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, String> {

    /**
     * Find a department by ID with objectives eagerly loaded
     */
    @Query("SELECT d FROM Department d LEFT JOIN FETCH d.division LEFT JOIN FETCH d.objectives o LEFT JOIN FETCH o.keyResults WHERE d.id = :id")
    Optional<Department> findByIdWithObjectives(@Param("id") String id);

    /**
     * Find all departments with objectives and key results eagerly loaded.
     * Both objectives and keyResults are Sets, so no MultipleBagFetchException risk.
     */
    @Query("SELECT DISTINCT d FROM Department d LEFT JOIN FETCH d.division LEFT JOIN FETCH d.objectives o LEFT JOIN FETCH o.keyResults")
    List<Department> findAllWithObjectives();

    /**
     * Find all department IDs (lightweight query for batch processing)
     */
    @Query("SELECT d.id FROM Department d")
    List<String> findAllIds();


    /**
     * Why Add These?
     *
     * Easily find all departments within a division
     * Load department with its parent division in one query
     * Check how many departments a division has before deleting
     * @param divisionId
     * @return
     */
    // Find all departments in a specific division
    List<Department> findByDivisionId(String divisionId);

    // Find department with division loaded
    @Query("SELECT d FROM Department d LEFT JOIN FETCH d.division WHERE d.id = :id")
    Optional<Department> findByIdWithDivision(@Param("id") String id);

    // Count departments in a division
    long countByDivisionId(String divisionId);

    // Find departments without a division (orphans for migration)
    List<Department> findByDivisionIsNull();

    // Find department by name within a division (for import upsert)
    Optional<Department> findByNameAndDivisionId(String name, String divisionId);
}