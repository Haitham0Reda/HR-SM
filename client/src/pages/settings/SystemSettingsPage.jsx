import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Breadcrumbs, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import BusinessIcon from '@mui/icons-material/Business';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BuildIcon from '@mui/icons-material/Build';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import EmailIcon from '@mui/icons-material/Email';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import WarningIcon from '@mui/icons-material/Warning';
import CelebrationIcon from '@mui/icons-material/Celebration';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';

function SystemSettingsPage() {
    const navigate = useNavigate();

    const settingsCards = [
        {
            title: 'System Settings',
            icon: <SettingsIcon sx={{ fontSize: 24 }} />,
            color: '#2196f3',
            path: '/app/system-settings',
        },
        {
            title: 'HR Settings',
            icon: <BusinessIcon sx={{ fontSize: 24 }} />,
            color: '#4caf50',
            path: '/app/system-settings/hr-management',
        },
        {
            title: 'Flexible Hours',
            icon: <AccessTimeIcon sx={{ fontSize: 24 }} />,
            color: '#00bcd4',
            path: '/app/system-settings/work-schedules',
        },
        {
            title: 'Custom Reports',
            icon: <AssessmentIcon sx={{ fontSize: 24 }} />,
            color: '#ff9800',
            path: '/app/reports',
        },
        {
            title: 'Maintenance Mode',
            icon: <BuildIcon sx={{ fontSize: 24 }} />,
            color: '#f44336',
            path: '/app/system-settings/maintenance',
        },
        {
            title: 'Academic System Integration',
            icon: <IntegrationInstructionsIcon sx={{ fontSize: 24 }} />,
            color: '#2196f3',
            path: '/app/system-settings',
        },
        {
            title: 'Seasonal Decorations',
            icon: <CelebrationIcon sx={{ fontSize: 24 }} />,
            color: '#e0e0e0',
            path: '/app/system-settings/seasonal',
        },
        {
            title: 'Console Warning',
            icon: <WarningIcon sx={{ fontSize: 24 }} />,
            color: '#e0e0e0',
            path: '/app/system-settings',
        },
        {
            title: 'UI Settings',
            icon: <SettingsSuggestIcon sx={{ fontSize: 24 }} />,
            color: '#e0e0e0',
            path: '/app/system-settings',
        },
        {
            title: 'Employee Email Creation',
            icon: <EmailIcon sx={{ fontSize: 24 }} />,
            color: '#e0e0e0',
            path: '/app/system-settings/email-creation',
        },
        {
            title: 'Mobile App Settings',
            icon: <PhoneAndroidIcon sx={{ fontSize: 24 }} />,
            color: '#e0e0e0',
            path: '/app/system-settings',
        },
    ];

    const handleCardClick = (path) => {
        navigate(path);
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 500 }}>
                    System Settings
                </Typography>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
                    <Link
                        underline="hover"
                        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        color="inherit"
                        onClick={() => navigate('/app/dashboard')}
                    >
                        <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                        Home
                    </Link>
                    <Typography color="text.primary">System Settings</Typography>
                </Breadcrumbs>
            </Box>

            {/* Settings Menu Label */}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Settings Menu
            </Typography>

            {/* Settings Cards Grid */}
            <Grid container spacing={2}>
                {settingsCards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                        <Card
                            sx={{
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                bgcolor: card.color,
                                color: card.color === '#e0e0e0' ? 'text.primary' : 'white',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 4,
                                },
                            }}
                            onClick={() => handleCardClick(card.path)}
                        >
                            <CardContent
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    py: 2,
                                }}
                            >
                                {card.icon}
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {card.title}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}

export default SystemSettingsPage;
