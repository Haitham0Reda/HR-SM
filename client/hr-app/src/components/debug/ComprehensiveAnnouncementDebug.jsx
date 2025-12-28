import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, Card, CardContent, Divider } from '@mui/material';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import announcementService from '../../services/announcement.service';
import axios from 'axios';

const ComprehensiveAnnouncementDebug = () => {
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const runAllTests = async () => {
        setLoading(true);
        const testResults = {};

        try {
            // Test 1: Check tokens
            console.log('🔍 Test 1: Checking tokens...');
            const token = localStorage.getItem('token');
            const tenantToken = localStorage.getItem('tenant_token');
            
            testResults.tokens = {
                hasToken: !!token,
                hasTenantToken: !!tenantToken,
                tokenLength: token ? token.length : 0,
                tenantTokenLength: tenantToken ? tenantToken.length : 0
            };

            // Decode tokens
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    testResults.tokens.decodedToken = payload;
                } catch (e) {
                    testResults.tokens.tokenError = e.message;
                }
            }

            // Test 2: User context
            console.log('👤 Test 2: Checking user context...');
            testResults.userContext = {
                user: user,
                hasUser: !!user,
                userEmail: user?.email,
                userRole: user?.role,
                userTenantId: user?.tenantId
            };

            // Test 3: Direct axios call
            console.log('🔗 Test 3: Direct axios call...');
            try {
                const authToken = tenantToken || token;
                const directResponse = await axios.get('http://localhost:5000/api/v1/announcements', {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                testResults.directAPI = {
                    success: true,
                    status: directResponse.status,
                    data: directResponse.data,
                    dataType: typeof directResponse.data,
                    isArray: Array.isArray(directResponse.data),
                    length: Array.isArray(directResponse.data) ? directResponse.data.length : 'N/A'
                };
            } catch (error) {
                testResults.directAPI = {
                    success: false,
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data
                };
            }

            // Test 4: Service call
            console.log('🛠️ Test 4: Service call...');
            try {
                const serviceResponse = await announcementService.getAll();
                testResults.serviceAPI = {
                    success: true,
                    data: serviceResponse,
                    dataType: typeof serviceResponse,
                    isArray: Array.isArray(serviceResponse),
                    length: Array.isArray(serviceResponse) ? serviceResponse.length : 'N/A'
                };
            } catch (error) {
                testResults.serviceAPI = {
                    success: false,
                    error: error.message,
                    details: error
                };
            }

            // Test 5: Compare responses
            console.log('🔄 Test 5: Comparing responses...');
            if (testResults.directAPI.success && testResults.serviceAPI.success) {
                testResults.comparison = {
                    directLength: testResults.directAPI.length,
                    serviceLength: testResults.serviceAPI.length,
                    match: testResults.directAPI.length === testResults.serviceAPI.length,
                    directFirst: testResults.directAPI.data[0],
                    serviceFirst: testResults.serviceAPI.data[0]
                };
            }

        } catch (error) {
            testResults.error = error.message;
        }

        setResults(testResults);
        setLoading(false);
    };

    useEffect(() => {
        runAllTests();
    }, []);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                🔬 Comprehensive Announcement Debug
            </Typography>
            
            <Button 
                variant="contained" 
                onClick={runAllTests}
                disabled={loading}
                sx={{ mb: 3 }}
            >
                {loading ? 'Running Tests...' : 'Run All Tests'}
            </Button>

            {Object.keys(results).length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    
                    {/* Token Test */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                🔑 Token Test
                            </Typography>
                            {results.tokens && (
                                <Box>
                                    <Alert severity={results.tokens.hasToken ? 'success' : 'error'}>
                                        Token: {results.tokens.hasToken ? 'Present' : 'Missing'}
                                    </Alert>
                                    {results.tokens.decodedToken && (
                                        <Box sx={{ mt: 1 }}>
                                            <Typography variant="body2">Decoded Token:</Typography>
                                            <Typography variant="caption" component="pre">
                                                {JSON.stringify(results.tokens.decodedToken, null, 2)}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* User Context Test */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                👤 User Context Test
                            </Typography>
                            {results.userContext && (
                                <Box>
                                    <Alert severity={results.userContext.hasUser ? 'success' : 'error'}>
                                        User Context: {results.userContext.hasUser ? 'Available' : 'Missing'}
                                    </Alert>
                                    {results.userContext.user && (
                                        <Box sx={{ mt: 1 }}>
                                            <Typography>Email: {results.userContext.userEmail}</Typography>
                                            <Typography>Role: {results.userContext.userRole}</Typography>
                                            <Typography>Tenant ID: {results.userContext.userTenantId}</Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* Direct API Test */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                🔗 Direct API Test
                            </Typography>
                            {results.directAPI && (
                                <Box>
                                    <Alert severity={results.directAPI.success ? 'success' : 'error'}>
                                        Direct API: {results.directAPI.success ? `Success (${results.directAPI.length} items)` : 'Failed'}
                                    </Alert>
                                    {results.directAPI.success && results.directAPI.data && (
                                        <Box sx={{ mt: 1 }}>
                                            <Typography>Status: {results.directAPI.status}</Typography>
                                            <Typography>Type: {results.directAPI.dataType}</Typography>
                                            <Typography>Length: {results.directAPI.length}</Typography>
                                            {results.directAPI.length > 0 && (
                                                <Box sx={{ mt: 1 }}>
                                                    <Typography variant="body2">First Item:</Typography>
                                                    <Typography variant="caption" component="pre" sx={{ maxHeight: '200px', overflow: 'auto' }}>
                                                        {JSON.stringify(results.directAPI.data[0], null, 2)}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    )}
                                    {!results.directAPI.success && (
                                        <Typography color="error">Error: {results.directAPI.error}</Typography>
                                    )}
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* Service API Test */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                🛠️ Service API Test
                            </Typography>
                            {results.serviceAPI && (
                                <Box>
                                    <Alert severity={results.serviceAPI.success ? 'success' : 'error'}>
                                        Service API: {results.serviceAPI.success ? `Success (${results.serviceAPI.length} items)` : 'Failed'}
                                    </Alert>
                                    {results.serviceAPI.success && (
                                        <Box sx={{ mt: 1 }}>
                                            <Typography>Type: {results.serviceAPI.dataType}</Typography>
                                            <Typography>Length: {results.serviceAPI.length}</Typography>
                                        </Box>
                                    )}
                                    {!results.serviceAPI.success && (
                                        <Typography color="error">Error: {results.serviceAPI.error}</Typography>
                                    )}
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* Comparison */}
                    {results.comparison && (
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    🔄 Response Comparison
                                </Typography>
                                <Alert severity={results.comparison.match ? 'success' : 'warning'}>
                                    Direct API: {results.comparison.directLength} items | 
                                    Service API: {results.comparison.serviceLength} items | 
                                    Match: {results.comparison.match ? 'Yes' : 'No'}
                                </Alert>
                            </CardContent>
                        </Card>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default ComprehensiveAnnouncementDebug;
