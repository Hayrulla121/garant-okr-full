package uz.garantbank.okrTrackingSystem.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.garantbank.okrTrackingSystem.entity.Objective;

import java.util.List;
import java.util.Optional;

@Repository
public interface ObjectiveRepository extends JpaRepository<Objective, String> {
    List<Objective> findByDepartmentId(String departmentId);

    /**
     * Find objectives by department ID with key results eagerly loaded
     */
    @Query("SELECT DISTINCT o FROM Objective o LEFT JOIN FETCH o.keyResults WHERE o.department.id = :departmentId")
    List<Objective> findByDepartmentIdWithKeyResults(@Param("departmentId") String departmentId);

    /**
     * Find an objective by ID with key results eagerly loaded
     */
    @Query("SELECT o FROM Objective o LEFT JOIN FETCH o.keyResults WHERE o.id = :id")
    Optional<Objective> findByIdWithKeyResults(@Param("id") String id);

    // Find objective by name within a department (for import upsert)
    Optional<Objective> findByNameAndDepartmentId(String name, String departmentId);

    // Find objectives assigned to an employee
    List<Objective> findByEmployeeId(java.util.UUID employeeId);

    // Find individual (leader) objective by name, department, and employee
    @Query("SELECT o FROM Objective o WHERE o.name = :name AND o.department.id = :departmentId AND o.employee.id = :employeeId AND o.level = 'INDIVIDUAL'")
    Optional<Objective> findByNameAndDepartmentIdAndEmployeeId(@Param("name") String name, @Param("departmentId") String departmentId, @Param("employeeId") java.util.UUID employeeId);
}