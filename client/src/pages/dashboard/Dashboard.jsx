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
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

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
            {/* Header Section */}
            <Paper
                sx={{
                    p: 3,
                    mb: 3,
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    color: 'white',
                    borderRadius: 3,
                    boxShadow: 4,
                    border: 'none',
                }}
            >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{
                        width: 56,
                        height: 56,
                        bgcolor: 'rgba(255,255,255,0.3)',
                        border: '2px solid white'
                    }}>
                        <ProfileIcon sx={{ fontSize: 32 }} />
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
                        textAlign: 'center',
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
                        textAlign: 'center',
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
                        textAlign: 'center',
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
                <Box sx={{ mt: 2 }}>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<StatusIcon />}
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.25)',
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' }
                        }}
                    >
                        Refresh
                    </Button>
                </Box>
            </Paper>

            {/* Employee of the Month */}
            <Paper
                sx={{
                    p: 4,
                    mb: 3,
                    background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                    color: 'white',
                    borderRadius: 3,
                    textAlign: 'center',
                    boxShadow: 4,
                    border: 'none',
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
                    display: 'inline-flex',
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

            {/* Today's Attendance */}
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
                    <IconButton size="small">
                        <EditIcon />
                    </IconButton>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between' }}>
                    <Box
                        sx={{
                            flex: '1 1 calc(25% - 16px)',
                            minWidth: '200px',
                            bgcolor: 'info.main',
                            color: 'info.contrastText',
                            p: 3,
                            borderRadius: 2,
                            textAlign: 'center',
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
                            flex: '1 1 calc(25% - 16px)',
                            minWidth: '200px',
                            bgcolor: 'warning.main',
                            color: 'warning.contrastText',
                            p: 3,
                            borderRadius: 2,
                            textAlign: 'center',
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
                            flex: '1 1 calc(25% - 16px)',
                            minWidth: '200px',
                            bgcolor: 'success.main',
                            color: 'success.contrastText',
                            p: 3,
                            borderRadius: 2,
                            textAlign: 'center',
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
                            flex: '1 1 calc(25% - 16px)',
                            minWidth: '200px',
                            bgcolor: 'success.main',
                            color: 'success.contrastText',
                            p: 3,
                            borderRadius: 2,
                            textAlign: 'center',
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

            {/* Action Cards Grid */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
                {/* My Attendance */}
                <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                    <Card sx={{
                        bgcolor: '#34495e',
                        color: 'white',
                        borderRadius: 3,
                        height: '100%',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarIcon />
                                My Attendance
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, opacity: 0.85, lineHeight: 1.6 }}>
                                View your attendance records, check in/check out times, and attendance statistics
                            </Typography>
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={() => navigate('/attendance')}
                                startIcon={<CalendarIcon />}
                                sx={{
                                    bgcolor: '#4a90e2',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    py: 1.2,
                                    '&:hover': { bgcolor: '#357abd' }
                                }}
                            >
                                View Attendance
                            </Button>
                        </CardContent>
                    </Card>
                </Box>

                {/* Vacation Requests */}
                <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                    <Card sx={{
                        bgcolor: '#34495e',
                        color: 'white',
                        borderRadius: 3,
                        height: '100%',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <VacationIcon />
                                Vacation Requests
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, opacity: 0.85, lineHeight: 1.6 }}>
                                Submit and track your vacation requests, view your vacation balance, and check request status
                            </Typography>
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={() => navigate('/leaves')}
                                startIcon={<VacationIcon />}
                                sx={{
                                    bgcolor: '#28a745',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    py: 1.2,
                                    '&:hover': { bgcolor: '#218838' }
                                }}
                            >
                                Manage Vacations
                            </Button>
                        </CardContent>
                    </Card>
                </Box>

                {/* Permission Requests */}
                <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                    <Card sx={{
                        bgcolor: '#34495e',
                        color: 'white',
                        borderRadius: 3,
                        height: '100%',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PermissionIcon />
                                Permission Requests
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, opacity: 0.85, lineHeight: 1.6 }}>
                                Submit permission requests for late arrival or early departure, and track their status
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => navigate('/permissions')}
                                    sx={{
                                        bgcolor: '#ffc107',
                                        color: '#000',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.2,
                                        '&:hover': { bgcolor: '#e0a800' }
                                    }}
                                >
                                    View Requests
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => navigate('/permissions')}
                                    sx={{
                                        borderColor: '#ffc107',
                                        borderWidth: 2,
                                        color: '#ffc107',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.2,
                                        '&:hover': {
                                            borderColor: '#e0a800',
                                            borderWidth: 2,
                                            bgcolor: 'rgba(255, 193, 7, 0.1)'
                                        }
                                    }}
                                >
                                    New Request
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>

                {/* Forgot Check Requests */}
                <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                    <Card sx={{
                        bgcolor: '#34495e',
                        color: 'white',
                        borderRadius: 3,
                        height: '100%',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ForgotIcon />
                                    Forgot Check Requests
                                </Typography>
                                <Chip
                                    label="1 Pending"
                                    size="small"
                                    sx={{
                                        bgcolor: '#ffc107',
                                        color: '#000',
                                        fontWeight: 700,
                                        fontSize: '0.7rem'
                                    }}
                                />
                            </Box>
                            <Typography variant="body2" sx={{ mb: 3, opacity: 0.85, lineHeight: 1.6 }}>
                                Submit requests when you forget to check in or check out, and track their approval status
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => navigate('/requests')}
                                    sx={{
                                        bgcolor: '#dc3545',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.2,
                                        '&:hover': { bgcolor: '#c82333' }
                                    }}
                                >
                                    View Requests
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => navigate('/requests')}
                                    sx={{
                                        borderColor: '#dc3545',
                                        borderWidth: 2,
                                        color: '#dc3545',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.2,
                                        '&:hover': {
                                            borderColor: '#c82333',
                                            borderWidth: 2,
                                            bgcolor: 'rgba(220, 53, 69, 0.1)'
                                        }
                                    }}
                                >
                                    New Request
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>

                {/* Sick Leave & Mission */}
                <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                    <Card sx={{
                        bgcolor: '#34495e',
                        color: 'white',
                        borderRadius: 3,
                        height: '100%',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SickIcon />
                                Sick Leave & Mission
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, opacity: 0.85, lineHeight: 1.6 }}>
                                Submit sick leave or mission requests and track their approval status
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => navigate('/leaves')}
                                    sx={{
                                        bgcolor: '#dc3545',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.2,
                                        '&:hover': { bgcolor: '#c82333' }
                                    }}
                                >
                                    View Requests
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => navigate('/leaves')}
                                    sx={{
                                        borderColor: '#dc3545',
                                        borderWidth: 2,
                                        color: '#dc3545',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        py: 1.2,
                                        '&:hover': {
                                            borderColor: '#c82333',
                                            borderWidth: 2,
                                            bgcolor: 'rgba(220, 53, 69, 0.1)'
                                        }
                                    }}
                                >
                                    New Request
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>

                {/* Your Profile */}
                <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                    <Card sx={{
                        bgcolor: '#34495e',
                        color: 'white',
                        borderRadius: 3,
                        height: '100%',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <ProfileIcon />
                                Your Profile
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
                                            bgcolor: '#17a2b8',
                                            color: 'white',
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
                                            bgcolor: '#6c757d',
                                            color: 'white',
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
