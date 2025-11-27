import React from 'react';
import { Box, Typography } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';

function MaintenancePage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <BuildIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">Maintenance Settings</Typography>
            </Box>
        </Box>
    );
}

export default MaintenancePage;
