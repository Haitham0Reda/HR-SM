import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Alert } from '@mui/material';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import { useLocation } from 'react-router-dom';

/**
 * Debug page to check authentication and routing state
 */
const AuthDebug = () => {
    const { user, tenant, loading, isAuthenticated, tenantToken, tenantId } = useAuth();
    const location = useLocation();
    const {
        companyName,
        companySlug,
        isCompanyRoute,
        isValidCompanyRoute,
        currentCompanySlug,
        currentInternalPath,
        shouldRedirectToCompanyRoute
    } = useCompanyRouting();

    const [localStorageData, setLocalStorageData] = useState({});

    useEffect(() => {
        // Get localStorage data
        setLocalStorageData({
            tenant_token: localStorage.getItem('tenant_token'),
            tenant_id: localStorage.getItem('tenant_id'),
            token: localStorage.getItem('token'),
            user: localStorage.getItem('user')
        });
    }, []);

    const clearStorage = () => {
        localStorage.clear();
        window.location.reload();
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Authentication & Routing Debug
            </Typography>

            {/* Auth Context State */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Auth Context State
                </Typography>
                <Typography>Loading: {loading ? 'true' : 'false'}</Typography>
                <Typography>Is Authenticated: {isAuthenticated ? 'true' : 'false'}</Typography>
                <Typography>Tenant Token: {tenantToken ? 'Present' : 'Missing'}</Typography>
                <Typography>Tenant ID: {tenantId || 'Missing'}</Typography>
                <Typography>User: {user ? JSON.stringify(user, null, 2) : 'null'}</Typography>
                <Typography>Tenant: {tenant ? JSON.stringify(tenant, null, 2) : 'null'}</Typography>
            </Paper>

            {/* Local Storage State */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Local Storage State
                </Typography>
                <pre>{JSON.stringify(localStorageData, null, 2)}</pre>
                <Button onClick={clearStorage} variant="outlined" color="warning" sx={{ mt: 1 }}>
                    Clear Storage & Reload
                </Button>
            </Paper>

            {/* Routing State */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Routing State
                </Typography>
                <Typography>Current Pathname: {location.pathname}</Typography>
                <Typography>Company Name: {companyName}</Typography>
                <Typography>Company Slug: {companySlug}</Typography>
                <Typography>Is Company Route: {isCompanyRoute ? 'true' : 'false'}</Typography>
                <Typography>Is Valid Company Route: {isValidCompanyRoute ? 'true' : 'false'}</Typography>
                <Typography>Current Company Slug: {currentCompanySlug}</Typography>
                <Typography>Current Internal Path: {currentInternalPath}</Typography>
                <Typography>Should Redirect: {shouldRedirectToCompanyRoute() ? 'true' : 'false'}</Typography>
            </Paper>

            {/* Warnings */}
            {!isAuthenticated && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    User is not authenticated - this will cause redirect to login
                </Alert>
            )}

            {isCompanyRoute && !isValidCompanyRoute && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Invalid company route - this will cause redirect
                </Alert>
            )}

            {shouldRedirectToCompanyRoute() && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Should redirect to company route
                </Alert>
            )}
        </Box>
    );
};

export default AuthDebug;
