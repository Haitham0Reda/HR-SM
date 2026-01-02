/**
 * Email Settings Page
 * 
 * Manages email-related settings including company email domain configuration
 * for automatic email generation when creating users.
 */

import React from 'react';
import {
    Box,
    Typography,
    Breadcrumbs,
    Link,
    Grid,
    Paper
} from '@mui/material';
import {
    NavigateNext,
    Home as HomeIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import CompanyEmailSettings from '../../components/CompanyEmailSettings';

const EmailSettingsPage = () => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();

    return (
        <Box sx={{ p: 3 }}>
            {/* Breadcrumbs */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon />
                    Email Settings
                </Typography>
                <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
                    <Link
                        component="button"
                        variant="body1"
                        onClick={() => navigate(getCompanyRoute('/'))}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            textDecoration: 'none',
                            color: 'inherit',
                            '&:hover': { textDecoration: 'underline' }
                        }}
                    >
                        <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                        Home
                    </Link>
                    <Link
                        component="button"
                        variant="body1"
                        onClick={() => navigate(getCompanyRoute('/settings'))}
                        sx={{
                            textDecoration: 'none',
                            color: 'inherit',
                            '&:hover': { textDecoration: 'underline' }
                        }}
                    >
                        Settings
                    </Link>
                    <Typography color="text.primary">Email Settings</Typography>
                </Breadcrumbs>
            </Box>

            {/* Page Description */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.50', borderLeft: 4, borderColor: 'primary.main' }}>
                <Typography variant="h6" gutterBottom>
                    Email Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Configure email settings for your organization, including the company email domain 
                    used for automatic email generation when creating new users.
                </Typography>
            </Paper>

            {/* Settings Content */}
            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <CompanyEmailSettings />
                </Grid>
                
                <Grid item xs={12} lg={4}>
                    {/* Additional email settings can be added here */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Quick Tips
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0 }}>
                            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                                Set up your company email domain to enable automatic email generation
                            </Typography>
                            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                                Users can still provide their own email addresses if needed
                            </Typography>
                            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                                Duplicate usernames will get numbered emails (e.g., john.doe1@company.com)
                            </Typography>
                            <Typography component="li" variant="body2">
                                Changes take effect immediately for new user creation
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default EmailSettingsPage;