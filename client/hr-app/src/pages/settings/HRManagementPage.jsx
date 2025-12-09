import React from 'react';
import { Box, Typography } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';

function HRManagementPage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <GroupIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">HR Management Settings</Typography>
            </Box>
        </Box>
    );
}

export default HRManagementPage;
