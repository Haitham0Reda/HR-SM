/**
 * Dashboard Component with Animations
 * 
 * Main employee dashboard displaying:
 * - Welcome header with current date/time
 * - Employee of the Month section
 * - Today's attendance summary (check-in, check-out, working hours, status)
 * - Quick action cards for various employee functions
 * 
 * Features:
 * - Real-time clock updates every second
 * - Smooth animations on page load
 * - Staggered card animations
 * - Hover effects with transitions
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
    Fade,
    Grow,
    Slide,
    Zoom,
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
import { dashboardService } from '../../services';

// Action card configuration with staggered animation delays
const actionCards = [
    {
        id: 'attendance',
        title: 'My Attendance',
        icon: CalendarIcon,
        description: 'View your attendance records, check in/check out times, and attendance statistics',
        buttonText: 'View Attendance',
        buttonColor: 'info',
        route: '/app/attendance',
        delay: '200ms'
    },
    {
        id: 'vacation',
        title: 'Vacation Requests',
        icon: VacationIcon,
        description: 'Submit and track your vacation requests, view your vacation balance, and check request status',
        buttonText: 'Manage Vacations',
        buttonColor: 'success',
        route: '/app/leaves',
        delay: '300ms'
    },
    {
        id: 'permission',
        title: 'Permission Requests',
        icon: PermissionIcon,
        description: 'Submit permission requests for late arrival or early departure, and track their status',
        buttonText: 'View Requests',
        buttonText2: 'New Request',
        buttonColor: 'warning',
        route: '/app/permissions',
        delay: '400ms',
        hasTwoButtons: true
    },
    {
        id: 'forgot',
        title: 'Forgot Check Requests',
        icon: ForgotIcon,
        description: 'Submit requests when you forget to check in or check out, and track their approval status',
        buttonText: 'View Requests',
        buttonText2: 'New Request',
        buttonColor: 'error',
        route: '/app/requests',
        delay: '500ms',
        badge: '1 Pending',
        hasTwoButtons: true
    },
    {
        id: 'sick',
        title: 'Sick Leave & Mission',
        icon: SickIcon,
        description: 'Submit sick leave or mission requests and track their approval status',
        buttonText: 'View Requests',
        buttonText2: 'New Request',
        buttonColor: 'error',
        route: '/app/leaves',
        delay: '600ms',
        hasTwoButtons: true
    }
];

const Dashboard = () => {
    // Get current user from auth context
    const { user } = useAuth();
    const navigate = useNavigate();

    // State for real-time clock
    const [currentTime, setCurrentTime] = useState(new Date());

    // State for Employee of the Month
    const [employeeOfMonth, setEmployeeOfMonth] = useState(null);
    const [loadingEmployeeOfMonth, setLoadingEmployeeOfMonth] = useState(true);

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch Employee of the Month
    useEffect(() => {
        const fetchEmployeeOfMonth = async () => {
            try {
                setLoadingEmployeeOfMonth(true);
                const data = await dashboardService.getEmployeeOfTheMonth();
                setEmployeeOfMonth(data);
            } catch (error) {
                console.error('Failed to fetch employee of the month:', error);
            } finally {
                setLoadingEmployeeOfMonth(false);
            }
        };

        fetchEmployeeOfMonth();
    }, []);

    /**
     * Format time in 12-hour format with AM/PM
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
            {/* Header Section with Slide Animation */}
            <Slide direction="down" in={true} timeout={600}>
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
                        <Zoom in={true} timeout={800}>
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
                        </Zoom>
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
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.35)',
                                    transform: 'scale(1.05)'
                                }
                            }}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Paper>
            </Slide>

            {/* Employee of the Month Section with Fade Animation */}
            {employeeOfMonth?.enabled && (
                <Fade in={true} timeout={800}>
                    <Paper
                        sx={{
                            p: 3,
                            mb: 3,
                            bgcolor: 'background.paper',
                            borderRadius: 3,
                            boxShadow: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                boxShadow: 4,
                                transform: 'translateY(-2px)'
                            }
                        }}
                    >
                        {employeeOfMonth?.selectedEmployee ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Zoom in={true} timeout={1000}>
                                    <Avatar
                                        src={employeeOfMonth.selectedEmployee.profile?.profilePicture}
                                        alt={employeeOfMonth.selectedEmployee.profile?.firstName}
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            border: '3px solid',
                                            borderColor: 'warning.main',
                                            boxShadow: 3,
                                            fontSize: '2rem',
                                            fontWeight: 700,
                                            bgcolor: 'warning.light',
                                        }}
                                    >
                                        {employeeOfMonth.selectedEmployee.profile?.firstName?.charAt(0) ||
                                            employeeOfMonth.selectedEmployee.username?.charAt(0)}
                                    </Avatar>
                                </Zoom>

                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <TrophyIcon sx={{ fontSize: 20, color: 'warning.main' }} />
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'warning.main',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: 1
                                            }}
                                        >
                                            Employee of the Month
                                        </Typography>
                                    </Box>
                                    <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
                                        {employeeOfMonth.selectedEmployee.profile?.firstName}{' '}
                                        {employeeOfMonth.selectedEmployee.profile?.lastName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {employeeOfMonth?.month || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                                    </Typography>
                                </Box>

                                {(user?.role === 'admin' || user?.role === 'hr') && (
                                    <IconButton
                                        onClick={() => navigate('/app/dashboard/edit')}
                                        sx={{
                                            bgcolor: 'action.hover',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                bgcolor: 'action.selected',
                                                transform: 'rotate(90deg)'
                                            }
                                        }}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Avatar
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        bgcolor: 'grey.300',
                                        border: '3px solid',
                                        borderColor: 'grey.400',
                                    }}
                                >
                                    <TrophyIcon sx={{ fontSize: 40, color: 'grey.600' }} />
                                </Avatar>

                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <TrophyIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'text.secondary',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: 1
                                            }}
                                        >
                                            Employee of the Month
                                        </Typography>
                                    </Box>
                                    <Typography variant="h6" fontWeight="600" color="text.secondary" sx={{ mb: 0.5 }}>
                                        No employee selected yet
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {employeeOfMonth?.month || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                                    </Typography>
                                </Box>

                                {(user?.role === 'admin' || user?.role === 'hr') && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<EditIcon />}
                                        onClick={() => navigate('/app/dashboard/edit')}
                                        sx={{
                                            textTransform: 'none',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'scale(1.05)'
                                            }
                                        }}
                                    >
                                        Select Employee
                                    </Button>
                                )}
                            </Box>
                        )}
                    </Paper>
                </Fade>
            )}

            {/* Today's Attendance Section with Grow Animation */}
            <Grow in={true} timeout={1000}>
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
                        {[
                            { icon: CheckInIcon, label: 'Check In', value: '8:46 AM', color: 'info', delay: 100 },
                            { icon: CheckOutIcon, label: 'Check Out', value: '3:59 PM', color: 'warning', delay: 200 },
                            { icon: WorkingHoursIcon, label: 'Working Hours', value: '6h 52m 47s', color: 'success', delay: 300 },
                            { icon: StatusIcon, label: 'Status', value: 'PRESENT', color: 'success', delay: 400, isChip: true }
                        ].map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <Zoom key={index} in={true} timeout={800} style={{ transitionDelay: `${item.delay}ms` }}>
                                    <Box
                                        sx={{
                                            flex: '1 1 calc(25% - 12px)',
                                            minWidth: '200px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: `${item.color}.main`,
                                            color: `${item.color}.contrastText`,
                                            p: 3,
                                            borderRadius: 2,
                                            boxShadow: 2,
                                            transition: 'all 0.3s ease-in-out',
                                            '&:hover': {
                                                transform: 'translateY(-8px) scale(1.05)',
                                                boxShadow: 6,
                                            },
                                        }}
                                    >
                                        <Icon sx={{ fontSize: 40, mb: 1 }} />
                                        <Typography variant="caption" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                                            {item.label}
                                        </Typography>
                                        {item.isChip ? (
                                            <Chip
                                                label={item.value}
                                                sx={{
                                                    bgcolor: 'rgba(255,255,255,0.25)',
                                                    color: 'inherit',
                                                    fontWeight: 700,
                                                    fontSize: '0.75rem',
                                                    border: '2px solid rgba(255,255,255,0.5)',
                                                }}
                                            />
                                        ) : (
                                            <Typography variant="h5" fontWeight="700">
                                                {item.value}
                                            </Typography>
                                        )}
                                    </Box>
                                </Zoom>
                            );
                        })}
                    </Box>
                </Paper>
            </Grow>

            {/* Action Cards Grid with Staggered Zoom Animations */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {actionCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Zoom key={card.id} in={true} timeout={800} style={{ transitionDelay: card.delay }}>
                            <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px', display: 'flex', mb: 3 }}>
                                <Card sx={{
                                    bgcolor: 'grey.800',
                                    color: 'common.white',
                                    borderRadius: 3,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: '100%',
                                    boxShadow: 4,
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-8px) scale(1.02)',
                                        boxShadow: 8,
                                    }
                                }}>
                                    <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Icon />
                                                {card.title}
                                            </Typography>
                                            {card.badge && (
                                                <Chip
                                                    label={card.badge}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'warning.main',
                                                        color: 'warning.contrastText',
                                                        fontWeight: 700,
                                                        fontSize: '0.7rem',
                                                        animation: 'pulse 2s infinite'
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Typography variant="body2" sx={{ mb: 3, opacity: 0.85, lineHeight: 1.6, flexGrow: 1 }}>
                                            {card.description}
                                        </Typography>
                                        {card.hasTwoButtons ? (
                                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                                <Button
                                                    variant="contained"
                                                    fullWidth
                                                    onClick={() => navigate(card.route)}
                                                    sx={{
                                                        bgcolor: `${card.buttonColor}.main`,
                                                        color: `${card.buttonColor}.contrastText`,
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        py: 1.2,
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            bgcolor: `${card.buttonColor}.dark`,
                                                            transform: 'scale(1.05)'
                                                        }
                                                    }}
                                                >
                                                    {card.buttonText}
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    fullWidth
                                                    onClick={() => navigate(card.route)}
                                                    sx={{
                                                        borderColor: `${card.buttonColor}.main`,
                                                        borderWidth: 2,
                                                        color: `${card.buttonColor}.main`,
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        py: 1.2,
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            borderColor: `${card.buttonColor}.dark`,
                                                            borderWidth: 2,
                                                            bgcolor: 'action.hover',
                                                            transform: 'scale(1.05)'
                                                        }
                                                    }}
                                                >
                                                    {card.buttonText2}
                                                </Button>
                                            </Box>
                                        ) : (
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                onClick={() => navigate(card.route)}
                                                startIcon={<Icon />}
                                                sx={{
                                                    bgcolor: `${card.buttonColor}.main`,
                                                    color: `${card.buttonColor}.contrastText`,
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    py: 1.2,
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        bgcolor: `${card.buttonColor}.dark`,
                                                        transform: 'scale(1.05)'
                                                    }
                                                }}
                                            >
                                                {card.buttonText}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </Box>
                        </Zoom>
                    );
                })}

                {/* Your Profile Card */}
                <Zoom in={true} timeout={800} style={{ transitionDelay: '700ms' }}>
                    <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px', display: 'flex', mb: 3 }}>
                        <Card sx={{
                            bgcolor: 'grey.800',
                            color: 'common.white',
                            borderRadius: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            boxShadow: 4,
                            transition: 'all 0.3s ease-in-out',
                            '&:hover': {
                                transform: 'translateY(-8px) scale(1.02)',
                                boxShadow: 8,
                            }
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
                </Zoom>
            </Box>

            {/* Add keyframe animation for pulse effect */}
            <style>
                {`
                    @keyframes pulse {
                        0%, 100% {
                            opacity: 1;
                            transform: scale(1);
                        }
                        50% {
                            opacity: 0.8;
                            transform: scale(1.05);
                        }
                    }
                `}
            </style>
        </Box>
    );
};

export default Dashboard;
