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
        console.log('PrivateRoute: User not authenticated, redirecting to login');
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
    // Define role hierarchy (higher roles can access lower role requirements)
    const roleHierarchy = {
        'platform_admin': 5,
        'admin': 4,
        'hr': 3,
        'manager': 2,
        'employee': 1
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
};

export default PrivateRoute;
