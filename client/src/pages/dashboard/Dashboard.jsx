/**
 * Dashboard Component
 * 
 * Main employee dashboard displaying:
 * - Welcome header with current date/time
 * - Employee of the Month section
 * - Today's attendance summary (check-in, check-out, working hours, status)
 * - Quick action cards for:
 *   - My Attendance
 *   - Vacation Requests
 *   - Permission Requests
 *   - Forgot Check Requests
 *   - Sick Leave & Mission
 *   - User Profile
 * 
 * Features:
 * - Real-time clock updates every second
 * - Refresh button to reload the page
 * - Navigation to different sections of the app
 * - Responsive layout that adapts to different screen sizes
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Avatar,
    Paper,
    IconButton,
} from '@mui/material';

import {
    EmojiEvents as TrophyIcon,
    Login as CheckInIcon,
    Logout as CheckOutIcon,
    AccessTime as WorkingHoursIcon,
    CheckCircle as StatusIcon,
    CalendarMonth as CalendarIcon,
    BeachAccess as VacationIcon,
    Assignment as PermissionIcon,
    EventBusy as ForgotIcon,
    SickOutlined as SickIcon,
    Person as ProfileIcon,
    Edit as EditIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    // Get current user from auth context
    const { user } = useAuth();
    const navigate = useNavigate();

    // State for real-time clock
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    /**
     * Format time in 12-hour format with AM/PM
     * @param {Date} date - Date object to format
     * @returns {string} Formatted time string (e.g., "02:30 PM")
     */
    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    /**
     * Format date in long format
     * @param {Date} date - Date object to format
     * @returns {string} Formatted date string (e.g., "Monday, November 12, 2025")
     */
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };



    return (
        <Box
            sx={{
                p: { xs: 2, sm: 3, md: 4 },
                bgcolor: 'background.default',
                minHeight: '100vh',
            }}
        >
            {/* 
                Header Section
                Displays welcome message, campus info, current date and time
                Includes refresh button to reload the page
            */}
            <Paper
                sx={{
                    p: 3,
                    mb: 3,
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    color: 'primary.contrastText',
                    borderRadius: 3,
                    boxShadow: 4,
                }}
            >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
                    <Avatar
                        src={user?.profile?.profilePicture || user?.profilePicture}
                        alt={user?.name || user?.username}
                        sx={{
                            width: 72,
                            height: 72,
                            bgcolor: 'rgba(255,255,255,0.3)',
                            border: '3px solid',
                            borderColor: 'common.white',
                            fontSize: '1.75rem',
                            fontWeight: 700,
                            boxShadow: 4,
                        }}
                    >
                        {!user?.profile?.profilePicture && !user?.profilePicture && (user?.name || user?.username)
                            ? (user?.name || user?.username).charAt(0).toUpperCase()
                            : !user?.profile?.profilePicture && !user?.profilePicture && <ProfileIcon sx={{ fontSize: 36 }} />}
                    </Avatar>
                    <Box sx={{ flex: '1 1 200px' }}>
                        <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
                            Employee Dashboard
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.95 }}>
                            Welcome back, {user?.name || user?.username}
                        </Typography>
                    </Box>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        bgcolor: 'rgba(255,255,255,0.15)',
                        p: 1.5,
                        borderRadius: 2,
                        minWidth: 100
                    }}>
                        <CalendarIcon sx={{ fontSize: 20, mb: 0.5 }} />
                        <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem', opacity: 0.8 }}>
                            CAMPUS
                        </Typography>
                        <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.85rem' }}>
                            Smart Campus
                        </Typography>
                    </Box>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        bgcolor: 'rgba(255,255,255,0.15)',
                        p: 1.5,
                        borderRadius: 2,
                        minWidth: 100
                    }}>
                        <CalendarIcon sx={{ fontSize: 20, mb: 0.5 }} />
                        <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem', opacity: 0.8 }}>
                            DATE
                        </Typography>
                        <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.85rem' }}>
                            {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                    </Box>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        bgcolor: 'rgba(255,255,255,0.15)',
                        p: 1.5,
                        borderRadius: 2,
                        minWidth: 100
                    }}>
                        <WorkingHoursIcon sx={{ fontSize: 20, mb: 0.5 }} />
                        <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem', opacity: 0.8 }}>
                            TIME
                        </Typography>
                        <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.85rem' }}>
                            {formatTime(currentTime)}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', mt: 2 }}>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<StatusIcon />}
                        onClick={() => window.location.reload()}
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.25)',
                            color: 'inherit',
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' }
                        }}
                    >
                        Refresh
                    </Button>
                </Box>
            </Paper>

            {/* 
                Employee of the Month Section
                Displays the selected employee of the month
                Currently shows placeholder message when no employee is selected
            */}
            <Paper
                sx={{
                    p: 4,
                    mb: 3,
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.secondary.light} 0%, ${theme.palette.secondary.main} 100%)`,
                    color: 'secondary.contrastText',
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: 4,
                }}
            >
                <TrophyIcon sx={{ fontSize: 72, mb: 2, opacity: 0.95 }} />
                <Typography variant="h5" fontWeight="700" gutterBottom>
                    Employee of the Month
                </Typography>
                <Typography variant="h6" gutterBottom sx={{ opacity: 0.9 }}>
                    November 2025
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85, mb: 2 }}>
                    No employee has been selected yet
                </Typography>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    px: 2,
                    py: 1,
                    borderRadius: 2
                }}>
                    <InfoIcon fontSize="small" />
                    <Typography variant="caption">
                        The Employee of the Month will be displayed here once selected by HR
                    </Typography>
                </Box>
            </Paper>

            {/* 
                Today's Attendance Section
                Shows current day's attendance information:
                - Check-in time
                - Check-out time
                - Total working hours
                - Attendance status (Present/Absent/Late)
                Note: Currently displays static data - should be connected to attendance API
            */}
            <Paper
                sx={{
                    p: 3,
                    mb: 3,
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    boxShadow: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon />
                        Today's Attendance - {formatDate(currentTime)}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box
                        sx={{
                            flex: '1 1 calc(25% - 12px)',
                            minWidth: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'info.main',
                            color: 'info.contrastText',
                            p: 3,
                            borderRadius: 2,
                            boxShadow: 2,
                            transition: 'transform 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 4,
                            },
                        }}
                    >
                        <CheckInIcon sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="caption" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                            Check In
                        </Typography>
                        <Typography variant="h5" fontWeight="700">
                            8:46 AM
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            flex: '1 1 calc(25% - 12px)',
                            minWidth: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'warning.main',
                            color: 'warning.contrastText',
                            p: 3,
                            borderRadius: 2,
                            boxShadow: 2,
                            transition: 'transform 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 4,
                            },
                        }}
                    >
                        <CheckOutIcon sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="caption" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                            Check Out
                        </Typography>
                        <Typography variant="h5" fontWeight="700">
                            3:59 PM
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            flex: '1 1 calc(25% - 12px)',
                            minWidth: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'success.main',
                            color: 'success.contrastText',
                            p: 3,
                            borderRadius: 2,
                            boxShadow: 2,
                            transition: 'transform 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 4,
                            },
                        }}
                    >
                        <WorkingHoursIcon sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="caption" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                            Working Hours
                        </Typography>
                        <Typography variant="h5" fontWeight="700">
                            6h 52m 47s
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            flex: '1 1 calc(25% - 12px)',
                            minWidth: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'success.main',
                            color: 'success.contrastText',
                            p: 3,
                            borderRadius: 2,
                            boxShadow: 2,
                            transition: 'transform 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 4,
                            },
                        }}
                    >
                        <StatusIcon sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="caption" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                            Status
                        </Typography>
                        <Chip
                            label="PRESENT"
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.25)',
                                color: 'inherit',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                border: '2px solid rgba(255,255,255,0.5)',
                            }}
                        />
                    </Box>
                </Box>
            </Paper>

            {/* 
                Action Cards Grid
                Quick access cards for main employee functions
                Each card navigates to its respective section
            */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {/* 
                    My Attendance Card
                    Navigate to attendance page to view full attendance history
                */}
                <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px', display: 'flex', mb: 3 }}>
                    <Card sx={{
                        bgcolor: 'grey.800',
                        color: 'common.white',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        boxShadow: 4
                    }}>
                        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarIcon />
                                My Attendance
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, opacity: 0.85, lineHeight: 1.6, flexGrow: 1 }}>
                                View your attendance records, check in/check out times, and attendance statistics
                            </Typography>
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={() => navigate('/app/attendance')}
                                startIcon={<CalendarIcon />}
                                sx={{
                                    bgcolor: 'info.main',
                                    color: 'info.contrastText',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    py: 1.2,
                                    '&:hover': { bgcolor: 'info.dark' }
                                }}
                            >
                                View Attendance
                            </Button>
                        </CardContent>
                    </Card>
                </Box>

                {/* 
                    Vacation Requests Card
                    Submit and manage vacation/leave requests
                */}
                <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px', display: 'flex', mb: 3 }}>
                    <Card sx={{
                        bgcolor: 'grey.800',
                        color: 'common.white',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        boxShadow: 4
                    }}>
                        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <VacationIcon />
                                Vacation Requests
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, opacity: 0.85, lineHeight: 1.6, flexGrow: 1 }}>
                                Submit and track your vacation requests, view your vacation balance, and check request status
                            </Typography>
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={() => navigate('/app/leaves')}
                                startIcon={<VacationIcon />}
                                sx={{
                                    bgcolor: 'success.main',
                                    color: 'success.contrastText',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    py: 1.2,
                                    '&:hover': { bgcolor: 'success.dark' }
                                }}
                            >
                                Manage Vacations
                            </Button>
                        </CardContent>
                    </Card>
                </Box>

                {/* 
                    Permission Requests Card
                    Request permission for late arrival or early departure
                */}
                <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px', display: 'flex', mb: 3 }}>
                    <Card sx={{
                        bgcolor: 'grey.800',
                        color: 'common.white',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        boxShadow: 4
                    }}>
                        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PermissionIcon />
                                Permission Requests
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, opacity: 0.85, lineHeight: 1.6, flexGrow: 1 }}>
                                Submit permission requests for late arrival or early departure, and track their status
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => navigate('/app/permissions')}
                                    sx={{
                                        bgcolor: 'warning.main',
                                        color: 'warning.contrastText',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.2,
                                        '&:hover': { bgcolor: 'warning.dark' }
                                    }}
                                >
                                    View Requests
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => navigate('/app/permissions')}
                                    sx={{
                                        borderColor: 'warning.main',
                                        borderWidth: 2,
                                        color: 'warning.main',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.2,
                                        '&:hover': {
                                            borderColor: 'warning.dark',
                                            borderWidth: 2,
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                >
                                    New Request
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>

                {/* 
                    Forgot Check Requests Card
                    Submit requests when forgetting to check in/out
                    Shows pending request count badge
                */}
                <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px', display: 'flex', mb: 3 }}>
                    <Card sx={{
                        bgcolor: 'grey.800',
                        color: 'common.white',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        boxShadow: 4
                    }}>
                        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ForgotIcon />
                                    Forgot Check Requests
                                </Typography>
                                <Chip
                                    label="1 Pending"
                                    size="small"
                                    sx={{
                                        bgcolor: 'warning.main',
                                        color: 'warning.contrastText',
                                        fontWeight: 700,
                                        fontSize: '0.7rem'
                                    }}
                                />
                            </Box>
                            <Typography variant="body2" sx={{ mb: 3, opacity: 0.85, lineHeight: 1.6, flexGrow: 1 }}>
                                Submit requests when you forget to check in or check out, and track their approval status
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => navigate('/app/requests')}
                                    sx={{
                                        bgcolor: 'error.main',
                                        color: 'error.contrastText',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.2,
                                        '&:hover': { bgcolor: 'error.dark' }
                                    }}
                                >
                                    View Requests
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => navigate('/app/requests')}
                                    sx={{
                                        borderColor: 'error.main',
                                        borderWidth: 2,
                                        color: 'error.main',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.2,
                                        '&:hover': {
                                            borderColor: 'error.dark',
                                            borderWidth: 2,
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                >
                                    New Request
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>

                {/* 
                    Sick Leave & Mission Card
                    Submit sick leave or mission/business trip requests
                */}
                <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px', display: 'flex', mb: 3 }}>
                    <Card sx={{
                        bgcolor: 'grey.800',
                        color: 'common.white',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        boxShadow: 4
                    }}>
                        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SickIcon />
                                Sick Leave & Mission
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, opacity: 0.85, lineHeight: 1.6, flexGrow: 1 }}>
                                Submit sick leave or mission requests and track their approval status
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => navigate('/app/leaves')}
                                    sx={{
                                        bgcolor: 'error.main',
                                        color: 'error.contrastText',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.2,
                                        '&:hover': { bgcolor: 'error.dark' }
                                    }}
                                >
                                    View Requests
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => navigate('/app/leaves')}
                                    sx={{
                                        borderColor: 'error.main',
                                        borderWidth: 2,
                                        color: 'error.main',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.2,
                                        '&:hover': {
                                            borderColor: 'error.dark',
                                            borderWidth: 2,
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                >
                                    New Request
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>

                {/* 
                    Your Profile Card
                    Displays user information summary:
                    - Name
                    - Status (Active/Inactive)
                    - Email
                    - Account Type/Role
                */}
                <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px', display: 'flex', mb: 3 }}>
                    <Card sx={{
                        bgcolor: 'grey.800',
                        color: 'common.white',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        boxShadow: 4
                    }}>
                        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <ProfileIcon />
                                Your Profile
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ opacity: 0.85 }}>Name:</Typography>
                                    <Typography variant="body2" fontWeight="600">{user?.name || 'N/A'}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ opacity: 0.85 }}>Status:</Typography>
                                    <Chip
                                        label="Active"
                                        size="small"
                                        sx={{
                                            bgcolor: 'info.main',
                                            color: 'info.contrastText',
                                            fontWeight: 600,
                                            fontSize: '0.7rem'
                                        }}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ opacity: 0.85 }}>Email:</Typography>
                                    <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.85rem' }}>
                                        {user?.email || 'N/A'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ opacity: 0.85 }}>Account Type:</Typography>
                                    <Chip
                                        label={user?.role || 'Employee'}
                                        size="small"
                                        sx={{
                                            bgcolor: 'grey.600',
                                            color: 'common.white',
                                            textTransform: 'uppercase',
                                            fontWeight: 600,
                                            fontSize: '0.7rem'
                                        }}
                                    />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>


            </Box>
        </Box>
    );
};

export default Dashboard;
