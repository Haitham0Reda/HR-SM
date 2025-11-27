import React from 'react';
import { Box, Typography } from '@mui/material';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';

function EmailManagementPage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <ManageAccountsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">Employee Email Management</Typography>
            </Box>
        </Box>
    );
}

export default EmailManagementPage;
