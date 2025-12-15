import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    TextField,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import announcementService from '../../services/announcement.service';
import notificationService from '../../services/notification.service';
import api from '../../services/api';

const APIDebugger = () => {
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState({});

    const testAPI = async (apiName, apiCall) => {
        setLoading(prev => ({ ...prev, [apiName]: true }));
        try {
            const startTime = Date.now();
            const result = await apiCall();
            const endTime = Date.now();
            
            setResults(prev => ({
                ...prev,
                [apiName]: {
                    success: true,
                    data: result,
                    duration: endTime - startTime,
                    timestamp: new Date().toISOString()
                }
            }));
        } catch (error) {
            setResults(prev => ({
                ...prev,
                [apiName]: {
                    success: false,
                    error: {
                        message: error.message,
                        status: error.status,
                        data: error.data
                    },
                    timestamp: new Date().toISOString()
                }
            }));
        } finally {
            setLoading(prev => ({ ...prev, [apiName]: false }));
        }
    };

    const checkAuthStatus = () => {
        const token = localStorage.getItem('token');
        const tenantToken = localStorage.getItem('tenant_token');
        
        setResults(prev => ({
            ...prev,
            auth: {
                success: !!(token || tenantToken),
                data: {
                    hasToken: !!token,
                    hasTenantToken: !!tenantToken,
                    tokenLength: token ? token.length : 0,
                    tenantTokenLength: tenantToken ? tenantToken.length : 0
                },
                timestamp: new Date().toISOString()
            }
        }));
    };

    const testDirectAPI = async (endpoint) => {
        const apiName = `direct-${endpoint}`;
        await testAPI(apiName, async () => {
            const response = await api.get(endpoint);
            return response;
        });
    };

    const renderResult = (apiName, result) => {
        if (!result) return null;

        return (
            <Accordion key={apiName}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6">{apiName}</Typography>
                        <Chip 
                            label={result.success ? 'SUCCESS' : 'ERROR'} 
                            color={result.success ? 'success' : 'error'}
                            size="small"
                        />
                        {result.duration && (
                            <Chip 
                                label={`${result.duration}ms`} 
                                size="small" 
                                variant="outlined"
                            />
                        )}
                    </Box>
                </AccordionSummary>
                <AccordionDetails>
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                            {result.timestamp}
                        </Typography>
                    </Box>
                    
                    {result.success ? (
                        <Box>
                            <Typography variant="subtitle2" color="success.main">
                                ✅ Success
                            </Typography>
                            <TextField
                                multiline
                                fullWidth
                                rows={6}
                                value={JSON.stringify(result.data, null, 2)}
                                variant="outlined"
                                size="small"
                                sx={{ mt: 1, fontFamily: 'monospace' }}
                                InputProps={{ readOnly: true }}
                            />
                            {Array.isArray(result.data) && (
                                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                                    Array with {result.data.length} items
                                </Typography>
                            )}
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="subtitle2" color="error.main">
                                ❌ Error
                            </Typography>
                            <Alert severity="error" sx={{ mt: 1 }}>
                                <Typography variant="body2">
                                    <strong>Message:</strong> {result.error.message}
                                </Typography>
                                {result.error.status && (
                                    <Typography variant="body2">
                                        <strong>Status:</strong> {result.error.status}
                                    </Typography>
                                )}
                                {result.error.data && (
                                    <TextField
                                        multiline
                                        fullWidth
                                        rows={3}
                                        value={JSON.stringify(result.error.data, null, 2)}
                                        variant="outlined"
                                        size="small"
                                        sx={{ mt: 1, fontFamily: 'monospace' }}
                                        InputProps={{ readOnly: true }}
                                    />
                                )}
                            </Alert>
                        </Box>
                    )}
                </AccordionDetails>
            </Accordion>
        );
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                🔧 API Debugger
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
                Use this tool to debug frontend API issues. Test authentication, services, and direct API calls.
            </Typography>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Authentication Status
                    </Typography>
                    <Button 
                        variant="outlined" 
                        onClick={checkAuthStatus}
                        sx={{ mr: 1 }}
                    >
                        Check Auth Status
                    </Button>
                </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Service Tests
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button 
                            variant="contained" 
                            onClick={() => testAPI('announcements-service', () => announcementService.getAll())}
                            disabled={loading['announcements-service']}
                        >
                            Test Announcements Service
                        </Button>
                        <Button 
                            variant="contained" 
                            onClick={() => testAPI('notifications-service', () => notificationService.getAll())}
                            disabled={loading['notifications-service']}
                        >
                            Test Notifications Service
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Direct API Tests
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button 
                            variant="outlined" 
                            onClick={() => testDirectAPI('/announcements')}
                            disabled={loading['direct-/announcements']}
                        >
                            GET /announcements
                        </Button>
                        <Button 
                            variant="outlined" 
                            onClick={() => testDirectAPI('/notifications')}
                            disabled={loading['direct-/notifications']}
                        >
                            GET /notifications
                        </Button>
                        <Button 
                            variant="outlined" 
                            onClick={() => testDirectAPI('/document-templates')}
                            disabled={loading['direct-/document-templates']}
                        >
                            GET /document-templates
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Test Results
                </Typography>
                {Object.keys(results).length === 0 ? (
                    <Alert severity="info">
                        No tests run yet. Click the buttons above to start testing.
                    </Alert>
                ) : (
                    Object.entries(results).map(([apiName, result]) => 
                        renderResult(apiName, result)
                    )
                )}
            </Box>
        </Box>
    );
};

export default APIDebugger;