import React from 'react';
import { Box, Typography } from '@mui/material';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';

function RequestControlPage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <ToggleOnIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">Request Submission Control</Typography>
            </Box>
        </Box>
    );
}

export default RequestControlPage;
