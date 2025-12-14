import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import vacationService from '../../services/vacation.service';

const VacationDebug = () => {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const testVacationService = async () => {
        try {
            setLoading(true);
            console.log('🧪 Testing vacation service...');
            
            const response = await vacationService.getAll();
            
            console.log('🔍 Vacation Service Test Results:');
            console.log('Raw response:', response);
            console.log('Response type:', typeof response);
            console.log('Response keys:', response ? Object.keys(response) : 'null');
            console.log('Response.data:', response?.data);
            console.log('Response.data type:', typeof response?.data);
            console.log('Response.data length:', response?.data?.length);
            
            setResult({
                raw: response,
                type: typeof response,
                keys: response ? Object.keys(response) : null,
                data: response?.data,
                dataType: typeof response?.data,
                dataLength: response?.data?.length
            });
            
        } catch (error) {
            console.error('❌ Vacation service test failed:', error);
            setResult({ error: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Vacation Service Debug
            </Typography>
            
            <Button 
                variant="contained" 
                onClick={testVacationService}
                disabled={loading}
                sx={{ mb: 3 }}
            >
                {loading ? 'Testing...' : 'Test Vacation Service'}
            </Button>
            
            {result && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="h6">Results:</Typography>
                    <pre style={{ 
                        background: '#f5f5f5', 
                        padding: '10px', 
                        borderRadius: '5px',
                        overflow: 'auto',
                        fontSize: '12px'
                    }}>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </Box>
            )}
        </Box>
    );
};

export default VacationDebug;