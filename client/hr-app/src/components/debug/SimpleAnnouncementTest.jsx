import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, Card, CardContent } from '@mui/material';
import announcementService from '../../services/announcement.service';

const SimpleAnnouncementTest = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const testAPI = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('🧪 Testing announcement API...');
            const response = await announcementService.getAll();
            
            console.log('📡 Raw response:', response);
            console.log('📊 Response type:', typeof response);
            console.log('📈 Is array:', Array.isArray(response));
            console.log('📋 Length:', Array.isArray(response) ? response.length : 'N/A');
            
            setData({
                response,
                type: typeof response,
                isArray: Array.isArray(response),
                length: Array.isArray(response) ? response.length : 'N/A'
            });
        } catch (err) {
            console.error('❌ Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        testAPI();
    }, []);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                🔬 Simple Announcement API Test
            </Typography>
            
            <Button 
                variant="contained" 
                onClick={testAPI}
                disabled={loading}
                sx={{ mb: 3 }}
            >
                {loading ? 'Testing...' : 'Test API'}
            </Button>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Error: {error}
                </Alert>
            )}

            {data && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            API Response Analysis:
                        </Typography>
                        <Typography>Type: {data.type}</Typography>
                        <Typography>Is Array: {data.isArray ? 'Yes' : 'No'}</Typography>
                        <Typography>Length: {data.length}</Typography>
                        
                        {data.isArray && data.response.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h6">Announcements Found:</Typography>
                                {data.response.map((ann, index) => (
                                    <Box key={ann._id || index} sx={{ ml: 2, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                                        <Typography variant="body1" fontWeight="bold">
                                            {index + 1}. {ann.title}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Priority: {ann.priority}, Active: {ann.isActive ? 'Yes' : 'No'}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Content: {ann.content?.substring(0, 100)}...
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        )}
                        
                        {data.isArray && data.response.length === 0 && (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                                ⚠️ API returned empty array - no announcements found
                            </Alert>
                        )}
                        
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
                                {JSON.stringify(data.response, null, 2)}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default SimpleAnnouncementTest;