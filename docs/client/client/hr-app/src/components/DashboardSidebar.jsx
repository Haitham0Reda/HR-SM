import * as React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Toolbar from '@mui/material/Toolbar';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RequestPageIcon from '@mui/icons-material/RequestPage';
import PaymentIcon from '@mui/icons-material/Payment';
import DescriptionIcon from '@mui/icons-material/Description';
import ArticleIcon from '@mui/icons-material/Article';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import EventIcon from '@mui/icons-material/Event';
import PollIcon from '@mui/icons-material/Poll';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AccessAlarmIcon from '@mui/icons-material/AccessAlarm';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import BarChartIcon from '@mui/icons-material/BarChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import BackupIcon from '@mui/icons-material/Backup';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EditIcon from '@mui/icons-material/Edit';
import PaletteIcon from '@mui/icons-material/Palette';
import SettingsIcon from '@mui/icons-material/Settings';
import CelebrationIcon from '@mui/icons-material/Celebration';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import EmailIcon from '@mui/icons-material/Email';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import BuildIcon from '@mui/icons-material/Build';
import NotificationsIcon from '@mui/icons-material/Notifications';
import GroupIcon from '@mui/icons-material/Group';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PolicyIcon from '@mui/icons-material/Policy';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import DevicesIcon from '@mui/icons-material/Devices';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { matchPath, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useLicense } from '../context/LicenseContext';
import DashboardSidebarContext from '../context/DashboardSidebarContext';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from '../constants';
import DashboardSidebarPageItem from './DashboardSidebarPageItem';
import DashboardSidebarHeaderItem from './DashboardSidebarHeaderItem';
import DashboardSidebarDividerItem from './DashboardSidebarDividerItem';
import LockIcon from '@mui/icons-material/Lock';
import {
    getDrawerSxTransitionMixin,
    getDrawerWidthTransitionMixin,
} from '../mixins';

/**
 * DashboardSidebar Component
 * 
 * Collapsible navigation sidebar with hierarchical menu structure.
 * Adapts to different viewport sizes with drawer behavior on mobile.
 * 
 * Features:
 * - Collapsible/expandable behavior
 * - Icon-only mode when collapsed
 * - Nested navigation support
 * - Active route highlighting
 * - Role-based menu items
 * - Responsive drawer on mobile
 * 
 * @param {Object} props
 * @param {boolean} [props.expanded=true] - Whether the sidebar is expanded
 * @param {Function} props.setExpanded - Callback to set expanded state
 * @param {boolean} [props.disableCollapsibleSidebar=false] - Disable collapse functionality
 * @param {HTMLElement} [props.container] - Container element for the drawer
 */
function DashboardSidebar({
    expanded = true,
    setExpanded,
    disableCollapsibleSidebar = false,
    container,
}) {
    const theme = useTheme();

    const { pathname } = useLocation();

    // State for expanded menu items
    const [expandedItemIds, setExpandedItemIds] = React.useState([]);

    // Auto-expand Settings dropdown if on a settings page
    React.useEffect(() => {
        if (pathname.startsWith('/app/system-settings') && !expandedItemIds.includes('settings')) {
            setExpandedItemIds((prev) => [...prev, 'settings']);
        }
    }, [pathname, expandedItemIds]);

    const isOverSmViewport = useMediaQuery(theme.breakpoints.up('sm'));
    const isOverMdViewport = useMediaQuery(theme.breakpoints.up('md'));

    const [isFullyExpanded, setIsFullyExpanded] = React.useState(expanded);
    const [isFullyCollapsed, setIsFullyCollapsed] = React.useState(!expanded);

    React.useEffect(() => {
        if (expanded) {
            const drawerWidthTransitionTimeout = setTimeout(() => {
                setIsFullyExpanded(true);
            }, theme.transitions.duration.enteringScreen);

            return () => clearTimeout(drawerWidthTransitionTimeout);
        }

        setIsFullyExpanded(false);

        return () => { };
    }, [expanded, theme.transitions.duration.enteringScreen]);

    React.useEffect(() => {
        if (!expanded) {
            const drawerWidthTransitionTimeout = setTimeout(() => {
                setIsFullyCollapsed(true);
            }, theme.transitions.duration.leavingScreen);

            return () => clearTimeout(drawerWidthTransitionTimeout);
        }

        setIsFullyCollapsed(false);

        return () => { };
    }, [expanded, theme.transitions.duration.leavingScreen]);

    const mini = !disableCollapsibleSidebar && !expanded;

    const handleSetSidebarExpanded = React.useCallback(
        (newExpanded) => () => {
            setExpanded(newExpanded);
        },
        [setExpanded],
    );

    const handlePageItemClick = React.useCallback(
        (itemId, hasNestedNavigation) => {
            if (hasNestedNavigation && !mini) {
                setExpandedItemIds((previousValue) => {
                    const newValue = previousValue.includes(itemId)
                        ? previousValue.filter((previousValueItemId) => previousValueItemId !== itemId)
                        : [...previousValue, itemId];
                    return newValue;
                });
            } else if (!isOverSmViewport && !hasNestedNavigation) {
                setExpanded(false);
            }
        },
        [mini, setExpanded, isOverSmViewport],
    );

    const hasDrawerTransitions =
        isOverSmViewport && (!disableCollapsibleSidebar || isOverMdViewport);

    const { user } = useAuth();
    const userRole = user?.role || 'employee';
    const { isModuleEnabled } = useLicense();

    // Map menu item IDs to module keys
    const getModuleKeyForMenuItem = React.useCallback((itemId) => {
        const moduleMapping = {
            // Attendance module
            'attendance': 'attendance',
            'my-attendance': 'attendance',
            'forget-checks': 'attendance',
            
            // Leave module (missions, sick leaves, permissions, overtime, vacation)
            'missions': 'leave',
            'sick-leaves': 'leave',
            'doctor-review-queue': 'leave',
            'permissions': 'leave',
            'overtime': 'leave',
            'vacation-requests': 'leave',
            
            // Payroll module
            'payroll': 'payroll',
            
            // Documents module
            'documents': 'documents',
            'hard-copies': 'documents',
            'templates': 'documents',
            
            // Communication module
            'announcements': 'communication',
            'events': 'communication',
            'surveys': 'communication',
            
            // Reporting module
            'reports': 'reporting',
            'analytics': 'reporting',
            
            // Tasks module
            'tasks': 'tasks',
            
            // Core HR - always enabled (no module key needed)
            'dashboard': null,
            'departments': null,
            'positions': null,
            'users': null,
            'my-requests': null,
            'requests': null,
            'holidays': null,
            'dashboard-edit': null,
            'roles': null,
            'settings': null,
            'theme-editor': null,
            'security': null,
            'backups': null,
            'resigned': null,
            'license-status': null,
            'pricing': null,
        };
        
        return moduleMapping[itemId] || null;
    }, []);

    // Check if a menu item should be shown based on license
    const shouldShowMenuItem = React.useCallback((itemId) => {
        const moduleKey = getModuleKeyForMenuItem(itemId);
        
        // If no module key, it's Core HR - always show
        if (!moduleKey) {
            return true;
        }
        
        // Check if module is enabled
        return isModuleEnabled(moduleKey);
    }, [getModuleKeyForMenuItem, isModuleEnabled]);

    // Check if a menu item should be locked (shown but disabled)
    const isMenuItemLocked = React.useCallback((itemId) => {
        const moduleKey = getModuleKeyForMenuItem(itemId);
        
        // If no module key, it's Core HR - never locked
        if (!moduleKey) {
            return false;
        }
        
        // Item is locked if module is not enabled
        return !isModuleEnabled(moduleKey);
    }, [getModuleKeyForMenuItem, isModuleEnabled]);

    const getDrawerContent = React.useCallback(
        (viewport) => (
            <Box
                sx={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <Toolbar sx={{ flexShrink: 0 }} />
                <Box
                    component="nav"
                    aria-label={`${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}`}
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        pt: !mini ? 0 : 2,
                        '&::-webkit-scrollbar': {
                            width: '6px',
                        },
                        '&::-webkit-scrollbar-track': {
                            backgroundColor: 'transparent',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'divider',
                            borderRadius: '8px',
                            '&:hover': {
                                backgroundColor: 'text.secondary',
                            },
                        },
                        ...(hasDrawerTransitions
                            ? getDrawerSxTransitionMixin(isFullyExpanded, 'padding')
                            : {}),
                    }}
                >
                    <List
                        dense
                        sx={{
                            padding: mini ? 0 : 0.5,
                            mb: 4,
                            width: '100%',
                            maxWidth: mini ? MINI_DRAWER_WIDTH : DRAWER_WIDTH,
                        }}
                    >
                        {/* Common for all roles */}
                        <DashboardSidebarPageItem
                            id="dashboard"
                            title="Dashboard"
                            icon={<DashboardIcon />}
                            href="/app/dashboard"
                            selected={!!matchPath('/app/dashboard', pathname)}
                            sx={{
                                marginTop: 3,
                            }}
                        />

                        {/* Employee View - for employee, supervisor, manager, head-of-department, dean, doctor, id-card-admin */}
                        {['employee', 'supervisor', 'manager', 'head-of-department', 'doctor', 'id-card-admin'].includes(userRole) && (
                            <>
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>My Work</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('missions') && (
                                    <DashboardSidebarPageItem
                                        id="missions"
                                        title="Missions"
                                        icon={<FlightTakeoffIcon />}
                                        href="/app/missions"
                                        selected={pathname.startsWith('/app/missions')}
                                        locked={isMenuItemLocked('missions')}
                                    />
                                )}
                                {shouldShowMenuItem('sick-leaves') && (
                                    <DashboardSidebarPageItem
                                        id="sick-leaves"
                                        title="Sick Leaves"
                                        icon={<LocalHospitalIcon />}
                                        href="/app/sick-leaves"
                                        selected={pathname.startsWith('/app/sick-leaves')}
                                        locked={isMenuItemLocked('sick-leaves')}
                                    />
                                )}
                                {userRole === 'doctor' && shouldShowMenuItem('doctor-review-queue') && (
                                    <DashboardSidebarPageItem
                                        id="doctor-review-queue"
                                        title="Doctor Review Queue"
                                        icon={<MedicalServicesIcon />}
                                        href="/app/sick-leaves/doctor-queue"
                                        selected={!!matchPath('/app/sick-leaves/doctor-queue', pathname)}
                                        locked={isMenuItemLocked('doctor-review-queue')}
                                    />
                                )}
                                {shouldShowMenuItem('permissions') && (
                                    <DashboardSidebarPageItem
                                        id="permissions"
                                        title="Permissions"
                                        icon={<AccessAlarmIcon />}
                                        href="/app/permissions"
                                        selected={pathname.startsWith('/app/permissions')}
                                        locked={isMenuItemLocked('permissions')}
                                    />
                                )}
                                {shouldShowMenuItem('overtime') && (
                                    <DashboardSidebarPageItem
                                        id="overtime"
                                        title="Overtime"
                                        icon={<AccessTimeIcon />}
                                        href="/app/overtime"
                                        selected={pathname.startsWith('/app/overtime')}
                                        locked={isMenuItemLocked('overtime')}
                                    />
                                )}
                                {shouldShowMenuItem('vacation-requests') && (
                                    <DashboardSidebarPageItem
                                        id="vacation-requests"
                                        title="Vacation Requests"
                                        icon={<BeachAccessIcon />}
                                        href="/app/vacation-requests"
                                        selected={pathname.startsWith('/app/vacation-requests')}
                                        locked={isMenuItemLocked('vacation-requests')}
                                    />
                                )}
                                {shouldShowMenuItem('forget-checks') && (
                                    <DashboardSidebarPageItem
                                        id="forget-checks"
                                        title="Forget Check"
                                        icon={<ErrorOutlineIcon />}
                                        href="/app/forget-checks"
                                        selected={!!matchPath('/app/forget-checks', pathname)}
                                        locked={isMenuItemLocked('forget-checks')}
                                    />
                                )}
                                {shouldShowMenuItem('tasks') && (
                                    <DashboardSidebarPageItem
                                        id="tasks"
                                        title="Tasks"
                                        icon={<AssignmentIcon />}
                                        href="/app/tasks"
                                        selected={pathname.startsWith('/app/tasks')}
                                        locked={isMenuItemLocked('tasks')}
                                    />
                                )}
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Information</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('my-attendance') && (
                                    <DashboardSidebarPageItem
                                        id="my-attendance"
                                        title="My Attendance"
                                        icon={<AccessTimeIcon />}
                                        href="/app/attendance"
                                        selected={!!matchPath('/app/attendance', pathname)}
                                        locked={isMenuItemLocked('my-attendance')}
                                    />
                                )}
                                {shouldShowMenuItem('my-requests') && (
                                    <DashboardSidebarPageItem
                                        id="my-requests"
                                        title="My Requests"
                                        icon={<RequestPageIcon />}
                                        href="/app/requests"
                                        selected={!!matchPath('/app/requests', pathname)}
                                        locked={isMenuItemLocked('my-requests')}
                                    />
                                )}
                                {shouldShowMenuItem('documents') && (
                                    <DashboardSidebarPageItem
                                        id="documents"
                                        title="Documents"
                                        icon={<DescriptionIcon />}
                                        href="/app/documents"
                                        selected={!!matchPath('/app/documents', pathname)}
                                        locked={isMenuItemLocked('documents')}
                                    />
                                )}
                                {shouldShowMenuItem('hard-copies') && (
                                    <DashboardSidebarPageItem
                                        id="hard-copies"
                                        title="Hard Copies"
                                        icon={<DescriptionIcon />}
                                        href="/app/hardcopies"
                                        selected={!!matchPath('/app/hardcopies', pathname)}
                                        locked={isMenuItemLocked('hard-copies')}
                                    />
                                )}
                                {shouldShowMenuItem('announcements') && (
                                    <DashboardSidebarPageItem
                                        id="announcements"
                                        title="Announcements"
                                        icon={<AnnouncementIcon />}
                                        href="/app/announcements"
                                        selected={!!matchPath('/app/announcements', pathname)}
                                        locked={isMenuItemLocked('announcements')}
                                    />
                                )}
                                {shouldShowMenuItem('events') && (
                                    <DashboardSidebarPageItem
                                        id="events"
                                        title="Events"
                                        icon={<EventIcon />}
                                        href="/app/events"
                                        selected={!!matchPath('/app/events', pathname)}
                                        locked={isMenuItemLocked('events')}
                                    />
                                )}
                                {shouldShowMenuItem('surveys') && (
                                    <DashboardSidebarPageItem
                                        id="surveys"
                                        title="Surveys"
                                        icon={<PollIcon />}
                                        href="/app/surveys"
                                        selected={!!matchPath('/app/surveys', pathname)}
                                        locked={isMenuItemLocked('surveys')}
                                    />
                                )}
                            </>
                        )}

                        {/* HR View */}
                        {userRole === 'hr' && (
                            <>
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Organization</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('departments') && (
                                    <DashboardSidebarPageItem
                                        id="departments"
                                        title="Departments"
                                        icon={<BusinessIcon />}
                                        href="/app/departments"
                                        selected={!!matchPath('/app/departments', pathname)}
                                        locked={isMenuItemLocked('departments')}
                                    />
                                )}
                                {shouldShowMenuItem('positions') && (
                                    <DashboardSidebarPageItem
                                        id="positions"
                                        title="Positions"
                                        icon={<WorkIcon />}
                                        href="/app/positions"
                                        selected={!!matchPath('/app/positions', pathname)}
                                        locked={isMenuItemLocked('positions')}
                                    />
                                )}
                                {shouldShowMenuItem('users') && (
                                    <DashboardSidebarPageItem
                                        id="users"
                                        title="Users"
                                        icon={<PersonIcon />}
                                        href="/app/users"
                                        selected={!!matchPath('/app/users', pathname)}
                                        locked={isMenuItemLocked('users')}
                                    />
                                )}

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>HR Operations</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('attendance') && (
                                    <DashboardSidebarPageItem
                                        id="attendance"
                                        title="Attendance Management"
                                        icon={<AccessTimeIcon />}
                                        href="/app/attendance"
                                        selected={!!matchPath('/app/attendance', pathname)}
                                        locked={isMenuItemLocked('attendance')}
                                    />
                                )}
                                {shouldShowMenuItem('forget-checks') && (
                                    <DashboardSidebarPageItem
                                        id="forget-checks"
                                        title="Forget Check"
                                        icon={<ErrorOutlineIcon />}
                                        href="/app/forget-checks"
                                        selected={!!matchPath('/app/forget-checks', pathname)}
                                        locked={isMenuItemLocked('forget-checks')}
                                    />
                                )}
                                {shouldShowMenuItem('missions') && (
                                    <DashboardSidebarPageItem
                                        id="missions"
                                        title="Missions"
                                        icon={<FlightTakeoffIcon />}
                                        href="/app/missions"
                                        selected={pathname.startsWith('/app/missions')}
                                        locked={isMenuItemLocked('missions')}
                                    />
                                )}
                                {shouldShowMenuItem('sick-leaves') && (
                                    <DashboardSidebarPageItem
                                        id="sick-leaves"
                                        title="Sick Leaves"
                                        icon={<LocalHospitalIcon />}
                                        href="/app/sick-leaves"
                                        selected={pathname.startsWith('/app/sick-leaves')}
                                        locked={isMenuItemLocked('sick-leaves')}
                                    />
                                )}
                                {shouldShowMenuItem('permissions') && (
                                    <DashboardSidebarPageItem
                                        id="permissions"
                                        title="Permissions"
                                        icon={<AccessAlarmIcon />}
                                        href="/app/permissions"
                                        selected={pathname.startsWith('/app/permissions')}
                                        locked={isMenuItemLocked('permissions')}
                                    />
                                )}
                                {shouldShowMenuItem('overtime') && (
                                    <DashboardSidebarPageItem
                                        id="overtime"
                                        title="Overtime"
                                        icon={<AccessTimeIcon />}
                                        href="/app/overtime"
                                        selected={pathname.startsWith('/app/overtime')}
                                        locked={isMenuItemLocked('overtime')}
                                    />
                                )}
                                {shouldShowMenuItem('vacation-requests') && (
                                    <DashboardSidebarPageItem
                                        id="vacation-requests"
                                        title="Vacation Requests"
                                        icon={<BeachAccessIcon />}
                                        href="/app/vacation-requests"
                                        selected={pathname.startsWith('/app/vacation-requests')}
                                        locked={isMenuItemLocked('vacation-requests')}
                                    />
                                )}
                                {shouldShowMenuItem('requests') && (
                                    <DashboardSidebarPageItem
                                        id="requests"
                                        title="Requests"
                                        icon={<RequestPageIcon />}
                                        href="/app/requests"
                                        selected={!!matchPath('/app/requests', pathname)}
                                        locked={isMenuItemLocked('requests')}
                                    />
                                )}
                                {shouldShowMenuItem('payroll') && (
                                    <DashboardSidebarPageItem
                                        id="payroll"
                                        title="Payroll"
                                        icon={<PaymentIcon />}
                                        href="/app/payroll"
                                        selected={!!matchPath('/app/payroll', pathname)}
                                        locked={isMenuItemLocked('payroll')}
                                    />
                                )}

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Task Management</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('tasks') && (
                                    <DashboardSidebarPageItem
                                        id="tasks"
                                        title="Tasks"
                                        icon={<AssignmentIcon />}
                                        href="/app/tasks"
                                        selected={pathname.startsWith('/app/tasks')}
                                        locked={isMenuItemLocked('tasks')}
                                    />
                                )}

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Documents</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('documents') && (
                                    <DashboardSidebarPageItem
                                        id="documents"
                                        title="Documents"
                                        icon={<DescriptionIcon />}
                                        href="/app/documents"
                                        selected={!!matchPath('/app/documents', pathname)}
                                        locked={isMenuItemLocked('documents')}
                                    />
                                )}
                                {shouldShowMenuItem('hard-copies') && (
                                    <DashboardSidebarPageItem
                                        id="hard-copies"
                                        title="Hard Copies"
                                        icon={<DescriptionIcon />}
                                        href="/app/hardcopies"
                                        selected={!!matchPath('/app/hardcopies', pathname)}
                                        locked={isMenuItemLocked('hard-copies')}
                                    />
                                )}
                                {shouldShowMenuItem('templates') && (
                                    <DashboardSidebarPageItem
                                        id="templates"
                                        title="Templates"
                                        icon={<ArticleIcon />}
                                        href="/app/templates"
                                        selected={!!matchPath('/app/templates', pathname)}
                                        locked={isMenuItemLocked('templates')}
                                    />
                                )}

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Communication</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('announcements') && (
                                    <DashboardSidebarPageItem
                                        id="announcements"
                                        title="Announcements"
                                        icon={<AnnouncementIcon />}
                                        href="/app/announcements"
                                        selected={!!matchPath('/app/announcements', pathname)}
                                        locked={isMenuItemLocked('announcements')}
                                    />
                                )}
                                {shouldShowMenuItem('events') && (
                                    <DashboardSidebarPageItem
                                        id="events"
                                        title="Events"
                                        icon={<EventIcon />}
                                        href="/app/events"
                                        selected={!!matchPath('/app/events', pathname)}
                                        locked={isMenuItemLocked('events')}
                                    />
                                )}
                                {shouldShowMenuItem('surveys') && (
                                    <DashboardSidebarPageItem
                                        id="surveys"
                                        title="Surveys"
                                        icon={<PollIcon />}
                                        href="/app/surveys"
                                        selected={!!matchPath('/app/surveys', pathname)}
                                        locked={isMenuItemLocked('surveys')}
                                    />
                                )}

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Advanced</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('dashboard-edit') && (
                                    <DashboardSidebarPageItem
                                        id="dashboard-edit"
                                        title="Dashboard Settings"
                                        icon={<EditIcon />}
                                        href="/app/dashboard/edit"
                                        selected={!!matchPath('/app/dashboard/edit', pathname)}
                                        locked={isMenuItemLocked('dashboard-edit')}
                                    />
                                )}
                                {shouldShowMenuItem('holidays') && (
                                    <DashboardSidebarPageItem
                                        id="holidays"
                                        title="Holidays"
                                        icon={<CalendarTodayIcon />}
                                        href="/app/holidays"
                                        selected={!!matchPath('/app/holidays', pathname)}
                                        locked={isMenuItemLocked('holidays')}
                                    />
                                )}
                                {shouldShowMenuItem('reports') && (
                                    <DashboardSidebarPageItem
                                        id="reports"
                                        title="Reports"
                                        icon={<BarChartIcon />}
                                        href="/app/reports"
                                        selected={!!matchPath('/app/reports', pathname)}
                                        locked={isMenuItemLocked('reports')}
                                    />
                                )}
                                {shouldShowMenuItem('analytics') && (
                                    <DashboardSidebarPageItem
                                        id="analytics"
                                        title="Analytics"
                                        icon={<AssessmentIcon />}
                                        href="/app/analytics"
                                        selected={!!matchPath('/app/analytics', pathname)}
                                        locked={isMenuItemLocked('analytics')}
                                    />
                                )}
                            </>
                        )}

                        {/* Admin View */}
                        {userRole === 'admin' && (
                            <>
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Organization</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('departments') && (
                                    <DashboardSidebarPageItem
                                        id="departments"
                                        title="Departments"
                                        icon={<BusinessIcon />}
                                        href="/app/departments"
                                        selected={!!matchPath('/app/departments', pathname)}
                                        locked={isMenuItemLocked('departments')}
                                    />
                                )}
                                {shouldShowMenuItem('positions') && (
                                    <DashboardSidebarPageItem
                                        id="positions"
                                        title="Positions"
                                        icon={<WorkIcon />}
                                        href="/app/positions"
                                        selected={!!matchPath('/app/positions', pathname)}
                                        locked={isMenuItemLocked('positions')}
                                    />
                                )}
                                {shouldShowMenuItem('users') && (
                                    <DashboardSidebarPageItem
                                        id="users"
                                        title="Users"
                                        icon={<PersonIcon />}
                                        href="/app/users"
                                        selected={!!matchPath('/app/users', pathname)}
                                        locked={isMenuItemLocked('users')}
                                    />
                                )}

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>HR Operations</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('attendance') && (
                                    <DashboardSidebarPageItem
                                        id="attendance"
                                        title="Attendance Management"
                                        icon={<AccessTimeIcon />}
                                        href="/app/attendance"
                                        selected={!!matchPath('/app/attendance', pathname)}
                                        locked={isMenuItemLocked('attendance')}
                                    />
                                )}
                                {shouldShowMenuItem('forget-checks') && (
                                    <DashboardSidebarPageItem
                                        id="forget-checks"
                                        title="Forget Check"
                                        icon={<ErrorOutlineIcon />}
                                        href="/app/forget-checks"
                                        selected={!!matchPath('/app/forget-checks', pathname)}
                                        locked={isMenuItemLocked('forget-checks')}
                                    />
                                )}
                                {shouldShowMenuItem('missions') && (
                                    <DashboardSidebarPageItem
                                        id="missions"
                                        title="Missions"
                                        icon={<FlightTakeoffIcon />}
                                        href="/app/missions"
                                        selected={pathname.startsWith('/app/missions')}
                                        locked={isMenuItemLocked('missions')}
                                    />
                                )}
                                {shouldShowMenuItem('sick-leaves') && (
                                    <DashboardSidebarPageItem
                                        id="sick-leaves"
                                        title="Sick Leaves"
                                        icon={<LocalHospitalIcon />}
                                        href="/app/sick-leaves"
                                        selected={pathname.startsWith('/app/sick-leaves')}
                                        locked={isMenuItemLocked('sick-leaves')}
                                    />
                                )}
                                {shouldShowMenuItem('permissions') && (
                                    <DashboardSidebarPageItem
                                        id="permissions"
                                        title="Permissions"
                                        icon={<AccessAlarmIcon />}
                                        href="/app/permissions"
                                        selected={pathname.startsWith('/app/permissions')}
                                        locked={isMenuItemLocked('permissions')}
                                    />
                                )}
                                {shouldShowMenuItem('overtime') && (
                                    <DashboardSidebarPageItem
                                        id="overtime"
                                        title="Overtime"
                                        icon={<AccessTimeIcon />}
                                        href="/app/overtime"
                                        selected={pathname.startsWith('/app/overtime')}
                                        locked={isMenuItemLocked('overtime')}
                                    />
                                )}
                                {shouldShowMenuItem('vacation-requests') && (
                                    <DashboardSidebarPageItem
                                        id="vacation-requests"
                                        title="Vacation Requests"
                                        icon={<BeachAccessIcon />}
                                        href="/app/vacation-requests"
                                        selected={pathname.startsWith('/app/vacation-requests')}
                                        locked={isMenuItemLocked('vacation-requests')}
                                    />
                                )}
                                {shouldShowMenuItem('requests') && (
                                    <DashboardSidebarPageItem
                                        id="requests"
                                        title="Requests"
                                        icon={<RequestPageIcon />}
                                        href="/app/requests"
                                        selected={!!matchPath('/app/requests', pathname)}
                                        locked={isMenuItemLocked('requests')}
                                    />
                                )}
                                {shouldShowMenuItem('payroll') && (
                                    <DashboardSidebarPageItem
                                        id="payroll"
                                        title="Payroll"
                                        icon={<PaymentIcon />}
                                        href="/app/payroll"
                                        selected={!!matchPath('/app/payroll', pathname)}
                                        locked={isMenuItemLocked('payroll')}
                                    />
                                )}
                                {shouldShowMenuItem('resigned') && (
                                    <DashboardSidebarPageItem
                                        id="resigned"
                                        title="Resigned Employees"
                                        icon={<PersonOffIcon />}
                                        href="/app/resigned"
                                        selected={!!matchPath('/app/resigned', pathname)}
                                        locked={isMenuItemLocked('resigned')}
                                    />
                                )}

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Task Management</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('tasks') && (
                                    <DashboardSidebarPageItem
                                        id="tasks"
                                        title="Tasks"
                                        icon={<AssignmentIcon />}
                                        href="/app/tasks"
                                        selected={pathname.startsWith('/app/tasks')}
                                        locked={isMenuItemLocked('tasks')}
                                    />
                                )}

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Documents</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('documents') && (
                                    <DashboardSidebarPageItem
                                        id="documents"
                                        title="Documents"
                                        icon={<DescriptionIcon />}
                                        href="/app/documents"
                                        selected={!!matchPath('/app/documents', pathname)}
                                        locked={isMenuItemLocked('documents')}
                                    />
                                )}
                                {shouldShowMenuItem('hard-copies') && (
                                    <DashboardSidebarPageItem
                                        id="hard-copies"
                                        title="Hard Copies"
                                        icon={<DescriptionIcon />}
                                        href="/app/hardcopies"
                                        selected={!!matchPath('/app/hardcopies', pathname)}
                                        locked={isMenuItemLocked('hard-copies')}
                                    />
                                )}
                                {shouldShowMenuItem('templates') && (
                                    <DashboardSidebarPageItem
                                        id="templates"
                                        title="Templates"
                                        icon={<ArticleIcon />}
                                        href="/app/templates"
                                        selected={!!matchPath('/app/templates', pathname)}
                                        locked={isMenuItemLocked('templates')}
                                    />
                                )}

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Communication</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('announcements') && (
                                    <DashboardSidebarPageItem
                                        id="announcements"
                                        title="Announcements"
                                        icon={<AnnouncementIcon />}
                                        href="/app/announcements"
                                        selected={!!matchPath('/app/announcements', pathname)}
                                        locked={isMenuItemLocked('announcements')}
                                    />
                                )}
                                {shouldShowMenuItem('events') && (
                                    <DashboardSidebarPageItem
                                        id="events"
                                        title="Events"
                                        icon={<EventIcon />}
                                        href="/app/events"
                                        selected={!!matchPath('/app/events', pathname)}
                                        locked={isMenuItemLocked('events')}
                                    />
                                )}
                                {shouldShowMenuItem('surveys') && (
                                    <DashboardSidebarPageItem
                                        id="surveys"
                                        title="Surveys"
                                        icon={<PollIcon />}
                                        href="/app/surveys"
                                        selected={!!matchPath('/app/surveys', pathname)}
                                        locked={isMenuItemLocked('surveys')}
                                    />
                                )}

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Advanced</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('holidays') && (
                                    <DashboardSidebarPageItem
                                        id="holidays"
                                        title="Holidays"
                                        icon={<CalendarTodayIcon />}
                                        href="/app/holidays"
                                        selected={!!matchPath('/app/holidays', pathname)}
                                        locked={isMenuItemLocked('holidays')}
                                    />
                                )}
                                {shouldShowMenuItem('reports') && (
                                    <DashboardSidebarPageItem
                                        id="reports"
                                        title="Reports"
                                        icon={<BarChartIcon />}
                                        href="/app/reports"
                                        selected={!!matchPath('/app/reports', pathname)}
                                        locked={isMenuItemLocked('reports')}
                                    />
                                )}
                                {shouldShowMenuItem('analytics') && (
                                    <DashboardSidebarPageItem
                                        id="analytics"
                                        title="Analytics"
                                        icon={<AssessmentIcon />}
                                        href="/app/analytics"
                                        selected={!!matchPath('/app/analytics', pathname)}
                                        locked={isMenuItemLocked('analytics')}
                                    />
                                )}

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Administration</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('dashboard-edit') && (
                                    <DashboardSidebarPageItem
                                        id="dashboard-edit"
                                        title="Dashboard Settings"
                                        icon={<EditIcon />}
                                        href="/app/dashboard/edit"
                                        selected={!!matchPath('/app/dashboard/edit', pathname)}
                                        locked={isMenuItemLocked('dashboard-edit')}
                                    />
                                )}
                                {shouldShowMenuItem('roles') && (
                                    <DashboardSidebarPageItem
                                        id="roles"
                                        title="Roles"
                                        icon={<AdminPanelSettingsIcon />}
                                        href="/app/roles"
                                        selected={pathname.startsWith('/app/roles')}
                                        locked={isMenuItemLocked('roles')}
                                    />
                                )}
                                {shouldShowMenuItem('settings') && (
                                    <DashboardSidebarPageItem
                                        id="settings"
                                        title="Settings"
                                        icon={<SettingsIcon />}
                                        href="#"
                                        selected={pathname.startsWith('/app/system-settings')}
                                        expanded={expandedItemIds.includes('settings')}
                                        locked={isMenuItemLocked('settings')}
                                        nestedNavigation={
                                            <List dense sx={{
                                                bgcolor: 'rgba(0, 0, 0, 0.08)',
                                                py: 0.5,
                                                borderRadius: 1,
                                                mt: 0.5,
                                                px: 0,
                                                mx: 2,
                                                width: 'calc(100% - 32px)',
                                                overflow: 'hidden'
                                            }}>
                                                <DashboardSidebarPageItem
                                                    id="system-settings"
                                                    title="System Settings"
                                                    icon={<SettingsIcon />}
                                                    href="/app/system-settings"
                                                    selected={!!matchPath('/app/system-settings', pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="seasonal-settings"
                                                    title="Seasonal Settings"
                                                    icon={<CelebrationIcon />}
                                                    href="/app/system-settings/seasonal"
                                                    selected={!!matchPath('/app/system-settings/seasonal', pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="request-submission"
                                                    title="Request Submission Control"
                                                    icon={<ToggleOnIcon />}
                                                    href="/app/system-settings/request-control"
                                                    selected={!!matchPath('/app/system-settings/request-control', pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="email-creation"
                                                    title="Employee Email Creation"
                                                    icon={<EmailIcon />}
                                                    href="/app/system-settings/email-creation"
                                                    selected={!!matchPath('/app/system-settings/email-creation', pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="email-management"
                                                    title="Employee Email Management"
                                                    icon={<ManageAccountsIcon />}
                                                    href="/app/system-settings/email-management"
                                                    selected={!!matchPath('/app/system-settings/email-management', pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="maintenance-settings"
                                                    title="Maintenance Settings"
                                                    icon={<BuildIcon />}
                                                    href="/app/system-settings/maintenance"
                                                    selected={!!matchPath('/app/system-settings/maintenance', pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="system-notifications"
                                                    title="System Notifications"
                                                    icon={<NotificationsIcon />}
                                                    href="/app/system-settings/notifications"
                                                    selected={!!matchPath('/app/system-settings/notifications', pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="hr-management-settings"
                                                    title="HR Management Settings"
                                                    icon={<GroupIcon />}
                                                    href="/app/system-settings/hr-management"
                                                    selected={!!matchPath('/app/system-settings/hr-management', pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="work-schedules"
                                                    title="Work Schedules"
                                                    icon={<ScheduleIcon />}
                                                    href="/app/system-settings/work-schedules"
                                                    selected={!!matchPath('/app/system-settings/work-schedules', pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="vacation-management-settings"
                                                    title="Vacation Management"
                                                    icon={<BeachAccessOutlinedIcon />}
                                                    href="/app/system-settings/vacation-management"
                                                    selected={!!matchPath('/app/system-settings/vacation-management', pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="mixed-vacation-policies"
                                                    title="Mixed Vacation Policies"
                                                    icon={<PolicyIcon />}
                                                    href="/app/system-settings/mixed-vacation"
                                                    selected={!!matchPath('/app/system-settings/mixed-vacation', pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="employee-of-month"
                                                    title="Employee of the Month"
                                                    icon={<EmojiEventsIcon />}
                                                    href="/app/system-settings/employee-of-month"
                                                    selected={!!matchPath('/app/system-settings/employee-of-month', pathname)}
                                                    isNested={true}
                                                />
                                            </List>
                                        }
                                    />
                                )}
                                {shouldShowMenuItem('theme-editor') && (
                                    <DashboardSidebarPageItem
                                        id="theme-editor"
                                        title="Theme & Colors"
                                        icon={<PaletteIcon />}
                                        href="/app/theme"
                                        selected={!!matchPath('/app/theme', pathname)}
                                        locked={isMenuItemLocked('theme-editor')}
                                    />
                                )}
                                {shouldShowMenuItem('security') && (
                                    <DashboardSidebarPageItem
                                        id="security"
                                        title="Security"
                                        icon={<SecurityIcon />}
                                        href="/app/security"
                                        selected={!!matchPath('/app/security', pathname)}
                                        locked={isMenuItemLocked('security')}
                                    />
                                )}
                                {shouldShowMenuItem('backups') && (
                                    <DashboardSidebarPageItem
                                        id="backups"
                                        title="Backups"
                                        icon={<BackupIcon />}
                                        href="/app/backups"
                                        selected={!!matchPath('/app/backups', pathname)}
                                        locked={isMenuItemLocked('backups')}
                                    />
                                )}
                                {shouldShowMenuItem('license-status') && (
                                    <DashboardSidebarPageItem
                                        id="license-status"
                                        title="License Status"
                                        icon={<VerifiedUserIcon />}
                                        href="/app/license-status"
                                        selected={!!matchPath('/app/license-status', pathname)}
                                        locked={isMenuItemLocked('license-status')}
                                    />
                                )}
                            </>
                        )}

                        {/* ID Card Admin View */}
                        {userRole === 'id-card-admin' && (
                            <>
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>ID Card Management</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('documents') && (
                                    <DashboardSidebarPageItem
                                        id="documents"
                                        title="Documents"
                                        icon={<DescriptionIcon />}
                                        href="/app/documents"
                                        selected={!!matchPath('/app/documents', pathname)}
                                        locked={isMenuItemLocked('documents')}
                                    />
                                )}
                            </>
                        )}
                    </List>
                </Box>
            </Box>
        ),
        [
            hasDrawerTransitions,
            isFullyExpanded,
            mini,
            pathname,
            userRole,
            expandedItemIds,
        ],
    );

    return (
        <DashboardSidebarContext.Provider
            value={{
                expanded: isFullyExpanded && !isFullyCollapsed,
                mini,
                setExpanded: handleSetSidebarExpanded,
                onPageItemClick: handlePageItemClick,
                fullyExpanded: isFullyExpanded,
                fullyCollapsed: isFullyCollapsed,
            }}
        >
            <Drawer
                container={container}
                variant="permanent"
                anchor="left"
                sx={{
                    width: mini ? MINI_DRAWER_WIDTH : DRAWER_WIDTH,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box',
                    ...getDrawerWidthTransitionMixin(isFullyExpanded),
                }}
                PaperProps={{
                    sx: {
                        ...getDrawerWidthTransitionMixin(isFullyExpanded),
                        overflowX: 'hidden',
                        borderRight: 0,
                        boxShadow: 4,
                    },
                }}
            >
                {getDrawerContent('desktop')}
            </Drawer>
        </DashboardSidebarContext.Provider>
    );
}

DashboardSidebar.propTypes = {
    container: PropTypes.any,
    disableCollapsibleSidebar: PropTypes.bool,
    expanded: PropTypes.bool,
    setExpanded: PropTypes.func.isRequired,
};

export default DashboardSidebar;


