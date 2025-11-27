import React from 'react';
import { Box, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

function EmployeeOfMonthPage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <EmojiEventsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">Employee of the Month</Typography>
            </Box>
        </Box>
    );
}

export default EmployeeOfMonthPage;
