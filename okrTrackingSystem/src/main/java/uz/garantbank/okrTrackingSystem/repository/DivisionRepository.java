package uz.garantbank.okrTrackingSystem.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.garantbank.okrTrackingSystem.entity.Division;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DivisionRepository extends JpaRepository<Division, String> {

    // Spring Data JPA automatically implements these methods!

    // Find division with all its departments loaded
    @Query("SELECT d FROM Division d LEFT JOIN FETCH d.departments WHERE d.id = :id")
    Optional<Division> findByIdWithDepartments(@Param("id") String id);

    // Find all divisions with departments
    @Query("SELECT DISTINCT d FROM Division d LEFT JOIN FETCH d.departments")
    List<Division> findAllWithDepartments();

    // Check if division name already exists
    boolean existsByName(String name);

    // Find divisions by leader
    List<Division> findByDivisionLeaderId(UUID leaderId);

    // Find division by name (for migration)
    Optional<Division> findByName(String name);
}


/**
 * JpaRepository<Division, String>: Gives you free methods like save(), findById(), findAll(), delete()
 * @Query: Custom JPQL (Java Persistence Query Language) - like SQL but for Java objects
 * LEFT JOIN FETCH: Loads related data in same query (prevents N+1 query problem)
 * Optional<Division>: A container that may or may not contain a value (null-safe)
 */
