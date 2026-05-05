import React, { useState } from 'react';
import { Box, Button, Typography, Alert, Card, CardContent } from '@mui/material';
import axios from 'axios';

/**
 * DEBUG COMPONENT - Raw Axios Usage Acceptable
 * 
 * This component intentionally uses raw axios calls for debugging purposes.
 * It bypasses RTK Query to test direct API communication and diagnose issues.
 * 
 * DO NOT use this pattern in production components - use RTK Query hooks instead.
 */
const DirectAPITest = () => {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const testDirectAPI = async () => {
        setLoading(true);
        try {
            console.log('🧪 Testing direct API call...');
            
            // Get token exactly like the frontend does
            const token = localStorage.getItem('token');
            const tenantToken = localStorage.getItem('tenant_token');
            
            console.log('🔑 Token available:', !!token);
            console.log('🏢 Tenant token available:', !!tenantToken);
            
            // Use the same token that the API service uses
            const authToken = tenantToken || token;
            console.log('🎯 Using token:', authToken ? 'Present' : 'Missing');
            
            // Make direct axios call to match API service behavior
            const response = await axios.get('http://localhost:5000/api/v1/announcements', {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            console.log('📡 Direct API response:', response);
            console.log('📊 Response data:', response.data);
            console.log('📈 Data type:', typeof response.data);
            console.log('📋 Is array:', Array.isArray(response.data));
            console.log('📏 Length:', Array.isArray(response.data) ? response.data.length : 'N/A');
            
            setResult({
                success: true,
                status: response.status,
                data: response.data,
                headers: response.headers,
                dataType: typeof response.data,
                isArray: Array.isArray(response.data),
                length: Array.isArray(response.data) ? response.data.length : 'N/A'
            });
            
        } catch (error) {
            console.error('❌ Direct API error:', error);
            setResult({
                success: false,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data,
                details: error
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                🔗 Direct API Test
            </Typography>
            
            <Button 
                variant="contained" 
                onClick={testDirectAPI}
                disabled={loading}
                sx={{ mb: 3 }}
            >
                {loading ? 'Testing...' : 'Test Direct API Call'}
            </Button>

            {result && (
                <Card>
                    <CardContent>
                        {result.success ? (
                            <Box>
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    ✅ Direct API call successful! Status: {result.status}
                                </Alert>
                                
                                <Typography variant="h6">Response Details:</Typography>
                                <Typography>Data Type: {result.dataType}</Typography>
                                <Typography>Is Array: {result.isArray ? 'Yes' : 'No'}</Typography>
                                <Typography>Length: {result.length}</Typography>
                                
                                {result.isArray && result.data.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="h6">Announcements Found:</Typography>
                                        {result.data.map((ann, index) => (
                                            <Box key={ann._id || index} sx={{ ml: 2, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {index + 1}. {ann.title}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Priority: {ann.priority}, Active: {ann.isActive ? 'Yes' : 'No'}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Target: {ann.targetAudience}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                                
                                {result.isArray && result.data.length === 0 && (
                                    <Alert severity="warning" sx={{ mt: 2 }}>
                                        ⚠️ API returned empty array - this explains why no data shows!
                                    </Alert>
                                )}
                                
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="h6">Raw Response:</Typography>
                                    <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', maxHeight: '300px', overflow: 'auto' }}>
                                        {JSON.stringify(result.data, null, 2)}
                                    </Typography>
                                </Box>
                            </Box>
                        ) : (
                            <Box>
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    ❌ Direct API call failed! Status: {result.status}
                                </Alert>
                                <Typography variant="h6">Error Details:</Typography>
                                <Typography color="error">{result.error}</Typography>
                                
                                {result.data && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="h6">Error Response:</Typography>
                                        <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                                            {JSON.stringify(result.data, null, 2)}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default DirectAPITest;