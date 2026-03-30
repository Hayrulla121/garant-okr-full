package uz.garantbank.okrTrackingSystem.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.garantbank.okrTrackingSystem.entity.OrgGroup;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupRepository extends JpaRepository<OrgGroup, String> {

    List<OrgGroup> findByDepartmentId(String departmentId);

    @Query("SELECT g FROM OrgGroup g LEFT JOIN FETCH g.objectives o LEFT JOIN FETCH o.keyResults WHERE g.department.id = :departmentId")
    List<OrgGroup> findByDepartmentIdWithObjectives(@Param("departmentId") String departmentId);

    @Query("SELECT g FROM OrgGroup g LEFT JOIN FETCH g.objectives o LEFT JOIN FETCH o.keyResults WHERE g.id = :id")
    Optional<OrgGroup> findByIdWithObjectives(@Param("id") String id);

    @Query("SELECT g FROM OrgGroup g LEFT JOIN FETCH g.members WHERE g.id = :id")
    Optional<OrgGroup> findByIdWithMembers(@Param("id") String id);

    Optional<OrgGroup> findByNameAndDepartmentId(String name, String departmentId);
}
