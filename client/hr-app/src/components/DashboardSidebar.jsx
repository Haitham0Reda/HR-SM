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
import MonitorIcon from '@mui/icons-material/Monitor';
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
import PolicyIcon from '@mui/icons-material/Policy';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import { matchPath, useLocation } from 'react-router';
import { useAuth } from '../store/providers/ReduxAuthProvider';
import { useModules } from '../store/providers/ReduxModuleProvider';
import { useCompanyRouting } from '../hooks/useCompanyRouting';
import DashboardSidebarContext from '../context/DashboardSidebarContext';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from '../constants';
import DashboardSidebarPageItem from './DashboardSidebarPageItem';
import DashboardSidebarHeaderItem from './DashboardSidebarHeaderItem';
import DashboardSidebarDividerItem from './DashboardSidebarDividerItem';
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
        if (pathname.startsWith(getCompanyRoute('/system-settings')) && !expandedItemIds.includes('settings')) {
            setExpandedItemIds((prev) => [...prev, 'settings']);
        }
    }, [pathname, expandedItemIds, getCompanyRoute]);

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
    const { isModuleEnabled } = useModules();
    const { getCompanyRoute } = useCompanyRouting();

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
            
            // Communication module (announcements, events, surveys)
            'announcements': 'announcements',
            'events': 'events',
            'surveys': 'surveys',
            
            // Reporting module
            'reports': 'reports',
            'analytics': 'reports',
            
            // Tasks module
            'tasks': 'tasks',
            
            // Life Insurance module
            'insurance': 'life-insurance',
            
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
                            href={getCompanyRoute('/dashboard')}
                            selected={!!matchPath(getCompanyRoute('/dashboard'), pathname)}
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
                                        href={getCompanyRoute("/missions")}
                                        selected={pathname.startsWith(getCompanyRoute('/missions'))}
                                        locked={isMenuItemLocked('missions')}
                                    />
                                )}
                                {shouldShowMenuItem('sick-leaves') && (
                                    <DashboardSidebarPageItem
                                        id="sick-leaves"
                                        title="Sick Leaves"
                                        icon={<LocalHospitalIcon />}
                                        href={getCompanyRoute("/sick-leaves")}
                                        selected={pathname.startsWith(getCompanyRoute('/sick-leaves'))}
                                        locked={isMenuItemLocked('sick-leaves')}
                                    />
                                )}
                                {userRole === 'doctor' && shouldShowMenuItem('doctor-review-queue') && (
                                    <DashboardSidebarPageItem
                                        id="doctor-review-queue"
                                        title="Doctor Review Queue"
                                        icon={<MedicalServicesIcon />}
                                        href={getCompanyRoute("/sick-leaves/doctor-queue")}
                                        selected={!!matchPath(getCompanyRoute('/sick-leaves/doctor-queue'), pathname)}
                                        locked={isMenuItemLocked('doctor-review-queue')}
                                    />
                                )}
                                {shouldShowMenuItem('permissions') && (
                                    <DashboardSidebarPageItem
                                        id="permissions"
                                        title="Permissions"
                                        icon={<AccessAlarmIcon />}
                                        href={getCompanyRoute("/permissions")}
                                        selected={pathname.startsWith(getCompanyRoute('/permissions'))}
                                        locked={isMenuItemLocked('permissions')}
                                    />
                                )}
                                {shouldShowMenuItem('overtime') && (
                                    <DashboardSidebarPageItem
                                        id="overtime"
                                        title="Overtime"
                                        icon={<AccessTimeIcon />}
                                        href={getCompanyRoute("/overtime")}
                                        selected={pathname.startsWith(getCompanyRoute('/overtime'))}
                                        locked={isMenuItemLocked('overtime')}
                                    />
                                )}
                                {shouldShowMenuItem('vacation-requests') && (
                                    <DashboardSidebarPageItem
                                        id="vacation-requests"
                                        title="Vacation Requests"
                                        icon={<BeachAccessIcon />}
                                        href={getCompanyRoute("/vacation-requests")}
                                        selected={pathname.startsWith(getCompanyRoute('/vacation-requests'))}
                                        locked={isMenuItemLocked('vacation-requests')}
                                    />
                                )}
                                {shouldShowMenuItem('forget-checks') && (
                                    <DashboardSidebarPageItem
                                        id="forget-checks"
                                        title="Forget Check"
                                        icon={<ErrorOutlineIcon />}
                                        href={getCompanyRoute("/forget-checks")}
                                        selected={!!matchPath(getCompanyRoute('/forget-checks'), pathname)}
                                        locked={isMenuItemLocked('forget-checks')}
                                    />
                                )}
                                {shouldShowMenuItem('tasks') && (
                                    <DashboardSidebarPageItem
                                        id="tasks"
                                        title="Tasks"
                                        icon={<AssignmentIcon />}
                                        href={getCompanyRoute("/tasks")}
                                        selected={pathname.startsWith(getCompanyRoute('/tasks'))}
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
                                        href={getCompanyRoute("/attendance")}
                                        selected={!!matchPath(getCompanyRoute('/attendance'), pathname)}
                                        locked={isMenuItemLocked('my-attendance')}
                                    />
                                )}
                                {shouldShowMenuItem('my-requests') && (
                                    <DashboardSidebarPageItem
                                        id="my-requests"
                                        title="My Requests"
                                        icon={<RequestPageIcon />}
                                        href={getCompanyRoute("/requests")}
                                        selected={!!matchPath(getCompanyRoute('/requests'), pathname)}
                                        locked={isMenuItemLocked('my-requests')}
                                    />
                                )}
                                {shouldShowMenuItem('documents') && (
                                    <DashboardSidebarPageItem
                                        id="documents"
                                        title="Documents"
                                        icon={<DescriptionIcon />}
                                        href={getCompanyRoute("/documents")}
                                        selected={!!matchPath(getCompanyRoute('/documents'), pathname)}
                                        locked={isMenuItemLocked('documents')}
                                    />
                                )}
                                {shouldShowMenuItem('hard-copies') && (
                                    <DashboardSidebarPageItem
                                        id="hard-copies"
                                        title="Hard Copies"
                                        icon={<DescriptionIcon />}
                                        href={getCompanyRoute("/hardcopies")}
                                        selected={!!matchPath(getCompanyRoute('/hardcopies'), pathname)}
                                        locked={isMenuItemLocked('hard-copies')}
                                    />
                                )}
                                {shouldShowMenuItem('announcements') && (
                                    <DashboardSidebarPageItem
                                        id="announcements"
                                        title="Announcements"
                                        icon={<AnnouncementIcon />}
                                        href={getCompanyRoute("/announcements")}
                                        selected={!!matchPath(getCompanyRoute('/announcements'), pathname)}
                                        locked={isMenuItemLocked('announcements')}
                                    />
                                )}
                                {shouldShowMenuItem('events') && (
                                    <DashboardSidebarPageItem
                                        id="events"
                                        title="Events"
                                        icon={<EventIcon />}
                                        href={getCompanyRoute("/events")}
                                        selected={!!matchPath(getCompanyRoute('/events'), pathname)}
                                        locked={isMenuItemLocked('events')}
                                    />
                                )}
                                {shouldShowMenuItem('surveys') && (
                                    <DashboardSidebarPageItem
                                        id="surveys"
                                        title="Surveys"
                                        icon={<PollIcon />}
                                        href={getCompanyRoute("/surveys")}
                                        selected={!!matchPath(getCompanyRoute('/surveys'), pathname)}
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
                                        href={getCompanyRoute("/departments")}
                                        selected={!!matchPath(getCompanyRoute('/departments'), pathname)}
                                        locked={isMenuItemLocked('departments')}
                                    />
                                )}
                                {shouldShowMenuItem('positions') && (
                                    <DashboardSidebarPageItem
                                        id="positions"
                                        title="Positions"
                                        icon={<WorkIcon />}
                                        href={getCompanyRoute("/positions")}
                                        selected={!!matchPath(getCompanyRoute('/positions'), pathname)}
                                        locked={isMenuItemLocked('positions')}
                                    />
                                )}
                                {shouldShowMenuItem('users') && (
                                    <DashboardSidebarPageItem
                                        id="users"
                                        title="Users"
                                        icon={<PersonIcon />}
                                        href={getCompanyRoute("/users")}
                                        selected={!!matchPath(getCompanyRoute('/users'), pathname)}
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
                                        href={getCompanyRoute("/attendance")}
                                        selected={!!matchPath(getCompanyRoute('/attendance'), pathname)}
                                        locked={isMenuItemLocked('attendance')}
                                    />
                                )}
                                {shouldShowMenuItem('forget-checks') && (
                                    <DashboardSidebarPageItem
                                        id="forget-checks"
                                        title="Forget Check"
                                        icon={<ErrorOutlineIcon />}
                                        href={getCompanyRoute("/forget-checks")}
                                        selected={!!matchPath(getCompanyRoute('/forget-checks'), pathname)}
                                        locked={isMenuItemLocked('forget-checks')}
                                    />
                                )}
                                {shouldShowMenuItem('missions') && (
                                    <DashboardSidebarPageItem
                                        id="missions"
                                        title="Missions"
                                        icon={<FlightTakeoffIcon />}
                                        href={getCompanyRoute("/missions")}
                                        selected={pathname.startsWith(getCompanyRoute('/missions'))}
                                        locked={isMenuItemLocked('missions')}
                                    />
                                )}
                                {shouldShowMenuItem('sick-leaves') && (
                                    <DashboardSidebarPageItem
                                        id="sick-leaves"
                                        title="Sick Leaves"
                                        icon={<LocalHospitalIcon />}
                                        href={getCompanyRoute("/sick-leaves")}
                                        selected={pathname.startsWith(getCompanyRoute('/sick-leaves'))}
                                        locked={isMenuItemLocked('sick-leaves')}
                                    />
                                )}
                                {shouldShowMenuItem('permissions') && (
                                    <DashboardSidebarPageItem
                                        id="permissions"
                                        title="Permissions"
                                        icon={<AccessAlarmIcon />}
                                        href={getCompanyRoute("/permissions")}
                                        selected={pathname.startsWith(getCompanyRoute('/permissions'))}
                                        locked={isMenuItemLocked('permissions')}
                                    />
                                )}
                                {shouldShowMenuItem('overtime') && (
                                    <DashboardSidebarPageItem
                                        id="overtime"
                                        title="Overtime"
                                        icon={<AccessTimeIcon />}
                                        href={getCompanyRoute("/overtime")}
                                        selected={pathname.startsWith(getCompanyRoute('/overtime'))}
                                        locked={isMenuItemLocked('overtime')}
                                    />
                                )}
                                {shouldShowMenuItem('vacation-requests') && (
                                    <DashboardSidebarPageItem
                                        id="vacation-requests"
                                        title="Vacation Requests"
                                        icon={<BeachAccessIcon />}
                                        href={getCompanyRoute("/vacation-requests")}
                                        selected={pathname.startsWith(getCompanyRoute('/vacation-requests'))}
                                        locked={isMenuItemLocked('vacation-requests')}
                                    />
                                )}
                                {shouldShowMenuItem('requests') && (
                                    <DashboardSidebarPageItem
                                        id="requests"
                                        title="Requests"
                                        icon={<RequestPageIcon />}
                                        href={getCompanyRoute("/requests")}
                                        selected={!!matchPath(getCompanyRoute('/requests'), pathname)}
                                        locked={isMenuItemLocked('requests')}
                                    />
                                )}
                                {shouldShowMenuItem('payroll') && (
                                    <DashboardSidebarPageItem
                                        id="payroll"
                                        title="Payroll"
                                        icon={<PaymentIcon />}
                                        href={getCompanyRoute("/payroll")}
                                        selected={!!matchPath(getCompanyRoute('/payroll'), pathname)}
                                        locked={isMenuItemLocked('payroll')}
                                    />
                                )}
                                {shouldShowMenuItem('insurance') && (
                                    <DashboardSidebarPageItem
                                        id="insurance"
                                        title="Life Insurance"
                                        icon={<HealthAndSafetyIcon />}
                                        href={getCompanyRoute("/insurance/policies")}
                                        selected={pathname.startsWith(getCompanyRoute('/insurance'))}
                                        locked={isMenuItemLocked('insurance')}
                                    />
                                )}

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Task Management</DashboardSidebarHeaderItem>
                                {shouldShowMenuItem('tasks') && (
                                    <DashboardSidebarPageItem
                                        id="tasks"
                                        title="Tasks"
                                        icon={<AssignmentIcon />}
                                        href={getCompanyRoute("/tasks")}
                                        selected={pathname.startsWith(getCompanyRoute('/tasks'))}
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
                                        href={getCompanyRoute("/documents")}
                                        selected={!!matchPath(getCompanyRoute('/documents'), pathname)}
                                        locked={isMenuItemLocked('documents')}
                                    />
                                )}
                                {shouldShowMenuItem('hard-copies') && (
                                    <DashboardSidebarPageItem
                                        id="hard-copies"
                                        title="Hard Copies"
                                        icon={<DescriptionIcon />}
                                        href={getCompanyRoute("/hardcopies")}
                                        selected={!!matchPath(getCompanyRoute('/hardcopies'), pathname)}
                                        locked={isMenuItemLocked('hard-copies')}
                                    />
                                )}
                                {shouldShowMenuItem('templates') && (
                                    <DashboardSidebarPageItem
                                        id="templates"
                                        title="Templates"
                                        icon={<ArticleIcon />}
                                        href={getCompanyRoute("/templates")}
                                        selected={!!matchPath(getCompanyRoute('/templates'), pathname)}
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
                                        href={getCompanyRoute("/announcements")}
                                        selected={!!matchPath(getCompanyRoute('/announcements'), pathname)}
                                        locked={isMenuItemLocked('announcements')}
                                    />
                                )}
                                {shouldShowMenuItem('events') && (
                                    <DashboardSidebarPageItem
                                        id="events"
                                        title="Events"
                                        icon={<EventIcon />}
                                        href={getCompanyRoute("/events")}
                                        selected={!!matchPath(getCompanyRoute('/events'), pathname)}
                                        locked={isMenuItemLocked('events')}
                                    />
                                )}
                                {shouldShowMenuItem('surveys') && (
                                    <DashboardSidebarPageItem
                                        id="surveys"
                                        title="Surveys"
                                        icon={<PollIcon />}
                                        href={getCompanyRoute("/surveys")}
                                        selected={!!matchPath(getCompanyRoute('/surveys'), pathname)}
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
                                        href={getCompanyRoute("/dashboard/edit")}
                                        selected={!!matchPath(getCompanyRoute('/dashboard/edit'), pathname)}
                                        locked={isMenuItemLocked('dashboard-edit')}
                                    />
                                )}
                                {shouldShowMenuItem('holidays') && (
                                    <DashboardSidebarPageItem
                                        id="holidays"
                                        title="Holidays"
                                        icon={<CalendarTodayIcon />}
                                        href={getCompanyRoute("/holidays")}
                                        selected={!!matchPath(getCompanyRoute('/holidays'), pathname)}
                                        locked={isMenuItemLocked('holidays')}
                                    />
                                )}
                                {shouldShowMenuItem('reports') && (
                                    <DashboardSidebarPageItem
                                        id="reports"
                                        title="Reports"
                                        icon={<BarChartIcon />}
                                        href={getCompanyRoute("/reports")}
                                        selected={!!matchPath(getCompanyRoute('/reports'), pathname)}
                                        locked={isMenuItemLocked('reports')}
                                    />
                                )}
                                {shouldShowMenuItem('analytics') && (
                                    <DashboardSidebarPageItem
                                        id="analytics"
                                        title="Analytics"
                                        icon={<AssessmentIcon />}
                                        href={getCompanyRoute("/analytics")}
                                        selected={!!matchPath(getCompanyRoute('/analytics'), pathname)}
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
                                        href={getCompanyRoute("/departments")}
                                        selected={!!matchPath(getCompanyRoute('/departments'), pathname)}
                                        locked={isMenuItemLocked('departments')}
                                    />
                                )}
                                {shouldShowMenuItem('positions') && (
                                    <DashboardSidebarPageItem
                                        id="positions"
                                        title="Positions"
                                        icon={<WorkIcon />}
                                        href={getCompanyRoute("/positions")}
                                        selected={!!matchPath(getCompanyRoute('/positions'), pathname)}
                                        locked={isMenuItemLocked('positions')}
                                    />
                                )}
                                {shouldShowMenuItem('users') && (
                                    <DashboardSidebarPageItem
                                        id="users"
                                        title="Users"
                                        icon={<PersonIcon />}
                                        href={getCompanyRoute("/users")}
                                        selected={!!matchPath(getCompanyRoute('/users'), pathname)}
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
                                        href={getCompanyRoute("/attendance")}
                                        selected={!!matchPath(getCompanyRoute('/attendance'), pathname)}
                                        locked={isMenuItemLocked('attendance')}
                                    />
                                )}
                                {shouldShowMenuItem('forget-checks') && (
                                    <DashboardSidebarPageItem
                                        id="forget-checks"
                                        title="Forget Check"
                                        icon={<ErrorOutlineIcon />}
                                        href={getCompanyRoute("/forget-checks")}
                                        selected={!!matchPath(getCompanyRoute('/forget-checks'), pathname)}
                                        locked={isMenuItemLocked('forget-checks')}
                                    />
                                )}
                                {shouldShowMenuItem('missions') && (
                                    <DashboardSidebarPageItem
                                        id="missions"
                                        title="Missions"
                                        icon={<FlightTakeoffIcon />}
                                        href={getCompanyRoute("/missions")}
                                        selected={pathname.startsWith(getCompanyRoute('/missions'))}
                                        locked={isMenuItemLocked('missions')}
                                    />
                                )}
                                {shouldShowMenuItem('sick-leaves') && (
                                    <DashboardSidebarPageItem
                                        id="sick-leaves"
                                        title="Sick Leaves"
                                        icon={<LocalHospitalIcon />}
                                        href={getCompanyRoute("/sick-leaves")}
                                        selected={pathname.startsWith(getCompanyRoute('/sick-leaves'))}
                                        locked={isMenuItemLocked('sick-leaves')}
                                    />
                                )}
                                {shouldShowMenuItem('permissions') && (
                                    <DashboardSidebarPageItem
                                        id="permissions"
                                        title="Permissions"
                                        icon={<AccessAlarmIcon />}
                                        href={getCompanyRoute("/permissions")}
                                        selected={pathname.startsWith(getCompanyRoute('/permissions'))}
                                        locked={isMenuItemLocked('permissions')}
                                    />
                                )}
                                {shouldShowMenuItem('overtime') && (
                                    <DashboardSidebarPageItem
                                        id="overtime"
                                        title="Overtime"
                                        icon={<AccessTimeIcon />}
                                        href={getCompanyRoute("/overtime")}
                                        selected={pathname.startsWith(getCompanyRoute('/overtime'))}
                                        locked={isMenuItemLocked('overtime')}
                                    />
                                )}
                                {shouldShowMenuItem('vacation-requests') && (
                                    <DashboardSidebarPageItem
                                        id="vacation-requests"
                                        title="Vacation Requests"
                                        icon={<BeachAccessIcon />}
                                        href={getCompanyRoute("/vacation-requests")}
                                        selected={pathname.startsWith(getCompanyRoute('/vacation-requests'))}
                                        locked={isMenuItemLocked('vacation-requests')}
                                    />
                                )}
                                {shouldShowMenuItem('requests') && (
                                    <DashboardSidebarPageItem
                                        id="requests"
                                        title="Requests"
                                        icon={<RequestPageIcon />}
                                        href={getCompanyRoute("/requests")}
                                        selected={!!matchPath(getCompanyRoute('/requests'), pathname)}
                                        locked={isMenuItemLocked('requests')}
                                    />
                                )}
                                {shouldShowMenuItem('payroll') && (
                                    <DashboardSidebarPageItem
                                        id="payroll"
                                        title="Payroll"
                                        icon={<PaymentIcon />}
                                        href={getCompanyRoute("/payroll")}
                                        selected={!!matchPath(getCompanyRoute('/payroll'), pathname)}
                                        locked={isMenuItemLocked('payroll')}
                                    />
                                )}
                                {shouldShowMenuItem('insurance') && (
                                    <DashboardSidebarPageItem
                                        id="insurance"
                                        title="Life Insurance"
                                        icon={<HealthAndSafetyIcon />}
                                        href={getCompanyRoute("/insurance/policies")}
                                        selected={pathname.startsWith(getCompanyRoute('/insurance'))}
                                        locked={isMenuItemLocked('insurance')}
                                    />
                                )}
                                {shouldShowMenuItem('resigned') && (
                                    <DashboardSidebarPageItem
                                        id="resigned"
                                        title="Resigned Employees"
                                        icon={<PersonOffIcon />}
                                        href={getCompanyRoute("/resigned")}
                                        selected={!!matchPath(getCompanyRoute('/resigned'), pathname)}
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
                                        href={getCompanyRoute("/tasks")}
                                        selected={pathname.startsWith(getCompanyRoute('/tasks'))}
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
                                        href={getCompanyRoute("/documents")}
                                        selected={!!matchPath(getCompanyRoute('/documents'), pathname)}
                                        locked={isMenuItemLocked('documents')}
                                    />
                                )}
                                {shouldShowMenuItem('hard-copies') && (
                                    <DashboardSidebarPageItem
                                        id="hard-copies"
                                        title="Hard Copies"
                                        icon={<DescriptionIcon />}
                                        href={getCompanyRoute("/hardcopies")}
                                        selected={!!matchPath(getCompanyRoute('/hardcopies'), pathname)}
                                        locked={isMenuItemLocked('hard-copies')}
                                    />
                                )}
                                {shouldShowMenuItem('templates') && (
                                    <DashboardSidebarPageItem
                                        id="templates"
                                        title="Templates"
                                        icon={<ArticleIcon />}
                                        href={getCompanyRoute("/templates")}
                                        selected={!!matchPath(getCompanyRoute('/templates'), pathname)}
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
                                        href={getCompanyRoute("/announcements")}
                                        selected={!!matchPath(getCompanyRoute('/announcements'), pathname)}
                                        locked={isMenuItemLocked('announcements')}
                                    />
                                )}
                                {shouldShowMenuItem('events') && (
                                    <DashboardSidebarPageItem
                                        id="events"
                                        title="Events"
                                        icon={<EventIcon />}
                                        href={getCompanyRoute("/events")}
                                        selected={!!matchPath(getCompanyRoute('/events'), pathname)}
                                        locked={isMenuItemLocked('events')}
                                    />
                                )}
                                {shouldShowMenuItem('surveys') && (
                                    <DashboardSidebarPageItem
                                        id="surveys"
                                        title="Surveys"
                                        icon={<PollIcon />}
                                        href={getCompanyRoute("/surveys")}
                                        selected={!!matchPath(getCompanyRoute('/surveys'), pathname)}
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
                                        href={getCompanyRoute("/holidays")}
                                        selected={!!matchPath(getCompanyRoute('/holidays'), pathname)}
                                        locked={isMenuItemLocked('holidays')}
                                    />
                                )}
                                {shouldShowMenuItem('reports') && (
                                    <DashboardSidebarPageItem
                                        id="reports"
                                        title="Reports"
                                        icon={<BarChartIcon />}
                                        href={getCompanyRoute("/reports")}
                                        selected={!!matchPath(getCompanyRoute('/reports'), pathname)}
                                        locked={isMenuItemLocked('reports')}
                                    />
                                )}
                                {shouldShowMenuItem('analytics') && (
                                    <DashboardSidebarPageItem
                                        id="analytics"
                                        title="Analytics"
                                        icon={<AssessmentIcon />}
                                        href={getCompanyRoute("/analytics")}
                                        selected={!!matchPath(getCompanyRoute('/analytics'), pathname)}
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
                                        href={getCompanyRoute("/dashboard/edit")}
                                        selected={!!matchPath(getCompanyRoute('/dashboard/edit'), pathname)}
                                        locked={isMenuItemLocked('dashboard-edit')}
                                    />
                                )}
                                {shouldShowMenuItem('roles') && (
                                    <DashboardSidebarPageItem
                                        id="roles"
                                        title="Roles"
                                        icon={<AdminPanelSettingsIcon />}
                                        href={getCompanyRoute("/roles")}
                                        selected={pathname.startsWith(getCompanyRoute('/roles'))}
                                        locked={isMenuItemLocked('roles')}
                                    />
                                )}
                                {shouldShowMenuItem('settings') && (
                                    <DashboardSidebarPageItem
                                        id="settings"
                                        title="Settings"
                                        icon={<SettingsIcon />}
                                        href="#"
                                        selected={pathname.startsWith(getCompanyRoute('/system-settings'))}
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
                                                    href={getCompanyRoute("/system-settings")}
                                                    selected={!!matchPath(getCompanyRoute('/system-settings'), pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="seasonal-settings"
                                                    title="Seasonal Settings"
                                                    icon={<CelebrationIcon />}
                                                    href={getCompanyRoute("/system-settings/seasonal")}
                                                    selected={!!matchPath(getCompanyRoute('/system-settings/seasonal'), pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="request-submission"
                                                    title="Request Submission Control"
                                                    icon={<ToggleOnIcon />}
                                                    href={getCompanyRoute("/system-settings/request-control")}
                                                    selected={!!matchPath(getCompanyRoute('/system-settings/request-control'), pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="email-creation"
                                                    title="Employee Email Creation"
                                                    icon={<EmailIcon />}
                                                    href={getCompanyRoute("/system-settings/email-creation")}
                                                    selected={!!matchPath(getCompanyRoute('/system-settings/email-creation'), pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="email-management"
                                                    title="Employee Email Management"
                                                    icon={<ManageAccountsIcon />}
                                                    href={getCompanyRoute("/system-settings/email-management")}
                                                    selected={!!matchPath(getCompanyRoute('/system-settings/email-management'), pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="maintenance-settings"
                                                    title="Maintenance Settings"
                                                    icon={<BuildIcon />}
                                                    href={getCompanyRoute("/system-settings/maintenance")}
                                                    selected={!!matchPath(getCompanyRoute('/system-settings/maintenance'), pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="system-notifications"
                                                    title="System Notifications"
                                                    icon={<NotificationsIcon />}
                                                    href={getCompanyRoute("/system-settings/notifications")}
                                                    selected={!!matchPath(getCompanyRoute('/system-settings/notifications'), pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="hr-management-settings"
                                                    title="HR Management Settings"
                                                    icon={<GroupIcon />}
                                                    href={getCompanyRoute("/system-settings/hr-management")}
                                                    selected={!!matchPath(getCompanyRoute('/system-settings/hr-management'), pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="work-schedules"
                                                    title="Work Schedules"
                                                    icon={<ScheduleIcon />}
                                                    href={getCompanyRoute("/system-settings/work-schedules")}
                                                    selected={!!matchPath(getCompanyRoute('/system-settings/work-schedules'), pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="vacation-management-settings"
                                                    title="Vacation Management"
                                                    icon={<BeachAccessOutlinedIcon />}
                                                    href={getCompanyRoute("/system-settings/vacation-management")}
                                                    selected={!!matchPath(getCompanyRoute('/system-settings/vacation-management'), pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="mixed-vacation-policies"
                                                    title="Mixed Vacation Policies"
                                                    icon={<PolicyIcon />}
                                                    href={getCompanyRoute("/system-settings/mixed-vacation")}
                                                    selected={!!matchPath(getCompanyRoute('/system-settings/mixed-vacation'), pathname)}
                                                    isNested={true}
                                                />
                                                <DashboardSidebarPageItem
                                                    id="employee-of-month"
                                                    title="Employee of the Month"
                                                    icon={<EmojiEventsIcon />}
                                                    href={getCompanyRoute("/system-settings/employee-of-month")}
                                                    selected={!!matchPath(getCompanyRoute('/system-settings/employee-of-month'), pathname)}
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
                                        href={getCompanyRoute("/theme")}
                                        selected={!!matchPath(getCompanyRoute('/theme'), pathname)}
                                        locked={isMenuItemLocked('theme-editor')}
                                    />
                                )}
                                {shouldShowMenuItem('security') && (
                                    <DashboardSidebarPageItem
                                        id="security"
                                        title="Security"
                                        icon={<SecurityIcon />}
                                        href={getCompanyRoute("/security")}
                                        selected={!!matchPath(getCompanyRoute('/security'), pathname)}
                                        locked={isMenuItemLocked('security')}
                                    />
                                )}
                                <DashboardSidebarPageItem
                                    id="user-activity-tracker"
                                    title="User Activity Tracker"
                                    icon={<MonitorIcon />}
                                    href={getCompanyRoute('/user-activity-tracker')}
                                    selected={pathname.includes('/user-activity-tracker')}
                                />
                                {shouldShowMenuItem('backups') && (
                                    <DashboardSidebarPageItem
                                        id="backups"
                                        title="Backups"
                                        icon={<BackupIcon />}
                                        href={getCompanyRoute("/backups")}
                                        selected={!!matchPath(getCompanyRoute('/backups'), pathname)}
                                        locked={isMenuItemLocked('backups')}
                                    />
                                )}
                                {shouldShowMenuItem('license-status') && (
                                    <DashboardSidebarPageItem
                                        id="license-status"
                                        title="License Status"
                                        icon={<VerifiedUserIcon />}
                                        href={getCompanyRoute("/license-status")}
                                        selected={!!matchPath(getCompanyRoute('/license-status'), pathname)}
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
                                        href={getCompanyRoute("/documents")}
                                        selected={!!matchPath(getCompanyRoute('/documents'), pathname)}
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
            getCompanyRoute,
            isMenuItemLocked,
            shouldShowMenuItem,
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




