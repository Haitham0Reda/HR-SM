import React from 'react';
import { Box, Typography } from '@mui/material';
import PolicyIcon from '@mui/icons-material/Policy';

function MixedVacationPage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <PolicyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">Mixed Vacation Policies</Typography>
            </Box>
        </Box>
    );
}

export default MixedVacationPage;
