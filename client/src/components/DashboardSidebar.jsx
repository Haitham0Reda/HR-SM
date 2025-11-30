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
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AssignmentIcon from '@mui/icons-material/Assignment';
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
import { matchPath, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import DashboardSidebarContext from '../context/DashboardSidebarContext';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from '../constants';
import DashboardSidebarPageItem from './DashboardSidebarPageItem';
import DashboardSidebarHeaderItem from './DashboardSidebarHeaderItem';
import DashboardSidebarDividerItem from './DashboardSidebarDividerItem';
import {
    getDrawerSxTransitionMixin,
    getDrawerWidthTransitionMixin,
} from '../mixins';

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
    }, [pathname]);

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
            console.log('🔵 Clicked:', itemId, 'hasNested:', hasNestedNavigation, 'mini:', mini);
            if (hasNestedNavigation && !mini) {
                setExpandedItemIds((previousValue) => {
                    const newValue = previousValue.includes(itemId)
                        ? previousValue.filter((previousValueItemId) => previousValueItemId !== itemId)
                        : [...previousValue, itemId];
                    console.log('🟢 Expanded items:', previousValue, '->', newValue);
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
                                <DashboardSidebarPageItem
                                    id="missions"
                                    title="Missions"
                                    icon={<FlightTakeoffIcon />}
                                    href="/app/missions"
                                    selected={pathname.startsWith('/app/missions')}
                                />
                                <DashboardSidebarPageItem
                                    id="sick-leaves"
                                    title="Sick Leaves"
                                    icon={<LocalHospitalIcon />}
                                    href="/app/sick-leaves"
                                    selected={pathname.startsWith('/app/sick-leaves')}
                                />
                                {userRole === 'doctor' && (
                                    <DashboardSidebarPageItem
                                        id="doctor-review-queue"
                                        title="Doctor Review Queue"
                                        icon={<MedicalServicesIcon />}
                                        href="/app/sick-leaves/doctor-queue"
                                        selected={!!matchPath('/app/sick-leaves/doctor-queue', pathname)}
                                    />
                                )}
                                <DashboardSidebarPageItem
                                    id="permissions"
                                    title="Permissions"
                                    icon={<AccessAlarmIcon />}
                                    href="/app/permissions"
                                    selected={pathname.startsWith('/app/permissions')}
                                />
                                <DashboardSidebarPageItem
                                    id="overtime"
                                    title="Overtime"
                                    icon={<AccessTimeIcon />}
                                    href="/app/overtime"
                                    selected={pathname.startsWith('/app/overtime')}
                                />
                                <DashboardSidebarPageItem
                                    id="vacation-requests"
                                    title="Vacation Requests"
                                    icon={<BeachAccessIcon />}
                                    href="/app/vacation-requests"
                                    selected={pathname.startsWith('/app/vacation-requests')}
                                />
                                <DashboardSidebarPageItem
                                    id="forget-checks"
                                    title="Forget Check"
                                    icon={<ErrorOutlineIcon />}
                                    href="/app/forget-checks"
                                    selected={!!matchPath('/app/forget-checks', pathname)}
                                />
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Information</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="my-attendance"
                                    title="My Attendance"
                                    icon={<AccessTimeIcon />}
                                    href="/app/attendance"
                                    selected={!!matchPath('/app/attendance', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="my-requests"
                                    title="My Requests"
                                    icon={<RequestPageIcon />}
                                    href="/app/requests"
                                    selected={!!matchPath('/app/requests', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="documents"
                                    title="Documents"
                                    icon={<DescriptionIcon />}
                                    href="/app/documents"
                                    selected={!!matchPath('/app/documents', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="hard-copies"
                                    title="Hard Copies"
                                    icon={<DescriptionIcon />}
                                    href="/app/hardcopies"
                                    selected={!!matchPath('/app/hardcopies', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="announcements"
                                    title="Announcements"
                                    icon={<AnnouncementIcon />}
                                    href="/app/announcements"
                                    selected={!!matchPath('/app/announcements', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="events"
                                    title="Events"
                                    icon={<EventIcon />}
                                    href="/app/events"
                                    selected={!!matchPath('/app/events', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="surveys"
                                    title="Surveys"
                                    icon={<PollIcon />}
                                    href="/app/surveys"
                                    selected={!!matchPath('/app/surveys', pathname)}
                                />
                            </>
                        )}

                        {/* HR View */}
                        {userRole === 'hr' && (
                            <>
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Organization</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="departments"
                                    title="Departments"
                                    icon={<BusinessIcon />}
                                    href="/app/departments"
                                    selected={!!matchPath('/app/departments', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="positions"
                                    title="Positions"
                                    icon={<WorkIcon />}
                                    href="/app/positions"
                                    selected={!!matchPath('/app/positions', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="users"
                                    title="Users"
                                    icon={<PersonIcon />}
                                    href="/app/users"
                                    selected={!!matchPath('/app/users', pathname)}
                                />

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>HR Operations</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="attendance"
                                    title="Attendance"
                                    icon={<AccessTimeIcon />}
                                    href="/app/attendance"
                                    selected={!!matchPath('/app/attendance', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="forget-checks"
                                    title="Forget Check"
                                    icon={<ErrorOutlineIcon />}
                                    href="/app/forget-checks"
                                    selected={!!matchPath('/app/forget-checks', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="missions"
                                    title="Missions"
                                    icon={<FlightTakeoffIcon />}
                                    href="/app/missions"
                                    selected={pathname.startsWith('/app/missions')}
                                />
                                <DashboardSidebarPageItem
                                    id="sick-leaves"
                                    title="Sick Leaves"
                                    icon={<LocalHospitalIcon />}
                                    href="/app/sick-leaves"
                                    selected={pathname.startsWith('/app/sick-leaves')}
                                />
                                <DashboardSidebarPageItem
                                    id="permissions"
                                    title="Permissions"
                                    icon={<AccessAlarmIcon />}
                                    href="/app/permissions"
                                    selected={pathname.startsWith('/app/permissions')}
                                />
                                <DashboardSidebarPageItem
                                    id="overtime"
                                    title="Overtime"
                                    icon={<AccessTimeIcon />}
                                    href="/app/overtime"
                                    selected={pathname.startsWith('/app/overtime')}
                                />
                                <DashboardSidebarPageItem
                                    id="vacation-requests"
                                    title="Vacation Requests"
                                    icon={<BeachAccessIcon />}
                                    href="/app/vacation-requests"
                                    selected={pathname.startsWith('/app/vacation-requests')}
                                />
                                <DashboardSidebarPageItem
                                    id="requests"
                                    title="Requests"
                                    icon={<RequestPageIcon />}
                                    href="/app/requests"
                                    selected={!!matchPath('/app/requests', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="vacation-management"
                                    title="Vacation Balances"
                                    icon={<BeachAccessOutlinedIcon />}
                                    href="/app/vacations"
                                    selected={!!matchPath('/app/vacations', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="payroll"
                                    title="Payroll"
                                    icon={<PaymentIcon />}
                                    href="/app/payroll"
                                    selected={!!matchPath('/app/payroll', pathname)}
                                />

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Documents</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="documents"
                                    title="Documents"
                                    icon={<DescriptionIcon />}
                                    href="/app/documents"
                                    selected={!!matchPath('/app/documents', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="hard-copies"
                                    title="Hard Copies"
                                    icon={<DescriptionIcon />}
                                    href="/app/hardcopies"
                                    selected={!!matchPath('/app/hardcopies', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="templates"
                                    title="Templates"
                                    icon={<ArticleIcon />}
                                    href="/app/templates"
                                    selected={!!matchPath('/app/templates', pathname)}
                                />

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Communication</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="announcements"
                                    title="Announcements"
                                    icon={<AnnouncementIcon />}
                                    href="/app/announcements"
                                    selected={!!matchPath('/app/announcements', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="events"
                                    title="Events"
                                    icon={<EventIcon />}
                                    href="/app/events"
                                    selected={!!matchPath('/app/events', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="surveys"
                                    title="Surveys"
                                    icon={<PollIcon />}
                                    href="/app/surveys"
                                    selected={!!matchPath('/app/surveys', pathname)}
                                />

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Advanced</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="dashboard-edit"
                                    title="Dashboard Settings"
                                    icon={<EditIcon />}
                                    href="/app/dashboard/edit"
                                    selected={!!matchPath('/app/dashboard/edit', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="holidays"
                                    title="Holidays"
                                    icon={<CalendarTodayIcon />}
                                    href="/app/holidays"
                                    selected={!!matchPath('/app/holidays', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="reports"
                                    title="Reports"
                                    icon={<BarChartIcon />}
                                    href="/app/reports"
                                    selected={!!matchPath('/app/reports', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="analytics"
                                    title="Analytics"
                                    icon={<AssessmentIcon />}
                                    href="/app/analytics"
                                    selected={!!matchPath('/app/analytics', pathname)}
                                />
                            </>
                        )}

                        {/* Admin View */}
                        {userRole === 'admin' && (
                            <>
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Organization</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="departments"
                                    title="Departments"
                                    icon={<BusinessIcon />}
                                    href="/app/departments"
                                    selected={!!matchPath('/app/departments', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="positions"
                                    title="Positions"
                                    icon={<WorkIcon />}
                                    href="/app/positions"
                                    selected={!!matchPath('/app/positions', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="users"
                                    title="Users"
                                    icon={<PersonIcon />}
                                    href="/app/users"
                                    selected={!!matchPath('/app/users', pathname)}
                                />

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>HR Operations</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="attendance"
                                    title="Attendance"
                                    icon={<AccessTimeIcon />}
                                    href="/app/attendance"
                                    selected={!!matchPath('/app/attendance', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="forget-checks"
                                    title="Forget Check"
                                    icon={<ErrorOutlineIcon />}
                                    href="/app/forget-checks"
                                    selected={!!matchPath('/app/forget-checks', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="missions"
                                    title="Missions"
                                    icon={<FlightTakeoffIcon />}
                                    href="/app/missions"
                                    selected={pathname.startsWith('/app/missions')}
                                />
                                <DashboardSidebarPageItem
                                    id="sick-leaves"
                                    title="Sick Leaves"
                                    icon={<LocalHospitalIcon />}
                                    href="/app/sick-leaves"
                                    selected={pathname.startsWith('/app/sick-leaves')}
                                />
                                <DashboardSidebarPageItem
                                    id="permissions"
                                    title="Permissions"
                                    icon={<AccessAlarmIcon />}
                                    href="/app/permissions"
                                    selected={pathname.startsWith('/app/permissions')}
                                />
                                <DashboardSidebarPageItem
                                    id="overtime"
                                    title="Overtime"
                                    icon={<AccessTimeIcon />}
                                    href="/app/overtime"
                                    selected={pathname.startsWith('/app/overtime')}
                                />
                                <DashboardSidebarPageItem
                                    id="vacation-requests"
                                    title="Vacation Requests"
                                    icon={<BeachAccessIcon />}
                                    href="/app/vacation-requests"
                                    selected={pathname.startsWith('/app/vacation-requests')}
                                />
                                <DashboardSidebarPageItem
                                    id="requests"
                                    title="Requests"
                                    icon={<RequestPageIcon />}
                                    href="/app/requests"
                                    selected={!!matchPath('/app/requests', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="vacation-management"
                                    title="Vacation Balances"
                                    icon={<BeachAccessOutlinedIcon />}
                                    href="/app/vacations"
                                    selected={!!matchPath('/app/vacations', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="payroll"
                                    title="Payroll"
                                    icon={<PaymentIcon />}
                                    href="/app/payroll"
                                    selected={!!matchPath('/app/payroll', pathname)}
                                />

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Documents</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="documents"
                                    title="Documents"
                                    icon={<DescriptionIcon />}
                                    href="/app/documents"
                                    selected={!!matchPath('/app/documents', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="hard-copies"
                                    title="Hard Copies"
                                    icon={<DescriptionIcon />}
                                    href="/app/hardcopies"
                                    selected={!!matchPath('/app/hardcopies', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="templates"
                                    title="Templates"
                                    icon={<ArticleIcon />}
                                    href="/app/templates"
                                    selected={!!matchPath('/app/templates', pathname)}
                                />

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Communication</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="announcements"
                                    title="Announcements"
                                    icon={<AnnouncementIcon />}
                                    href="/app/announcements"
                                    selected={!!matchPath('/app/announcements', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="events"
                                    title="Events"
                                    icon={<EventIcon />}
                                    href="/app/events"
                                    selected={!!matchPath('/app/events', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="surveys"
                                    title="Surveys"
                                    icon={<PollIcon />}
                                    href="/app/surveys"
                                    selected={!!matchPath('/app/surveys', pathname)}
                                />

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Advanced</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="holidays"
                                    title="Holidays"
                                    icon={<CalendarTodayIcon />}
                                    href="/app/holidays"
                                    selected={!!matchPath('/app/holidays', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="reports"
                                    title="Reports"
                                    icon={<BarChartIcon />}
                                    href="/app/reports"
                                    selected={!!matchPath('/app/reports', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="analytics"
                                    title="Analytics"
                                    icon={<AssessmentIcon />}
                                    href="/app/analytics"
                                    selected={!!matchPath('/app/analytics', pathname)}
                                />

                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Administration</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="dashboard-edit"
                                    title="Dashboard Settings"
                                    icon={<EditIcon />}
                                    href="/app/dashboard/edit"
                                    selected={!!matchPath('/app/dashboard/edit', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="roles"
                                    title="Roles"
                                    icon={<AdminPanelSettingsIcon />}
                                    href="/app/roles"
                                    selected={pathname.startsWith('/app/roles')}
                                />
                                <DashboardSidebarPageItem
                                    id="settings"
                                    title="Settings"
                                    icon={<SettingsIcon />}
                                    href="#"
                                    selected={pathname.startsWith('/app/system-settings')}
                                    expanded={expandedItemIds.includes('settings')}
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
                                                id="vacation-balances"
                                                title="Manage Vacation Balances"
                                                icon={<AccountBalanceIcon />}
                                                href="/app/system-settings/vacation-balances"
                                                selected={!!matchPath('/app/system-settings/vacation-balances', pathname)}
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
                                <DashboardSidebarPageItem
                                    id="theme-editor"
                                    title="Theme & Colors"
                                    icon={<PaletteIcon />}
                                    href="/app/theme"
                                    selected={!!matchPath('/app/theme', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="security"
                                    title="Security"
                                    icon={<SecurityIcon />}
                                    href="/app/security"
                                    selected={!!matchPath('/app/security', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="backups"
                                    title="Backups"
                                    icon={<BackupIcon />}
                                    href="/app/backups"
                                    selected={!!matchPath('/app/backups', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="resigned"
                                    title="Resigned Employees"
                                    icon={<PersonOffIcon />}
                                    href="/app/resigned"
                                    selected={!!matchPath('/app/resigned', pathname)}
                                />
                            </>
                        )}

                        {/* ID Card Admin View */}
                        {userRole === 'id-card-admin' && (
                            <>
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>ID Card Management</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="documents"
                                    title="Documents"
                                    icon={<DescriptionIcon />}
                                    href="/app/documents"
                                    selected={!!matchPath('/app/documents', pathname)}
                                />
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


