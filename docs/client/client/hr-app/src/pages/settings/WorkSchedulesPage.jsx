import React from 'react';
import { Box, Typography } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';

function WorkSchedulesPage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <ScheduleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">Work Schedules</Typography>
            </Box>
        </Box>
    );
}

export default WorkSchedulesPage;
