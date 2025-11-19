import * as React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import {
    AppBar,
    Box,
    Toolbar,
    Typography,
    IconButton,
    Tooltip,
    Menu,
    MenuItem,
    Avatar,
    Stack,
    Badge,
    Divider,
    ListItemIcon,
    Chip,
    Button,
} from '@mui/material';
import {
    Menu as MenuIcon,
    MenuOpen as MenuOpenIcon,
    Logout as LogoutIcon,
    Notifications as NotificationsIcon,
    Settings as SettingsIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notification.service';

const DashboardHeader = ({ menuOpen, onToggleMenu, logo, title }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [notificationAnchorEl, setNotificationAnchorEl] = React.useState(null);
    const [notifications, setNotifications] = React.useState([]);
    const [currentTime, setCurrentTime] = React.useState(new Date());

    // Update time every second
    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Define fetchNotifications before useEffect that uses it
    const fetchNotifications = React.useCallback(async () => {
        try {
            console.log('Fetching notifications...');
            // Fetch notifications from the notification API
            const notificationData = await notificationService.getAll();
            console.log('Notification data received:', notificationData);

            const notifications = Array.isArray(notificationData) ? notificationData : (notificationData.data || []);
            console.log('Parsed notifications:', notifications.length);

            // Filter to show only unread notifications and sort by date
            const unreadNotifications = notifications
                .filter(n => !n.isRead)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10);

            console.log('Unread notifications:', unreadNotifications.length);
            setNotifications(unreadNotifications);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            // Fallback to empty array if API fails
            setNotifications([]);
        }
    }, []); // Removed 'user' from dependency array as it's not used in the function

    // Fetch notifications
    React.useEffect(() => {
        if (user && user._id) {
            fetchNotifications();
            // Refresh notifications every 60 seconds instead of 30 to reduce load
            const interval = setInterval(fetchNotifications, 60000);
            
            // Listen for notification updates from other components
            const handleNotificationUpdate = () => {
                console.log('notificationUpdate event received, fetching notifications...');
                fetchNotifications();
            };
            window.addEventListener('notificationUpdate', handleNotificationUpdate);
            console.log('Notification event listener registered');

            return () => {
                clearInterval(interval);
                window.removeEventListener('notificationUpdate', handleNotificationUpdate);
            };
        }
    }, [user, fetchNotifications]);

    const notificationCount = notifications.length;

    const handleMenuOpen = React.useCallback(() => {
        onToggleMenu(!menuOpen);
    }, [menuOpen, onToggleMenu]);

    const handleProfileClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleProfileClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = (event) => {
        setNotificationAnchorEl(event.currentTarget);
    };

    const handleNotificationClose = () => {
        setNotificationAnchorEl(null);
    };

    const handleLogout = () => {
        handleProfileClose();
        logout();
        navigate('/');
    };

    const getMenuIcon = React.useCallback(
        (isExpanded) => {
            const expandMenuActionText = 'Expand';
            const collapseMenuActionText = 'Collapse';

            return (
                <Tooltip
                    title={`${isExpanded ? collapseMenuActionText : expandMenuActionText} menu`}
                    enterDelay={1000}
                >
                    <div>
                        <IconButton
                            size="small"
                            aria-label={`${isExpanded ? collapseMenuActionText : expandMenuActionText} navigation menu`}
                            onClick={handleMenuOpen}
                        >
                            {isExpanded ? <MenuOpenIcon /> : <MenuIcon />}
                        </IconButton>
                    </div>
                </Tooltip>
            );
        },
        [handleMenuOpen],
    );

    // Helper function to get color based on status
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved':
                return 'success';
            case 'rejected':
                return 'error';
            case 'pending':
            default:
                return 'warning';
        }
    };

    // Helper function to format time ago
    const getTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now - date;
        const diffInHours = diffInMs / (1000 * 60 * 60);
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else if (diffInDays < 7) {
            return `${Math.floor(diffInDays)}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    return (
        <AppBar color="inherit" position="absolute" sx={{ displayPrint: 'none' }}>
            <Toolbar sx={{ backgroundColor: 'inherit', mx: { xs: -0.75, sm: -1 } }}>
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                        flexWrap: 'wrap',
                        width: '100%',
                    }}
                >
                    <Stack direction="row" alignItems="center">
                        <Box sx={{ mr: 1 }}>{getMenuIcon(menuOpen)}</Box>
                        <Link to="/app" style={{ textDecoration: 'none' }}>
                            <Stack direction="row" alignItems="center">
                                {logo ? logo : null}
                                {title ? (
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            color: (theme.vars ?? theme).palette.primary.main,
                                            fontWeight: '700',
                                            ml: 1,
                                            whiteSpace: 'nowrap',
                                            lineHeight: 1,
                                        }}
                                    >
                                        {title}
                                    </Typography>
                                ) : null}
                            </Stack>
                        </Link>
                    </Stack>
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ marginLeft: 'auto' }}
                    >
                        {/* Live Clock */}
                        <Box
                            sx={{
                                display: { xs: 'none', sm: 'flex' },
                                flexDirection: 'column',
                                alignItems: 'center',
                                mr: 1,
                                px: 2,
                                py: 0.5,
                                borderRadius: 2,
                                bgcolor: 'action.hover',
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    color: 'text.primary',
                                    fontFamily: 'monospace',
                                    letterSpacing: 0.5,
                                }}
                            >
                                {currentTime.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true,
                                })}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    fontSize: '0.7rem',
                                    color: 'text.secondary',
                                    fontWeight: 500,
                                }}
                            >
                                {currentTime.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </Typography>
                        </Box>

                        <Tooltip title="Notifications">
                            <IconButton
                                size="medium"
                                onClick={handleNotificationClick}
                                aria-label={`${notificationCount} notifications`}
                                sx={{
                                    '&:hover': {
                                        backgroundColor: 'action.hover',
                                    },
                                }}
                            >
                                <Badge
                                    badgeContent={notificationCount}
                                    color="error"
                                    sx={{
                                        '& .MuiBadge-badge': {
                                            fontWeight: 600,
                                        },
                                    }}
                                >
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Account">
                            <IconButton
                                onClick={handleProfileClick}
                                size="small"
                                aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
                                aria-haspopup="true"
                                aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
                                sx={{
                                    ml: 1,
                                    '&:hover': {
                                        backgroundColor: 'transparent',
                                    },
                                }}
                            >
                                <Avatar
                                    src={user?.profile?.profilePicture || user?.profilePicture}
                                    alt={user?.name || user?.username || 'User'}
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        border: '2px solid',
                                        borderColor: 'primary.main',
                                        fontWeight: 600,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            transform: 'scale(1.05)',
                                        },
                                    }}
                                >
                                    {!(user?.profile?.profilePicture || user?.profilePicture) && (user?.name || user?.username)
                                        ? (user?.name || user?.username).charAt(0).toUpperCase()
                                        : <PersonIcon />}
                                </Avatar>
                            </IconButton>
                        </Tooltip>

                        <Box
                            sx={{
                                display: { xs: 'none', md: 'flex' },
                                flexDirection: 'column',
                                alignItems: 'center',
                                ml: 1,
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    color: 'text.primary',
                                }}
                            >
                                {user?.profile?.firstName || user?.name?.split(' ')[0] || user?.username || 'User'}
                            </Typography>
                            <Chip
                                label={user?.role?.toUpperCase() || 'EMPLOYEE'}
                                size="small"
                                sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '& .MuiChip-label': {
                                        px: 1,
                                    },
                                }}
                            />
                        </Box>
                    </Stack>
                </Stack>
            </Toolbar>

            {/* Profile Menu */}
            <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={Boolean(anchorEl)}
                onClose={handleProfileClose}
                onClick={handleProfileClose}
                slotProps={{
                    paper: {
                        elevation: 3,
                        sx: {
                            overflow: 'visible',
                            mt: 1.5,
                            minWidth: 240,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            '& .MuiMenuItem-root': {
                                borderRadius: 1,
                                mx: 1,
                                my: 0.5,
                                '&:hover': {
                                    backgroundColor: 'action.hover',
                                },
                            },
                        },
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ px: 2.5, py: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {user?.name || user?.username || 'User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        {user?.email || ''}
                    </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <MenuItem onClick={handleProfileClose} component={Link} to="/app/profile">
                    <ListItemIcon>
                        <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2">Profile</Typography>
                </MenuItem>
                <MenuItem onClick={handleProfileClose} component={Link} to="/app/settings">
                    <ListItemIcon>
                        <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2">Settings</Typography>
                </MenuItem>
                <Divider sx={{ my: 1 }} />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                    <ListItemIcon>
                        <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <Typography variant="body2">Logout</Typography>
                </MenuItem>
            </Menu>

            {/* Notifications Menu */}
            <Menu
                anchorEl={notificationAnchorEl}
                id="notifications-menu"
                open={Boolean(notificationAnchorEl)}
                onClose={handleNotificationClose}
                slotProps={{
                    paper: {
                        elevation: 3,
                        sx: {
                            overflow: 'visible',
                            mt: 1.5,
                            minWidth: 360,
                            maxWidth: 400,
                            maxHeight: 'calc(100vh - 100px)',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                        },
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                        Notifications
                    </Typography>
                    {notificationCount > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            {notificationCount} new update{notificationCount > 1 ? 's' : ''}
                        </Typography>
                    )}
                </Box>
                {notifications.length > 0 ? (
                    <Box sx={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                        {notifications.map((notification) => {
                            const notifType = notification.notifType;

                            const handleClick = () => {
                                // Mark as viewed
                                const viewedNotifications = JSON.parse(localStorage.getItem('viewedNotifications') || '[]');
                                if (!viewedNotifications.includes(notification._id)) {
                                    viewedNotifications.push(notification._id);
                                    localStorage.setItem('viewedNotifications', JSON.stringify(viewedNotifications));
                                    
                                    // Immediately update the notifications state to decrease the badge count
                                    const updatedNotifications = notifications.filter(n => n._id !== notification._id);
                                    setNotifications(updatedNotifications);
                                }

                                handleNotificationClose();

                                // Navigate to appropriate page based on type
                                if (notifType === 'leave') {
                                    navigate('/app/leaves');
                                } else if (notifType === 'permission') {
                                    navigate('/app/permissions');
                                } else if (notifType === 'announcement') {
                                    navigate('/app/announcements');
                                } else if (notifType === 'event') {
                                    navigate('/app/events');
                                } else if (notifType === 'request' || notifType === 'request-control') {
                                    if (notification.relatedId) {
                                        navigate(`/app/requests/${notification.relatedId}`);
                                    } else {
                                        navigate('/app/requests');
                                    }
                                } else if (notifType === 'attendance') {
                                    navigate('/app/attendance');
                                } else if (notifType === 'payroll') {
                                    navigate('/app/payroll');
                                } else {
                                    // Default: navigate to requests list
                                    navigate('/app/requests');
                                }
                            };

                            return (
                                <MenuItem
                                    key={notification._id}
                                    onClick={handleClick}
                                    sx={{
                                        py: 1.5,
                                        px: 2.5,
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        '&:last-child': {
                                            borderBottom: 'none',
                                        },
                                        '&:hover': {
                                            backgroundColor: 'action.hover',
                                        },
                                    }}
                                >
                                    <Box sx={{ width: '100%' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                                {notifType.charAt(0).toUpperCase() + notifType.slice(1)} Request
                                            </Typography>
                                            <Chip
                                                label={notification.status?.toUpperCase() || 'PENDING'}
                                                size="small"
                                                color={getStatusColor(notification.status || 'pending')}
                                                sx={{
                                                    height: 20,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                }}
                                            />
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                            {getTimeAgo(notification.createdAt)}
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            );
                        })}
                    </Box>
                ) : (
                    <Box
                        sx={{
                            p: 4,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary">
                            No notifications
                        </Typography>
                    </Box>
                )}
                {notifications.length > 0 && (
                    <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                        <Button
                            size="small"
                            onClick={() => {
                                handleNotificationClose();
                                navigate('/app/requests');
                            }}
                            sx={{ fontSize: '0.8rem' }}
                        >
                            View All Requests
                        </Button>
                    </Box>
                )}
            </Menu>
        </AppBar>
    );
}

DashboardHeader.propTypes = {
    logo: PropTypes.node,
    menuOpen: PropTypes.bool.isRequired,
    onToggleMenu: PropTypes.func.isRequired,
    title: PropTypes.string,
    user: PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string,
        username: PropTypes.string,
        email: PropTypes.string,
        role: PropTypes.string,
        profilePicture: PropTypes.string,
        profile: PropTypes.shape({
            firstName: PropTypes.string,
            lastName: PropTypes.string,
            profilePicture: PropTypes.string,
        }),
    }),
};

export default DashboardHeader;