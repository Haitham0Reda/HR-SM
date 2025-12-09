import React from 'react';
import { Box, Typography } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

function VacationBalancesPage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <AccountBalanceIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">Manage Vacation Balances</Typography>
            </Box>
        </Box>
    );
}

export default VacationBalancesPage;
