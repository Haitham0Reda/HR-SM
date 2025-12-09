import React from 'react';
import { Box, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';

function EmailCreationPage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <EmailIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">Employee Email Creation</Typography>
            </Box>
        </Box>
    );
}

export default EmailCreationPage;
