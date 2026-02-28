import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role, LoginRequest } from '../types/auth';
import { authApi } from '../services/api';

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    hasRole: (role: Role) => boolean;
    hasAnyRole: (roles: Role[]) => boolean;
    canEditDepartment: (departmentId: string) => boolean;
    canEditProgress: (departmentId: string) => boolean;
    canEditScoreLevels: boolean;
    canCreateDepartment: boolean;
    isReadOnly: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing token on mount
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username: string, password: string) => {
        try {
            const request: LoginRequest = { username, password };
            const response = await authApi.login(request);

            const { token, user } = response.data;

            // Store token and user
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            setToken(token);
            setUser(user);
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const hasRole = (role: Role): boolean => {
        return user?.role === role;
    };

    const hasAnyRole = (roles: Role[]): boolean => {
        return user ? roles.includes(user.role) : false;
    };

    /**
     * Check if the current user can edit a specific department.
     * - ADMIN can edit all departments
     * - EMPLOYEE cannot edit any department (read-only)
     * - Other roles can only edit departments they are assigned to
     */
    const canEditDepartment = (departmentId: string): boolean => {
        if (!user) return false;

        // ADMIN can edit all
        if (user.role === Role.ADMIN) return true;

        // EMPLOYEE is normally read-only, but can edit if canEditAssignedDepartments is enabled
        if (user.role === Role.EMPLOYEE) {
            if (user.canEditAssignedDepartments) {
                return user.assignedDepartments?.some(d => d.id === departmentId) ?? false;
            }
            return false;
        }

        // Check if department is in user's assigned departments
        return user.assignedDepartments?.some(d => d.id === departmentId) ?? false;
    };

    /**
     * Check if the current user can edit progress for a department's key results.
     * Only ADMIN or DEPARTMENT_LEADER assigned to the department can edit progress.
     */
    const canEditProgress = (departmentId: string): boolean => {
        if (!user) return false;
        if (user.role === Role.ADMIN) return true;
        if (user.role === Role.DEPARTMENT_LEADER) {
            return user.assignedDepartments?.some(d => d.id === departmentId) ?? false;
        }
        return false;
    };

    /**
     * Check if user is in read-only mode (EMPLOYEE role without edit permissions)
     */
    const isReadOnly = user?.role === Role.EMPLOYEE && !user?.canEditAssignedDepartments;

    /**
     * Check if user can edit score levels (thresholds) - ADMIN only
     */
    const canEditScoreLevels = user?.role === Role.ADMIN;

    /**
     * Check if user can create departments - ADMIN or DIRECTOR
     */
    const canCreateDepartment = user?.role === Role.ADMIN || user?.role === Role.DIRECTOR;

    const value: AuthContextType = {
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        hasRole,
        hasAnyRole,
        canEditDepartment,
        canEditProgress,
        canEditScoreLevels,
        canCreateDepartment,
        isReadOnly,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
