import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types/auth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <div>Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return (
            <div style={{
                padding: '20px',
                textAlign: 'center'
            }}>
                <h2>Access Denied</h2>
                <p>You do not have permission to access this page.</p>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
