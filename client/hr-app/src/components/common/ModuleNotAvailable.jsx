import { Box, Typography, Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ModuleNotAvailable = ({ moduleName = 'This module' }) => {
    const navigate = useNavigate();

    return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Module Not Available
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    {moduleName} is not enabled for your organization.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Please contact your administrator to enable this module.
                </Typography>
            </Alert>
            
            <Button 
                variant="contained" 
                onClick={() => navigate('/dashboard')}
                sx={{ mt: 2 }}
            >
                Return to Dashboard
            </Button>
        </Box>
    );
};

export default ModuleNotAvailable;