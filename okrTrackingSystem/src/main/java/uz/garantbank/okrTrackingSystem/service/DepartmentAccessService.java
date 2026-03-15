package uz.garantbank.okrTrackingSystem.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.garantbank.okrTrackingSystem.entity.Department;
import uz.garantbank.okrTrackingSystem.entity.Role;
import uz.garantbank.okrTrackingSystem.entity.User;
import uz.garantbank.okrTrackingSystem.repository.UserRepository;
import uz.garantbank.okrTrackingSystem.security.UserDetailsImpl;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing department-based access control.
 * Centralizes all permission logic for department data access.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DepartmentAccessService {

    private final UserRepository userRepository;

    /**
     * Get the currently authenticated user from the SecurityContext.
     *
     * @return the current User entity
     * @throws AccessDeniedException if not authenticated
     */
    @Transactional(readOnly = true)
    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            throw new AccessDeniedException("Not authenticated");
        }

        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new AccessDeniedException("User not found"));
    }

    /**
     * Check if the user has ADMIN role.
     *
     * @param user the user to check
     * @return true if user is an admin
     */
    public boolean isAdmin(User user) {
        return user.getRole() == Role.ADMIN;
    }

    /**
     * Check if the user has a high-level role (ADMIN, DIRECTOR, HR, or
     * BUSINESS_BLOCK).
     *
     * @param user the user to check
     * @return true if user has a high-level role
     */

    public boolean hasHighLevelRole(User user) {
        return user.getRole() == Role.ADMIN ||
                user.getRole() == Role.DIRECTOR ||
                user.getRole() == Role.HR ||
                user.getRole() == Role.BUSINESS_BLOCK;
    }

    /**
     * Check if the user can view a specific department.
     * All authenticated users can view all departments.
     *
     * @param user         the user to check
     * @param departmentId the department ID
     * @return true (all authenticated users can view all departments)
     */
    public boolean canViewDepartment(User user, String departmentId) {
        return true; // All authenticated users can view all departments
    }

    /**
     * Check if the user can edit a specific department.
     * - ADMIN can edit all departments
     * - EMPLOYEE cannot edit any department (read-only)
     * - Other roles can only edit departments they are assigned to
     *
     * @param user         the user to check
     * @param departmentId the department ID
     * @return true if user can edit the department
     */

    @Transactional(readOnly = true)
    public boolean canEditDepartment(User user, String departmentId) {
        // Read-only users cannot edit anything
        if (user.isReadOnly()) {
            return false;
        }

        // ADMIN, HR, and BUSINESS_BLOCK can edit everything
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.HR || user.getRole() == Role.BUSINESS_BLOCK) {
            return true;
        }

        // Null departmentId (e.g., division/group objectives) — only ADMIN/DIRECTOR
        if (departmentId == null) {
            return user.getRole() == Role.DIRECTOR;
        }

        // EMPLOYEE is normally read-only, but can edit if canEditAssignedDepartments is
        // enabled
        if (user.getRole() == Role.EMPLOYEE) {
            if (user.isCanEditAssignedDepartments()) {
                return isDepartmentAssigned(user, departmentId);
            }
            return false;
        }

        // Other roles can only edit assigned departments
        return isDepartmentAssigned(user, departmentId);
    }

    /**
     * Check if the user can edit threshold/score level values for a department.
     * Only ADMIN can edit score levels.
     *
     * @param user         the user to check
     * @param departmentId the department ID
     * @return true if user can edit thresholds/score levels
     */
    @Transactional(readOnly = true)
    public boolean canEditThresholds(User user, String departmentId) {
        // ADMIN, HR, and BUSINESS_BLOCK can edit score levels/thresholds
        return user.getRole() == Role.ADMIN || user.getRole() == Role.HR || user.getRole() == Role.BUSINESS_BLOCK;
    }

    /**
     * Check if the user can edit score levels (thresholds).
     * Only ADMIN can edit score levels.
     *
     * @param user the user to check
     * @return true if user can edit score levels
     */
    public boolean canEditScoreLevels(User user) {
        return user.getRole() == Role.ADMIN || user.getRole() == Role.HR || user.getRole() == Role.BUSINESS_BLOCK;
    }

    /**
     * Check if the user can edit actual values for a department.
     * Same rules as canEditDepartment.
     *
     * @param user         the user to check
     * @param departmentId the department ID
     * @return true if user can edit actual values
     */
    @Transactional(readOnly = true)
    public boolean canEditActualValues(User user, String departmentId) {
        return canEditDepartment(user, departmentId);
    }

    /**
     * Check if a department is assigned to the user.
     *
     * @param user         the user to check
     * @param departmentId the department ID
     * @return true if the department is in the user's assigned departments
     */
    @Transactional(readOnly = true)
    public boolean isDepartmentAssigned(User user, String departmentId) {
        // Ensure the collection is loaded using eager fetch
        User freshUser = userRepository.findByIdWithDepartments(user.getId()).orElse(user);
        return freshUser.getAssignedDepartments().stream()
                .anyMatch(dept -> dept.getId().equals(departmentId));
    }

    /**
     * Get the list of department IDs the user is assigned to.
     *
     * @param user the user
     * @return list of department IDs
     */
    @Transactional(readOnly = true)
    public List<String> getAssignedDepartmentIds(User user) {
        User freshUser = userRepository.findByIdWithDepartments(user.getId()).orElse(user);
        return freshUser.getAssignedDepartments().stream()
                .map(Department::getId)
                .collect(Collectors.toList());
    }

    /**
     * Check if the user can edit progress for a department's key results.
     * Only ADMIN or DEPARTMENT_LEADER assigned to the department can edit progress.
     *
     * @param user         the user to check
     * @param departmentId the department ID
     * @return true if user can edit progress
     */
    @Transactional(readOnly = true)
    public boolean canEditProgress(User user, String departmentId) {
        if (user.isReadOnly()) {
            return false;
        }
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.HR || user.getRole() == Role.BUSINESS_BLOCK) {
            return true;
        }
        if (user.getRole() == Role.DEPARTMENT_LEADER) {
            return isDepartmentAssigned(user, departmentId);
        }
        return false;
    }

    /**
     * Check if the user can view progress for a department's key results.
     * Only users assigned to the department or ADMIN can view progress.
     *
     * @param user         the user to check
     * @param departmentId the department ID
     * @return true if user can view progress
     */
    @Transactional(readOnly = true)
    public boolean canViewProgress(User user, String departmentId) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.HR || user.getRole() == Role.BUSINESS_BLOCK) {
            return true;
        }
        return isDepartmentAssigned(user, departmentId);
    }

    /**
     * Check if the current user has write access.
     * Throws AccessDeniedException if the user is in read-only mode.
     *
     * @param user the user to check
     * @throws AccessDeniedException if user is read-only
     */
    public void requireWriteAccess(User user) {
        if (user.isReadOnly()) {
            throw new AccessDeniedException(
                    "Your account is in read-only mode. Contact an administrator to enable write access.");
        }
    }

    /**
     * Verify that the current user can edit the specified department.
     * Throws AccessDeniedException if not allowed.
     *
     * @param departmentId the department ID
     * @throws AccessDeniedException if user cannot edit the department
     */
    @Transactional(readOnly = true)
    public void requireEditPermission(String departmentId) {
        User currentUser = getCurrentUser();
        if (!canEditDepartment(currentUser, departmentId)) {
            throw new AccessDeniedException("You do not have permission to edit this department");
        }
    }

    /**
     * Verify that the current user is an admin.
     * Throws AccessDeniedException if not.
     *
     * @throws AccessDeniedException if user is not an admin
     */
    public void requireAdmin() {
        User currentUser = getCurrentUser();
        if (!isAdmin(currentUser)) {
            throw new AccessDeniedException("Only administrators can perform this action");
        }
    }
}
