import React from 'react';
import { Box, Paper, Typography, Chip, Button } from '@mui/material';
import { useAuth } from '../../store/providers/ReduxAuthProvider';

/**
 * Debug component to show authentication status
 * Add this to any page to see auth state
 */
const AuthStatus = () => {
    const { user, tenant, loading, isAuthenticated } = useAuth();
    
    const handleAutoLogin = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/v1/dev/auto-login');
            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('tenant_token', data.data.token);
                localStorage.setItem('tenant_id', data.data.user.tenantId);
                localStorage.setItem('user', JSON.stringify(data.data.user));
                
                console.log('✅ Auto-login successful, reloading...');
                window.location.reload();
            } else {
                console.error('❌ Auto-login failed:', data.message);
            }
        } catch (error) {
            console.error('❌ Auto-login error:', error);
        }
    };
    
    const handleClearAuth = () => {
        localStorage.removeItem('tenant_token');
        localStorage.removeItem('tenant_id');
        localStorage.removeItem('user');
        console.log('🗑️ Auth data cleared, reloading...');
        window.location.reload();
    };
    
    return (
        <Paper 
            elevation={3} 
            sx={{ 
                position: 'fixed', 
                top: 10, 
                right: 10, 
                p: 2, 
                minWidth: 300,
                zIndex: 9999,
                bgcolor: 'background.paper',
                border: '2px solid',
                borderColor: isAuthenticated ? 'success.main' : 'error.main'
            }}
        >
            <Typography variant="h6" gutterBottom>
                🔧 Auth Debug
            </Typography>
            
            <Box sx={{ mb: 1 }}>
                <Chip 
                    label={loading ? 'Loading...' : (isAuthenticated ? 'Authenticated' : 'Not Authenticated')}
                    color={loading ? 'default' : (isAuthenticated ? 'success' : 'error')}
                    size="small"
                />
            </Box>
            
            {user && (
                <Box sx={{ mb: 1 }}>
                    <Typography variant="body2">
                        <strong>User:</strong> {user.email}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Role:</strong> {user.role}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Tenant:</strong> {user.tenantId}
                    </Typography>
                </Box>
            )}
            
            {tenant && (
                <Box sx={{ mb: 1 }}>
                    <Typography variant="body2">
                        <strong>Tenant Name:</strong> {tenant.name}
                    </Typography>
                </Box>
            )}
            
            <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                <Button 
                    size="small" 
                    variant="contained" 
                    onClick={handleAutoLogin}
                    color="primary"
                >
                    🔄 Auto Login
                </Button>
                <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={handleClearAuth}
                    color="secondary"
                >
                    🗑️ Clear Auth
                </Button>
            </Box>
            
            <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
                LocalStorage tokens: {localStorage.getItem('tenant_token') ? '✅' : '❌'}
            </Typography>
        </Paper>
    );
};

export default AuthStatus;