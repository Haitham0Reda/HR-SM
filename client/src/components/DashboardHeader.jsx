import * as React from 'react';
import PropTypes from 'prop-types';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiAppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import Stack from '@mui/material/Stack';
import { Link, useNavigate } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';
import { useAuth } from '../context/AuthContext';
import leaveService from '../services/leave.service';
import announcementService from '../services/announcement.service';
import eventService from '../services/event.service';
import surveyService from '../services/survey.service';
import permissionService from '../services/permission.service';
import notificationService from '../services/notification.service';

const AppBar = styled(MuiAppBar)(({ theme }) => ({
    borderWidth: 0,
    borderBottomWidth: 1,
    borderStyle: 'solid',
    borderColor: (theme.vars ?? theme).palette.divider,
    boxShadow: 'none',
    zIndex: theme.zIndex.drawer + 1,
}));

const LogoContainer = styled('div')({
    position: 'relative',
    height: 40,
    display: 'flex',
    alignItems: 'center',
    '& img': {
        maxHeight: 40,
    },
});

function DashboardHeader({ logo, title, menuOpen, onToggleMenu, user }) {
    const theme = useTheme();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [notificationAnchorEl, setNotificationAnchorEl] = React.useState(null);
    const [notifications, setNotifications] = React.useState([]);
    const [currentTime, setCurrentTime] = React.useState(new Date());
    const profileMenuOpen = Boolean(anchorEl);
    const notificationMenuOpen = Boolean(notificationAnchorEl);

    // Update time every second
    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

<<<<<<< HEAD
    // Fetch notifications
    React.useEffect(() => {
        if (user && user._id) {
            fetchNotifications();
            // Refresh notifications every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);

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
    }, [user]);

    const fetchNotifications = async () => {
=======
    // Define fetchNotifications before useEffect that uses it
    const fetchNotifications = React.useCallback(async () => {
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
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
    }, [user]);

    // Fetch notifications
    React.useEffect(() => {
        if (user && user._id) {
            fetchNotifications();
            // Refresh notifications every 60 seconds instead of 30 to reduce load
            const interval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(interval);
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
                                {logo ? <LogoContainer>{logo}</LogoContainer> : null}
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

                        <ThemeSwitcher />

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
                                aria-controls={profileMenuOpen ? 'account-menu' : undefined}
                                aria-haspopup="true"
                                aria-expanded={profileMenuOpen ? 'true' : undefined}
                                sx={{
                                    ml: 1,
                                    '&:hover': {
                                        backgroundColor: 'transparent',
                                    },
                                }}
                            >
                                <Avatar
<<<<<<< HEAD
                                    src={user?.profile?.profilePicture}
                                    alt={user?.name || 'User'}
=======
                                    src={user?.profile?.profilePicture || user?.profilePicture}
                                    alt={user?.name || user?.username || 'User'}
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
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
<<<<<<< HEAD
                                    {!user?.profile?.profilePicture && user?.name
                                        ? user.name.charAt(0).toUpperCase()
=======
                                    {!(user?.profile?.profilePicture || user?.profilePicture) && (user?.name || user?.username)
                                        ? (user?.name || user?.username).charAt(0).toUpperCase()
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
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
                open={profileMenuOpen}
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
                open={notificationMenuOpen}
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
<<<<<<< HEAD
                            const notifType = notification.type;

                            // Calculate time ago
                            const getTimeAgo = (date) => {
                                const now = new Date();
                                const created = new Date(date);
                                const diffMs = now - created;
                                const diffMins = Math.floor(diffMs / 60000);
                                const diffHours = Math.floor(diffMs / 3600000);
                                const diffDays = Math.floor(diffMs / 86400000);

                                if (diffMins < 1) return 'Just now';
                                if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
                                if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                                return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                            };

                            // Get status color
                            const getStatusColor = (status) => {
                                const colors = {
                                    pending: 'warning',
                                    approved: 'success',
                                    rejected: 'error',
                                    cancelled: 'default'
                                };
                                return colors[status] || 'default';
                            };

                            const handleClick = async () => {
                                // Mark notification as read in database
                                try {
                                    if (!notification.isRead) {
                                        await notificationService.markAsRead(notification._id);
                                    }
                                } catch (error) {
                                    console.error('Error marking notification as read:', error);
=======
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
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
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
<<<<<<< HEAD

                                // Refresh notifications after marking as read
                                setTimeout(fetchNotifications, 500);
=======
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
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