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
import { useAuth } from '../store/providers/ReduxAuthProvider';
import { useCompanyRouting } from '../hooks/useCompanyRouting';
import { designTokens } from '../theme/designTokens';
import { getUserProfilePicture, getUserInitials } from '../utils/profilePicture';
// eslint-disable-next-line no-unused-vars
import announcementService from '../services/announcement.service';
// eslint-disable-next-line no-unused-vars
import eventService from '../services/event.service';
// eslint-disable-next-line no-unused-vars
import surveyService from '../services/survey.service';
// eslint-disable-next-line no-unused-vars
import permissionService from '../services/permission.service';
// eslint-disable-next-line no-unused-vars
import notificationService from '../services/notification.service';

const AppBar = styled(MuiAppBar)(({ theme }) => ({
    borderWidth: 0,
    borderBottomWidth: 1,
    borderStyle: 'solid',
    borderColor: (theme.vars ?? theme).palette.divider,
    boxShadow: designTokens.shadows.none,
    zIndex: theme.zIndex.drawer + 1,
    transition: `all ${designTokens.transitions.duration.standard}ms ${designTokens.transitions.easing.easeInOut}`,
}));

const LogoContainer = styled('div')({
    position: 'relative',
    height: 40,
    display: 'flex',
    alignItems: 'center',
    '& img': {
        maxHeight: 40,
    },
    transition: `transform ${designTokens.transitions.duration.short}ms ${designTokens.transitions.easing.easeInOut}`,
    '&:hover': {
        transform: 'scale(1.02)',
    },
});

/**
 * DashboardHeader Component
 * 
 * Top navigation bar with branding, user profile, notifications, and theme toggle.
 * Provides consistent header across all dashboard pages.
 * 
 * Features:
 * - Collapsible menu toggle
 * - Live clock display
 * - Theme switcher (light/dark mode)
 * - Notification center with real-time updates
 * - User profile menu with logout
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.logo - Logo component to display
 * @param {string} props.title - Application title
 * @param {boolean} props.menuOpen - Whether the sidebar menu is open
 * @param {Function} props.onToggleMenu - Callback to toggle menu state
 * @param {Object} props.user - Current user object
 */
function DashboardHeader({ logo, title, menuOpen, onToggleMenu, user }) {
    const theme = useTheme();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { logout, isAuthenticated } = useAuth();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [notificationAnchorEl, setNotificationAnchorEl] = React.useState(null);
    const [notifications, setNotifications] = React.useState([]);
    const [currentTime, setCurrentTime] = React.useState(new Date());
    const [userProfilePicture, setUserProfilePicture] = React.useState(getUserProfilePicture(user));
    const profileMenuOpen = Boolean(anchorEl);
    const notificationMenuOpen = Boolean(notificationAnchorEl);

    // Update profile picture when user prop changes
    React.useEffect(() => {
        const newProfilePicture = getUserProfilePicture(user);
        setUserProfilePicture(newProfilePicture);
    }, [user]);

    // Update time every second
    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);


    // Define fetchNotifications before useEffect that uses it
    const fetchNotifications = React.useCallback(async () => {
        // Early return if not authenticated or no user
        if (!isAuthenticated || !user || !user._id) {
            console.log('🔔 Skipping notification fetch - user not authenticated or no user ID');
            return;
        }

        try {
            console.log('🔔 Fetching notifications...');
            // Fetch notifications from the notification API
            const notificationData = await notificationService.getAll();
            console.log('📡 Notification response:', notificationData);

            const notifications = Array.isArray(notificationData) ? notificationData : (notificationData.data || []);
            console.log('📊 Processed notifications:', notifications);
            console.log('📈 Notifications length:', notifications.length);

            // Filter to show only unread notifications and sort by date
            const unreadNotifications = notifications
                .filter(n => !n.isRead)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10);

            console.log('🔔 Unread notifications:', unreadNotifications);
            setNotifications(unreadNotifications);
        } catch (error) {
            console.error('❌ Error fetching notifications:', error);
            console.error('📋 Error details:', {
                message: error.message,
                status: error.status,
                data: error.data
            });

            // Fallback to empty array if API fails
            setNotifications([]);
        }
    }, [isAuthenticated, user]);

    // Fetch notifications
    React.useEffect(() => {
        // Only fetch notifications if user is authenticated and has an ID
        if (user && user._id && isAuthenticated) {
            fetchNotifications();
            // Refresh notifications every 60 seconds
            const interval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [user, fetchNotifications, isAuthenticated]);

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
                                    src={userProfilePicture}
                                    alt={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'}
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
                                    {!userProfilePicture && getUserInitials(user)}
                                </Avatar >
                            </IconButton >
                        </Tooltip >

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
                                {user?.firstName || user?.email?.split('@')[0] || 'User'}
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
                    </Stack >
                </Stack >
            </Toolbar >

            {/* Profile Menu */}
            < Menu
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
                }
                }
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ px: 2.5, py: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        {user?.email || ''}
                    </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <MenuItem onClick={handleProfileClose} component={Link} to={getCompanyRoute("/profile")}>
                    <ListItemIcon>
                        <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2">Profile</Typography>
                </MenuItem>
                <MenuItem onClick={handleProfileClose} component={Link} to={getCompanyRoute("/settings")}>
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
            </Menu >

            {/* Notifications Menu */}
            < Menu
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
                {
                    notifications.length > 0 ? (
                        <Box sx={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                            {notifications.map((notification) => {
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

                                    }

                                    handleNotificationClose();

                                    // Navigate to appropriate page based on type
                                    if (notifType === 'leave') {
                                        navigate(getCompanyRoute('/leaves'));
                                    } else if (notifType === 'permission') {
                                        navigate(getCompanyRoute('/permissions'));
                                    } else if (notifType === 'announcement') {
                                        navigate(getCompanyRoute('/announcements'));
                                    } else if (notifType === 'event') {
                                        navigate(getCompanyRoute('/events'));
                                    } else if (notifType === 'request' || notifType === 'request-control') {
                                        if (notification.relatedId) {
                                            navigate(getCompanyRoute(`/requests/${notification.relatedId}`));
                                        } else {
                                            navigate(getCompanyRoute('/requests'));
                                        }
                                    } else if (notifType === 'attendance') {
                                        navigate(getCompanyRoute('/attendance'));
                                    } else if (notifType === 'payroll') {
                                        navigate(getCompanyRoute('/payroll'));
                                    } else {
                                        // Default: navigate to requests list
                                        navigate(getCompanyRoute('/requests'));
                                    }

                                    // Refresh notifications after marking as read
                                    setTimeout(fetchNotifications, 500);
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
                                navigate(getCompanyRoute('/requests'));
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
