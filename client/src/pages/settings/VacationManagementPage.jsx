import React from 'react';
import { Box, Typography } from '@mui/material';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';

function VacationManagementPage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <BeachAccessOutlinedIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">Vacation Management</Typography>
            </Box>
        </Box>
    );
}

export default VacationManagementPage;
