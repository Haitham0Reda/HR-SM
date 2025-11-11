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

function DashboardHeader({ logo, title, menuOpen, onToggleMenu, user, notificationCount = 0 }) {
    const theme = useTheme();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [notificationAnchorEl, setNotificationAnchorEl] = React.useState(null);
    const profileMenuOpen = Boolean(anchorEl);
    const notificationMenuOpen = Boolean(notificationAnchorEl);

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
        navigate('/login');
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
                        <Link to="/" style={{ textDecoration: 'none' }}>
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
                                    src={user?.profilePicture}
                                    alt={user?.name || 'User'}
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
                                    {!user?.profilePicture && user?.name
                                        ? user.name.charAt(0).toUpperCase()
                                        : <PersonIcon />}
                                </Avatar>
                            </IconButton>
                        </Tooltip>
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
                        {user?.name || 'User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        {user?.email || ''}
                    </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <MenuItem onClick={handleProfileClose} component={Link} to="/profile">
                    <ListItemIcon>
                        <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2">Profile</Typography>
                </MenuItem>
                <MenuItem onClick={handleProfileClose} component={Link} to="/settings">
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
                            minWidth: 320,
                            maxWidth: 400,
                            maxHeight: 500,
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
                </Box>
                {notificationCount > 0 ? (
                    <Box sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            You have {notificationCount} new notification{notificationCount > 1 ? 's' : ''}
                        </Typography>
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
                            No new notifications
                        </Typography>
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
        name: PropTypes.string,
        email: PropTypes.string,
        profilePicture: PropTypes.string,
    }),
    notificationCount: PropTypes.number,
};

export default DashboardHeader;