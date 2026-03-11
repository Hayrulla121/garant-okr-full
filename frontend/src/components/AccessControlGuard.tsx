import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types/auth';

interface Props {
  /**
   * Roles that are allowed to see the children
   */
  allowedRoles?: Role[];

  /**
   * Department ID - if provided, checks if user has access to this department
   */
  requiresDepartmentAccess?: string;

  /**
   * What to render if access is denied (default: nothing)
   */
  fallback?: ReactNode;

  /**
   * Children to render if access is allowed
   */
  children: ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions.
 * Use this to hide UI elements from unauthorized users.
 */
export default function AccessControlGuard({
  allowedRoles,
  requiresDepartmentAccess,
  fallback = null,
  children
}: Props) {
  const { user, hasAnyRole, canEditDepartment } = useAuth();

  // Not authenticated
  if (!user) {
    return <>{fallback}</>;
  }

  // Check role
  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  // Check department access
  if (requiresDepartmentAccess && !canEditDepartment(requiresDepartmentAccess)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook to check if current user can edit a specific department
 */
export function useCanEdit(departmentId?: string): boolean {
  const { user, canEditDepartment } = useAuth();

  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  if (user.role === Role.EMPLOYEE) return false;
  if (!departmentId) return false;

  return canEditDepartment(departmentId);
}

/**
 * Hook to check if current user is in read-only mode
 */
export function useIsReadOnly(): boolean {
  const { user } = useAuth();
  return user?.role === Role.EMPLOYEE;
}
