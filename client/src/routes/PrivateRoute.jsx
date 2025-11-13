import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children, requiredRole }) => {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Check role-based access
    if (requiredRole) {
        const hasAccess = checkRoleAccess(user.role, requiredRole);
        if (!hasAccess) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return children;
};

// Helper function to check role access
const checkRoleAccess = (userRole, requiredRole) => {
    const roleHierarchy = {
        admin: ['admin', 'hr', 'manager', 'employee'],
        hr: ['hr', 'manager', 'employee'],
        manager: ['manager', 'employee'],
        employee: ['employee'],
    };

    return roleHierarchy[userRole]?.includes(requiredRole) || false;
};

export default PrivateRoute;
