package uz.garantbank.okrTrackingSystem.repository;



import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.garantbank.okrTrackingSystem.entity.Role;
import uz.garantbank.okrTrackingSystem.entity.User;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for User entity operations.
 * Provides methods for authentication and user management.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Find a user by username (used for login)
     *
     * @param username the username to search for
     * @return Optional containing the user if found
     */
    Optional<User> findByUsername(String username);

    /**
     * Find a user by email address
     *
     * @param email the email to search for
     * @return Optional containing the user if found
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if a username already exists
     *
     * @param username the username to check
     * @return true if username exists, false otherwise
     */
    boolean existsByUsername(String username);

    /**
     * Check if an email already exists
     *
     * @param email the email to check
     * @return true if email exists, false otherwise
     */
    boolean existsByEmail(String email);

    /**
     * Find all users assigned to a specific department with all their departments eagerly loaded
     *
     * @param departmentId the department ID to search for
     * @return list of users assigned to the department
     */
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.assignedDepartments WHERE u.id IN (SELECT u2.id FROM User u2 JOIN u2.assignedDepartments d WHERE d.id = :departmentId)")
    List<User> findByAssignedDepartmentId(@Param("departmentId") String departmentId);

    /**
     * Find all users with a specific role
     *
     * @param role the role to search for
     * @return list of users with the specified role
     */
    List<User> findByRole(Role role);

    /**
     * Find all active users
     *
     * @return list of active users
     */
    List<User> findByIsActiveTrue();

    /**
     * Find all inactive users
     *
     * @return list of inactive users
     */
    List<User> findByIsActiveFalse();

    /**
     * Find department leaders assigned to specific departments
     *
     * @param departmentIds list of department IDs
     * @return list of users who are department leaders in the specified departments
     */
    @Query("SELECT u FROM User u JOIN u.assignedDepartments d WHERE u.role = 'DEPARTMENT_LEADER' AND d.id IN :departmentIds")
    List<User> findDepartmentLeadersInDepartments(@Param("departmentIds") List<String> departmentIds);

    /**
     * Find a user by ID with assigned departments eagerly loaded
     *
     * @param id the user ID
     * @return Optional containing the user with departments loaded
     */
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.assignedDepartments WHERE u.id = :id")
    Optional<User> findByIdWithDepartments(@Param("id") UUID id);

    /**
     * Find all users with assigned departments eagerly loaded
     * Uses DISTINCT to avoid duplicate users when they have multiple departments
     *
     * @return list of all users with departments loaded
     */
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.assignedDepartments")
    List<User> findAllWithDepartments();
}
