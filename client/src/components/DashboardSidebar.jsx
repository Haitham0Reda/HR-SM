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
import BarChartIcon from '@mui/icons-material/BarChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import BackupIcon from '@mui/icons-material/Backup';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EditIcon from '@mui/icons-material/Edit';
import PaletteIcon from '@mui/icons-material/Palette';
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

    // eslint-disable-next-line no-unused-vars
    const [expandedItemIds, setExpandedItemIds] = React.useState([]);

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

    // eslint-disable-next-line no-unused-vars
    const handlePageItemClick = React.useCallback(
        (itemId, hasNestedNavigation) => {
            if (hasNestedNavigation && !mini) {
                setExpandedItemIds((previousValue) =>
                    previousValue.includes(itemId)
                        ? previousValue.filter(
                            (previousValueItemId) => previousValueItemId !== itemId,
                        )
                        : [...previousValue, itemId],
                );
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
                            width: mini ? MINI_DRAWER_WIDTH : 'auto',
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
                                    id="vacation"
                                    title="Vacation"
                                    icon={<BeachAccessIcon />}
                                    href="/app/vacation"
                                    selected={!!matchPath('/app/vacation', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="permissions"
                                    title="Permissions"
                                    icon={<AssignmentIcon />}
                                    href="/app/permissions"
                                    selected={!!matchPath('/app/permissions', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="overtime"
                                    title="Overtime"
                                    icon={<AccessTimeIcon />}
                                    href="/app/overtime"
                                    selected={!!matchPath('/app/overtime', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="leaves"
                                    title="Mission & Sick"
                                    icon={<EventAvailableIcon />}
                                    href="/app/leaves"
                                    selected={!!matchPath('/app/leaves', pathname)}
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
                                    id="leaves"
                                    title="Mission & Sick"
                                    icon={<EventAvailableIcon />}
                                    href="/app/leaves"
                                    selected={!!matchPath('/app/leaves', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="permissions"
                                    title="Permissions"
                                    icon={<AssignmentIcon />}
                                    href="/app/permissions"
                                    selected={!!matchPath('/app/permissions', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="overtime"
                                    title="Overtime"
                                    icon={<AccessTimeIcon />}
                                    href="/app/overtime"
                                    selected={!!matchPath('/app/overtime', pathname)}
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
                                    title="Vacation"
                                    icon={<BeachAccessIcon />}
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
                                    id="leaves"
                                    title="Mission & Sick"
                                    icon={<EventAvailableIcon />}
                                    href="/app/leaves"
                                    selected={!!matchPath('/app/leaves', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="permissions"
                                    title="Permissions"
                                    icon={<AssignmentIcon />}
                                    href="/app/permissions"
                                    selected={!!matchPath('/app/permissions', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="overtime"
                                    title="Overtime"
                                    icon={<AccessTimeIcon />}
                                    href="/app/overtime"
                                    selected={!!matchPath('/app/overtime', pathname)}
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
                                    title="Vacation"
                                    icon={<BeachAccessIcon />}
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
        ],
    );

    return (
        <DashboardSidebarContext.Provider
            value={{
                expanded: isFullyExpanded && !isFullyCollapsed,
                mini,
                setExpanded: handleSetSidebarExpanded,
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