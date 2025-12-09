import React from 'react';
import { Box, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';

function NotificationsPage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <NotificationsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">System Notifications</Typography>
            </Box>
        </Box>
    );
}

export default NotificationsPage;
