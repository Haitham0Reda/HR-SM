import React, { useContext } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Button,
    Breadcrumbs,
    Link,
    Alert
} from '@mui/material';
import {
    Settings,
    People,
    Schedule,
    Assessment,
    Build,
    School,
    Email,
    PhoneAndroid,
    Celebration,
    Warning,
    Security,
    Backup,
    Notifications,
    Language,
    Palette,
    Business,
    NavigateNext
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DashboardSidebarContext from '../../context/DashboardSidebarContext';
import { useAuth } from '../../hooks/useAuth';

const SystemSettingsPage = () => {
    const navigate = useNavigate();
    const sidebarContext = useContext(DashboardSidebarContext);
    const { user } = useAuth();
    const userRole = user?.role || 'employee';

    const settingsCategories = [
        {
            title: 'System Settings',
            icon: <Settings />,
            color: '#2196F3',
            path: '/app/settings/system',
            description: 'Configure system-wide settings'
        },
        {
            title: 'HR Settings',
            icon: <People />,
            color: '#4CAF50',
            path: '/app/settings/hr',
            description: 'Human resources configuration'
        },
        {
            title: 'Flexible Hours',
            icon: <Schedule />,
            color: '#00BCD4',
            path: '/app/settings/flexible-hours',
            description: 'Configure flexible working hours'
        },
        {
            title: 'Custom Reports',
            icon: <Assessment />,
            color: '#FFC107',
            path: '/app/settings/reports',
            description: 'Create and manage custom reports'
        },
        {
            title: 'Maintenance Mode',
            icon: <Build />,
            color: '#F44336',
            path: '/app/settings/maintenance',
            description: 'Enable or disable maintenance mode'
        },
        {
            title: 'Academic System Integration',
            icon: <School />,
            color: '#2196F3',
            path: '/app/settings/academic',
            description: 'Integrate with academic systems'
        },
        {
            title: 'Employee Email Creation',
            icon: <Email />,
            color: '#00BCD4',
            path: '/app/settings/email',
            description: 'Configure employee email settings'
        },
        {
            title: 'Mobile App Settings',
            icon: <PhoneAndroid />,
            color: '#00BCD4',
            path: '/app/settings/mobile',
            description: 'Mobile application configuration'
        },
        {
            title: 'UI Settings',
            icon: <Palette />,
            color: '#2196F3',
            path: '/app/settings/ui',
            description: 'User interface customization'
        },
        {
            title: 'Seasonal Decorations',
            icon: <Celebration />,
            color: '#00BCD4',
            path: '/app/settings/decorations',
            description: 'Holiday and seasonal themes'
        },
        {
            title: 'Console Warning',
            icon: <Warning />,
            color: '#FFC107',
            path: '/app/settings/console',
            description: 'Console warning configuration'
        },
        {
            title: 'Security Settings',
            icon: <Security />,
            color: '#9C27B0',
            path: '/app/security/settings',
            description: 'Security and authentication settings'
        },
        {
            title: 'Backup Management',
            icon: <Backup />,
            color: '#607D8B',
            path: '/app/backups',
            description: 'Database and file backups'
        },
        {
            title: 'Notification Settings',
            icon: <Notifications />,
            color: '#FF5722',
            path: '/app/settings/notifications',
            description: 'Configure system notifications'
        },
        {
            title: 'Language Settings',
            icon: <Language />,
            color: '#3F51B5',
            path: '/app/settings/language',
            description: 'Multi-language configuration'
        },
        {
            title: 'Organization Settings',
            icon: <Business />,
            color: '#795548',
            path: '/app/settings/organization',
            description: 'Company and department settings'
        }
    ];

    const handleNavigate = (path) => {
        navigate(path);
    };

    const toggleSystemSettingsMenu = () => {
        if (sidebarContext && sidebarContext.onPageItemClick) {
            console.log('Attempting to toggle System Settings menu');
            console.log('Sidebar context:', sidebarContext);
            
            // Try to expand the sidebar first if it's collapsed
            if (sidebarContext.mini && sidebarContext.setExpanded) {
                console.log('Expanding sidebar first');
                sidebarContext.setExpanded(true);
            }
            
            // Toggle the system settings menu in the sidebar
            sidebarContext.onPageItemClick('system-settings', true);
            
            // Also try to ensure the menu is expanded
            setTimeout(() => {
                if (sidebarContext.onPageItemClick) {
                    sidebarContext.onPageItemClick('system-settings', true);
                }
            }, 300);
        } else {
            console.log('Sidebar context not available or missing onPageItemClick');
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Breadcrumbs */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" fontWeight="bold">Settings</Typography>
                <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
                    <Link
                        underline="hover"
                        color="inherit"
                        href="/app"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate('/app');
                        }}
                        sx={{ cursor: 'pointer' }}
                    >
                        Home
                    </Link>
                    <Typography color="text.primary">Settings</Typography>
                </Breadcrumbs>
            </Box>

            {/* Toggle Menu Button - Only show for admin users */}
            {userRole === 'admin' ? (
                <Box sx={{ mb: 3 }}>
                    <Button 
                        variant="contained" 
                        onClick={toggleSystemSettingsMenu}
                        sx={{ 
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': {
                                bgcolor: 'primary.dark',
                            }
                        }}
                    >
                        Toggle System Settings Menu
                    </Button>
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                        Click this button to open/close the System Settings dropdown menu in the sidebar
                    </Typography>
                </Box>
            ) : (
                <Alert severity="info" sx={{ mb: 3 }}>
                    The System Settings menu is only available for administrators. You are currently logged in as {userRole}.
                </Alert>
            )}

            {/* Settings Menu Label */}
            <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                Settings Menu
            </Typography>

            {/* Settings Grid */}
            <Grid container spacing={2}>
                {settingsCategories.map((setting, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                        <Card
                            elevation={2}
                            sx={{
                                height: '100%',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 4
                                }
                            }}
                            onClick={() => handleNavigate(setting.path)}
                        >
                            <CardContent>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 2,
                                        p: 2,
                                        borderRadius: 2,
                                        backgroundColor: setting.color,
                                        color: 'white'
                                    }}
                                >
                                    {React.cloneElement(setting.icon, { sx: { fontSize: 40 } })}
                                </Box>
                                <Typography
                                    variant="h6"
                                    align="center"
                                    sx={{
                                        fontWeight: 'medium',
                                        mb: 1,
                                        fontSize: '1rem'
                                    }}
                                >
                                    {setting.title}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    align="center"
                                    color="text.secondary"
                                    sx={{ fontSize: '0.875rem' }}
                                >
                                    {setting.description}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default SystemSettingsPage;