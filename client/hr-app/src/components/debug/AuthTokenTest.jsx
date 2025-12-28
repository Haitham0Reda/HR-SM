import React, { useState } from 'react';
import { Box, Button, Typography, Alert, Card, CardContent } from '@mui/material';
import { useAuth } from '../../store/providers/ReduxAuthProvider';

const AuthTokenTest = () => {
    const [tokenInfo, setTokenInfo] = useState(null);
    const { user } = useAuth();

    const checkTokens = () => {
        const token = localStorage.getItem('token');
        const tenantToken = localStorage.getItem('tenant_token');
        
        console.log('🔍 Checking tokens...');
        console.log('📋 Regular token:', token ? 'Present' : 'Missing');
        console.log('🏢 Tenant token:', tenantToken ? 'Present' : 'Missing');
        console.log('👤 User from context:', user);
        
        // Try to decode JWT (basic decode, not verification)
        let decodedToken = null;
        let decodedTenantToken = null;
        
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                decodedToken = payload;
                console.log('🔓 Decoded token:', payload);
            } catch (e) {
                console.error('❌ Failed to decode token:', e);
            }
        }
        
        if (tenantToken) {
            try {
                const payload = JSON.parse(atob(tenantToken.split('.')[1]));
                decodedTenantToken = payload;
                console.log('🔓 Decoded tenant token:', payload);
            } catch (e) {
                console.error('❌ Failed to decode tenant token:', e);
            }
        }
        
        setTokenInfo({
            hasToken: !!token,
            hasTenantToken: !!tenantToken,
            user,
            decodedToken,
            decodedTenantToken,
            tokenLength: token ? token.length : 0,
            tenantTokenLength: tenantToken ? tenantToken.length : 0
        });
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                🔐 Authentication Token Test
            </Typography>
            
            <Button 
                variant="contained" 
                onClick={checkTokens}
                sx={{ mb: 3 }}
            >
                Check Tokens
            </Button>

            {tokenInfo && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Token Status:
                        </Typography>
                        
                        <Alert severity={tokenInfo.hasToken ? 'success' : 'error'} sx={{ mb: 2 }}>
                            Regular Token: {tokenInfo.hasToken ? 'Present' : 'Missing'} 
                            {tokenInfo.hasToken && ` (${tokenInfo.tokenLength} chars)`}
                        </Alert>
                        
                        <Alert severity={tokenInfo.hasTenantToken ? 'info' : 'warning'} sx={{ mb: 2 }}>
                            Tenant Token: {tokenInfo.hasTenantToken ? 'Present' : 'Missing'}
                            {tokenInfo.hasTenantToken && ` (${tokenInfo.tenantTokenLength} chars)`}
                        </Alert>
                        
                        {tokenInfo.user && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="h6">User Context:</Typography>
                                <Typography>Email: {tokenInfo.user.email}</Typography>
                                <Typography>Role: {tokenInfo.user.role}</Typography>
                                <Typography>Tenant ID: {tokenInfo.user.tenantId}</Typography>
                            </Box>
                        )}
                        
                        {tokenInfo.decodedToken && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="h6">Decoded Token:</Typography>
                                <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                                    {JSON.stringify(tokenInfo.decodedToken, null, 2)}
                                </Typography>
                            </Box>
                        )}
                        
                        {tokenInfo.decodedTenantToken && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="h6">Decoded Tenant Token:</Typography>
                                <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                                    {JSON.stringify(tokenInfo.decodedTenantToken, null, 2)}
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default AuthTokenTest;
