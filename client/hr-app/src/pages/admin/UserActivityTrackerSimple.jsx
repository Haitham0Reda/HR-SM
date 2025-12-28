import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useAuth } from '../../store/providers/ReduxAuthProvider';

/**
 * Simple User Activity Tracker Page for testing
 */
const UserActivityTrackerSimple = () => {
    const { user, tenant } = useAuth();

    // Check if user has admin permissions
    if (!user) {
        return (
            <Box p={3}>
                <Alert severity="warning">
                    No user found. Please make sure you are logged in.
                </Alert>
            </Box>
        );
    }

    if (user.role !== 'admin' && user.role !== 'platform_admin') {
        return (
            <Box p={3}>
                <Alert severity="error">
                    Access denied. This page is only available to admin users.
                    <br />
                    Your current role: {user.role}
                    <br />
                    Required roles: admin, platform_admin
                </Alert>
            </Box>
        );
    }

    return (
        <Box p={3} data-testid="user-activity-tracker">
            <Typography variant="h4" gutterBottom>
                User Activity Tracker (Test Version)
            </Typography>
            <Typography variant="body1" color="textSecondary" gutterBottom>
                Monitor and track user activities within {tenant?.name || 'your company'}
            </Typography>
            
            <Alert severity="info" sx={{ mt: 3 }}>
                This is a simplified test version of the User Activity Tracker page.
                If you can see this message, the routing and basic component structure is working.
            </Alert>

            <Box mt={3}>
                <Typography variant="h6">Debug Information:</Typography>
                <Typography variant="body2">User Role: {user?.role}</Typography>
                <Typography variant="body2">User Email: {user?.email}</Typography>
                <Typography variant="body2">User ID: {user?.id}</Typography>
                <Typography variant="body2">Tenant ID: {tenant?.tenantId}</Typography>
                <Typography variant="body2">Company Name: {tenant?.name}</Typography>
                <Typography variant="body2">Current URL: {window.location.pathname}</Typography>
                <Typography variant="body2">User Object: {JSON.stringify(user, null, 2)}</Typography>
            </Box>
        </Box>
    );
};

export default UserActivityTrackerSimple;
