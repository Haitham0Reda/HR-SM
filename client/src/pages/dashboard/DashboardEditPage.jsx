/**
 * Dashboard Edit Page
 * 
 * Admin page for editing dashboard settings and configurations:
 * - Employee of the Month selection
 * - Dashboard widgets visibility
 * - Quick action cards configuration
 * - Announcement settings
 * - Dashboard layout preferences
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Grid,
    Switch,
    FormControlLabel,
    Card,
    CardContent,
    Divider,
    MenuItem,
    Avatar,
    Chip,
    IconButton,
    Autocomplete,
} from '@mui/material';
import {
    Save as SaveIcon,
    Cancel as CancelIcon,
    EmojiEvents as TrophyIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import Loading from '../../components/common/Loading';
import { userService, dashboardService } from '../../services';

const DashboardEditPage = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useNotification();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState([]);

    // Dashboard configuration state
    const [config, setConfig] = useState({
        employeeOfTheMonth: {
            enabled: true,
            selectedEmployee: null,
            month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        },
        widgets: {
            todayAttendance: true,
            quickActions: true,
            announcements: true,
        },
        quickActionCards: {
            attendance: true,
            vacations: true,
            permissions: true,
            forgetCheck: true,
            sickLeave: true,
            profile: true,
        },
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch users for employee of the month selection
            const usersData = await userService.getAll();
            setUsers(usersData.filter(u => u.role === 'employee'));

            // Fetch existing dashboard configuration from API
            const dashboardConfig = await dashboardService.getConfig();
            if (dashboardConfig) {
                setConfig(dashboardConfig);
            }
        } catch (error) {
            showError('Failed to load dashboard configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Save dashboard configuration to API
            await dashboardService.updateConfig(config);

            showSuccess('Dashboard configuration saved successfully');
            navigate('/app/dashboard');
        } catch (error) {
            showError('Failed to save dashboard configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        navigate('/app/dashboard');
    };

    const handleEmployeeSelect = (event, newValue) => {
        setConfig(prev => ({
            ...prev,
            employeeOfTheMonth: {
                ...prev.employeeOfTheMonth,
                selectedEmployee: newValue,
            },
        }));
    };

    const handleWidgetToggle = (widget) => {
        setConfig(prev => ({
            ...prev,
            widgets: {
                ...prev.widgets,
                [widget]: !prev.widgets[widget],
            },
        }));
    };

    const handleQuickActionToggle = (action) => {
        setConfig(prev => ({
            ...prev,
            quickActionCards: {
                ...prev.quickActionCards,
                [action]: !prev.quickActionCards[action],
            },
        }));
    };

    if (loading) return <Loading />;

    return (
        <Box
            sx={{
                p: { xs: 2, sm: 3, md: 4 },
                maxWidth: 1400,
                mx: 'auto',
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}
                >
                    Edit Dashboard Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Customize dashboard settings, widgets, and employee of the month
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Employee of the Month Section */}
                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <TrophyIcon sx={{ fontSize: 32, mr: 2, color: 'secondary.main' }} />
                            <Typography variant="h6" fontWeight="600">
                                Employee of the Month
                            </Typography>
                        </Box>
                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={config.employeeOfTheMonth.enabled}
                                            onChange={(e) =>
                                                setConfig(prev => ({
                                                    ...prev,
                                                    employeeOfTheMonth: {
                                                        ...prev.employeeOfTheMonth,
                                                        enabled: e.target.checked,
                                                    },
                                                }))
                                            }
                                        />
                                    }
                                    label="Display Employee of the Month section"
                                />
                            </Grid>

                            {config.employeeOfTheMonth.enabled && (
                                <>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            fullWidth
                                            label="Month & Year"
                                            value={config.employeeOfTheMonth.month}
                                            onChange={(e) =>
                                                setConfig(prev => ({
                                                    ...prev,
                                                    employeeOfTheMonth: {
                                                        ...prev.employeeOfTheMonth,
                                                        month: e.target.value,
                                                    },
                                                }))
                                            }
                                            helperText="e.g., November 2025"
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Autocomplete
                                            options={users}
                                            getOptionLabel={(option) =>
                                                `${option.personalInfo?.fullName || option.username} (${option.username})`.trim()
                                            }
                                            value={config.employeeOfTheMonth.selectedEmployee}
                                            onChange={handleEmployeeSelect}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Select Employee"
                                                    helperText="Choose the employee of the month"
                                                />
                                            )}
                                            renderOption={(props, option) => (
                                                <Box component="li" {...props}>
                                                    <Avatar
                                                        src={option.profile?.profilePicture}
                                                        sx={{ mr: 2, width: 32, height: 32 }}
                                                    >
                                                        {option.personalInfo?.fullName?.charAt(0) || option.username?.charAt(0)}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2">
                                                            {option.personalInfo?.fullName || option.username}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {option.username} - {option.employeeId}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )}
                                        />
                                    </Grid>

                                    {config.employeeOfTheMonth.selectedEmployee && (
                                        <Grid size={{ xs: 12 }}>
                                            <Card sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Avatar
                                                            src={config.employeeOfTheMonth.selectedEmployee.personalInfo?.profilePicture}
                                                            sx={{ width: 64, height: 64 }}
                                                        >
                                                            {config.employeeOfTheMonth.selectedEmployee.personalInfo?.fullName?.charAt(0) || config.employeeOfTheMonth.selectedEmployee.username?.charAt(0)}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="h6" fontWeight="600">
                                                                {config.employeeOfTheMonth.selectedEmployee.personalInfo?.fullName || config.employeeOfTheMonth.selectedEmployee.username}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                {config.employeeOfTheMonth.selectedEmployee.username} -{' '}
                                                                {config.employeeOfTheMonth.selectedEmployee.employeeId}
                                                            </Typography>
                                                            <Chip
                                                                label="Employee of the Month"
                                                                size="small"
                                                                icon={<TrophyIcon />}
                                                                sx={{ mt: 1 }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    )}
                                </>
                            )}
                        </Grid>
                    </Paper>
                </Grid>

                {/* Dashboard Widgets Section */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <VisibilityIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
                            <Typography variant="h6" fontWeight="600">
                                Dashboard Widgets
                            </Typography>
                        </Box>
                        <Divider sx={{ mb: 3 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={config.widgets.todayAttendance}
                                        onChange={() => handleWidgetToggle('todayAttendance')}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body1">Today's Attendance</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Show check-in, check-out, and working hours
                                        </Typography>
                                    </Box>
                                }
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={config.widgets.quickActions}
                                        onChange={() => handleWidgetToggle('quickActions')}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body1">Quick Action Cards</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Display quick access cards for common actions
                                        </Typography>
                                    </Box>
                                }
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={config.widgets.announcements}
                                        onChange={() => handleWidgetToggle('announcements')}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body1">Announcements</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Show recent company announcements
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Box>
                    </Paper>
                </Grid>

                {/* Quick Action Cards Section */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <EditIcon sx={{ fontSize: 32, mr: 2, color: 'success.main' }} />
                            <Typography variant="h6" fontWeight="600">
                                Quick Action Cards
                            </Typography>
                        </Box>
                        <Divider sx={{ mb: 3 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={config.quickActionCards.attendance}
                                        onChange={() => handleQuickActionToggle('attendance')}
                                        disabled={!config.widgets.quickActions}
                                    />
                                }
                                label="My Attendance"
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={config.quickActionCards.vacations}
                                        onChange={() => handleQuickActionToggle('vacations')}
                                        disabled={!config.widgets.quickActions}
                                    />
                                }
                                label="Vacation Requests"
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={config.quickActionCards.permissions}
                                        onChange={() => handleQuickActionToggle('permissions')}
                                        disabled={!config.widgets.quickActions}
                                    />
                                }
                                label="Permission Requests"
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={config.quickActionCards.forgetCheck}
                                        onChange={() => handleQuickActionToggle('forgetCheck')}
                                        disabled={!config.widgets.quickActions}
                                    />
                                }
                                label="Forgot Check Requests"
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={config.quickActionCards.sickLeave}
                                        onChange={() => handleQuickActionToggle('sickLeave')}
                                        disabled={!config.widgets.quickActions}
                                    />
                                }
                                label="Sick Leave & Mission"
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={config.quickActionCards.profile}
                                        onChange={() => handleQuickActionToggle('profile')}
                                        disabled={!config.widgets.quickActions}
                                    />
                                }
                                label="User Profile"
                            />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                <Button
                    variant="outlined"
                    size="large"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    disabled={saving}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
            </Box>
        </Box>
    );
};

export default DashboardEditPage;
