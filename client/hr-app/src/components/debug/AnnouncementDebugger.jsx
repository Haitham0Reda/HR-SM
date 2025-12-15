import React, { useState } from 'react';
import { Box, Button, Typography, Alert, Card, CardContent } from '@mui/material';
import announcementService from '../../services/announcement.service';

const AnnouncementDebugger = () => {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const testAnnouncementService = async () => {
        setLoading(true);
        try {
            console.log('🧪 Testing announcement service...');
            const response = await announcementService.getAll();
            console.log('📡 Raw response:', response);
            
            setResult({
                success: true,
                data: response,
                type: Array.isArray(response) ? 'array' : typeof response,
                length: Array.isArray(response) ? response.length : 'N/A'
            });
        } catch (error) {
            console.error('❌ Service error:', error);
            setResult({
                success: false,
                error: error.message,
                details: error
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                🔧 Announcement Service Debugger
            </Typography>
            
            <Button 
                variant="contained" 
                onClick={testAnnouncementService}
                disabled={loading}
                sx={{ mb: 3 }}
            >
                {loading ? 'Testing...' : 'Test Announcement Service'}
            </Button>

            {result && (
                <Card>
                    <CardContent>
                        {result.success ? (
                            <Box>
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    ✅ Service call successful!
                                </Alert>
                                <Typography variant="h6">Response Details:</Typography>
                                <Typography>Type: {result.type}</Typography>
                                <Typography>Length: {result.length}</Typography>
                                
                                {Array.isArray(result.data) && result.data.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="h6">Announcements:</Typography>
                                        {result.data.map((ann, index) => (
                                            <Box key={index} sx={{ ml: 2, mb: 1 }}>
                                                <Typography variant="body1">
                                                    {index + 1}. {ann.title}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Type: {ann.type}, Active: {ann.isActive ? 'Yes' : 'No'}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                                
                                {Array.isArray(result.data) && result.data.length === 0 && (
                                    <Alert severity="warning" sx={{ mt: 2 }}>
                                        ⚠️ Service returned empty array - this is why no data shows!
                                    </Alert>
                                )}
                                
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption">
                                        Raw data: {JSON.stringify(result.data, null, 2)}
                                    </Typography>
                                </Box>
                            </Box>
                        ) : (
                            <Box>
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    ❌ Service call failed!
                                </Alert>
                                <Typography variant="h6">Error Details:</Typography>
                                <Typography color="error">{result.error}</Typography>
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption">
                                        Full error: {JSON.stringify(result.details, null, 2)}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default AnnouncementDebugger;