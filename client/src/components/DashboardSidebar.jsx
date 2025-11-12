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
import SchoolIcon from '@mui/icons-material/School';
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
                            href="/dashboard"
                            selected={!!matchPath('/dashboard', pathname)}
                            sx={{
                                marginTop: 3,
                            }}
                        />

                        {/* Employee View */}
                        {userRole === 'employee' && (
                            <>
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>My Work</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="vacation-request"
                                    title="Vacation Request"
                                    icon={<BeachAccessIcon />}
                                    href="/vacation-request"
                                    selected={!!matchPath('/vacation-request', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="my-permissions"
                                    title="My Permissions"
                                    icon={<AssignmentIcon />}
                                    href="/permissions"
                                    selected={!!matchPath('/permissions', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="overtime"
                                    title="Overtime"
                                    icon={<AccessTimeIcon />}
                                    href="/overtime"
                                    selected={!!matchPath('/overtime', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="my-leaves"
                                    title="My Leaves"
                                    icon={<EventAvailableIcon />}
                                    href="/leaves"
                                    selected={!!matchPath('/leaves', pathname)}
                                />
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Information</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="my-attendance"
                                    title="My Attendance"
                                    icon={<AccessTimeIcon />}
                                    href="/attendance"
                                    selected={!!matchPath('/attendance', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="my-requests"
                                    title="My Requests"
                                    icon={<RequestPageIcon />}
                                    href="/requests"
                                    selected={!!matchPath('/requests', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="documents"
                                    title="Documents"
                                    icon={<DescriptionIcon />}
                                    href="/documents"
                                    selected={!!matchPath('/documents', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="announcements"
                                    title="Announcements"
                                    icon={<AnnouncementIcon />}
                                    href="/announcements"
                                    selected={!!matchPath('/announcements', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="events"
                                    title="Events"
                                    icon={<EventIcon />}
                                    href="/events"
                                    selected={!!matchPath('/events', pathname)}
                                />
                            </>
                        )}

                        {/* HR View */}
                        {userRole === 'hr' && (
                            <>
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Organization</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="schools"
                                    title="Schools"
                                    icon={<SchoolIcon />}
                                    href="/schools"
                                    selected={!!matchPath('/schools', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="departments"
                                    title="Departments"
                                    icon={<BusinessIcon />}
                                    href="/departments"
                                    selected={!!matchPath('/departments', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="positions"
                                    title="Positions"
                                    icon={<WorkIcon />}
                                    href="/positions"
                                    selected={!!matchPath('/positions', pathname)}
                                />
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>HR Operations</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="attendance"
                                    title="Attendance"
                                    icon={<AccessTimeIcon />}
                                    href="/attendance"
                                    selected={!!matchPath('/attendance', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="leaves"
                                    title="Leaves"
                                    icon={<EventAvailableIcon />}
                                    href="/leaves"
                                    selected={!!matchPath('/leaves', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="permissions"
                                    title="Permissions"
                                    icon={<AssignmentIcon />}
                                    href="/permissions"
                                    selected={!!matchPath('/permissions', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="requests"
                                    title="Requests"
                                    icon={<RequestPageIcon />}
                                    href="/requests"
                                    selected={!!matchPath('/requests', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="payroll"
                                    title="Payroll"
                                    icon={<PaymentIcon />}
                                    href="/payroll"
                                    selected={!!matchPath('/payroll', pathname)}
                                />
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Documents</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="documents"
                                    title="Documents"
                                    icon={<DescriptionIcon />}
                                    href="/documents"
                                    selected={!!matchPath('/documents', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="templates"
                                    title="Templates"
                                    icon={<ArticleIcon />}
                                    href="/templates"
                                    selected={!!matchPath('/templates', pathname)}
                                />
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Communication</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="announcements"
                                    title="Announcements"
                                    icon={<AnnouncementIcon />}
                                    href="/announcements"
                                    selected={!!matchPath('/announcements', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="events"
                                    title="Events"
                                    icon={<EventIcon />}
                                    href="/events"
                                    selected={!!matchPath('/events', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="surveys"
                                    title="Surveys"
                                    icon={<PollIcon />}
                                    href="/surveys"
                                    selected={!!matchPath('/surveys', pathname)}
                                />
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Advanced</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="holidays"
                                    title="Holidays"
                                    icon={<CalendarTodayIcon />}
                                    href="/holidays"
                                    selected={!!matchPath('/holidays', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="vacations"
                                    title="Vacations"
                                    icon={<BeachAccessIcon />}
                                    href="/vacations"
                                    selected={!!matchPath('/vacations', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="reports"
                                    title="Reports"
                                    icon={<BarChartIcon />}
                                    href="/reports"
                                    selected={!!matchPath('/reports', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="resigned"
                                    title="Resigned"
                                    icon={<PersonOffIcon />}
                                    href="/resigned"
                                    selected={!!matchPath('/resigned', pathname)}
                                />
                            </>
                        )}

                        {/* Admin View */}
                        {userRole === 'admin' && (
                            <>
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>User Management</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="users"
                                    title="Users"
                                    icon={<PersonIcon />}
                                    href="/users"
                                    selected={!!matchPath('/users', pathname)}
                                />
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Organization</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="schools"
                                    title="Schools"
                                    icon={<SchoolIcon />}
                                    href="/schools"
                                    selected={!!matchPath('/schools', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="departments"
                                    title="Departments"
                                    icon={<BusinessIcon />}
                                    href="/departments"
                                    selected={!!matchPath('/departments', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="positions"
                                    title="Positions"
                                    icon={<WorkIcon />}
                                    href="/positions"
                                    selected={!!matchPath('/positions', pathname)}
                                />
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>HR Operations</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="attendance"
                                    title="Attendance"
                                    icon={<AccessTimeIcon />}
                                    href="/attendance"
                                    selected={!!matchPath('/attendance', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="leaves"
                                    title="Leaves"
                                    icon={<EventAvailableIcon />}
                                    href="/leaves"
                                    selected={!!matchPath('/leaves', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="permissions"
                                    title="Permissions"
                                    icon={<AssignmentIcon />}
                                    href="/permissions"
                                    selected={!!matchPath('/permissions', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="requests"
                                    title="Requests"
                                    icon={<RequestPageIcon />}
                                    href="/requests"
                                    selected={!!matchPath('/requests', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="payroll"
                                    title="Payroll"
                                    icon={<PaymentIcon />}
                                    href="/payroll"
                                    selected={!!matchPath('/payroll', pathname)}
                                />
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Documents</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="documents"
                                    title="Documents"
                                    icon={<DescriptionIcon />}
                                    href="/documents"
                                    selected={!!matchPath('/documents', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="templates"
                                    title="Templates"
                                    icon={<ArticleIcon />}
                                    href="/templates"
                                    selected={!!matchPath('/templates', pathname)}
                                />
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Communication</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="announcements"
                                    title="Announcements"
                                    icon={<AnnouncementIcon />}
                                    href="/announcements"
                                    selected={!!matchPath('/announcements', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="events"
                                    title="Events"
                                    icon={<EventIcon />}
                                    href="/events"
                                    selected={!!matchPath('/events', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="surveys"
                                    title="Surveys"
                                    icon={<PollIcon />}
                                    href="/surveys"
                                    selected={!!matchPath('/surveys', pathname)}
                                />
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Advanced</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="holidays"
                                    title="Holidays"
                                    icon={<CalendarTodayIcon />}
                                    href="/holidays"
                                    selected={!!matchPath('/holidays', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="vacations"
                                    title="Vacations"
                                    icon={<BeachAccessIcon />}
                                    href="/vacations"
                                    selected={!!matchPath('/vacations', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="reports"
                                    title="Reports"
                                    icon={<BarChartIcon />}
                                    href="/reports"
                                    selected={!!matchPath('/reports', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="analytics"
                                    title="Analytics"
                                    icon={<AssessmentIcon />}
                                    href="/analytics"
                                    selected={!!matchPath('/analytics', pathname)}
                                />
                                <DashboardSidebarDividerItem />
                                <DashboardSidebarHeaderItem>Administration</DashboardSidebarHeaderItem>
                                <DashboardSidebarPageItem
                                    id="security"
                                    title="Security"
                                    icon={<SecurityIcon />}
                                    href="/security"
                                    selected={!!matchPath('/security', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="backups"
                                    title="Backups"
                                    icon={<BackupIcon />}
                                    href="/backups"
                                    selected={!!matchPath('/backups', pathname)}
                                />
                                <DashboardSidebarPageItem
                                    id="resigned"
                                    title="Resigned"
                                    icon={<PersonOffIcon />}
                                    href="/resigned"
                                    selected={!!matchPath('/resigned', pathname)}
                                />
                            </>
                        )}
                    </List>
                </Box>
            </Box>
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [mini, hasDrawerTransitions, isFullyExpanded, pathname, userRole],
    );

    const getDrawerSharedSx = React.useCallback(
        (isTemporary) => {
            const drawerWidth = mini ? MINI_DRAWER_WIDTH : DRAWER_WIDTH;

            return {
                displayPrint: 'none',
                width: drawerWidth,
                flexShrink: 0,
                height: '100vh',
                ...getDrawerWidthTransitionMixin(expanded),
                ...(isTemporary ? { position: 'absolute' } : {}),
                [`& .MuiDrawer-paper`]: {
                    position: isTemporary ? 'absolute' : 'fixed',
                    width: drawerWidth,
                    height: '100vh',
                    boxSizing: 'border-box',
                    backgroundImage: 'none',
                    overflow: 'hidden',
                    ...getDrawerWidthTransitionMixin(expanded),
                },
            };
        },
        [expanded, mini],
    );

    const sidebarContextValue = React.useMemo(() => {
        return {
            onPageItemClick: handlePageItemClick,
            mini,
            fullyExpanded: isFullyExpanded,
            fullyCollapsed: isFullyCollapsed,
            hasDrawerTransitions,
        };
    }, [
        handlePageItemClick,
        mini,
        isFullyExpanded,
        isFullyCollapsed,
        hasDrawerTransitions,
    ]);

    return (
        <DashboardSidebarContext.Provider value={sidebarContextValue}>
            <Drawer
                container={container}
                variant="temporary"
                open={expanded}
                onClose={handleSetSidebarExpanded(false)}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
                }}
                sx={{
                    display: {
                        xs: 'block',
                        sm: disableCollapsibleSidebar ? 'block' : 'none',
                        md: 'none',
                    },
                    ...getDrawerSharedSx(true),
                }}
            >
                {getDrawerContent('phone')}
            </Drawer>
            <Drawer
                variant="permanent"
                sx={{
                    display: {
                        xs: 'none',
                        sm: disableCollapsibleSidebar ? 'none' : 'block',
                        md: 'none',
                    },
                    ...getDrawerSharedSx(false),
                }}
            >
                {getDrawerContent('tablet')}
            </Drawer>
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    ...getDrawerSharedSx(false),
                }}
            >
                {getDrawerContent('desktop')}
            </Drawer>
        </DashboardSidebarContext.Provider>
    );
}

DashboardSidebar.propTypes = {
    container: (props, propName) => {
        if (props[propName] == null) {
            return null;
        }
        if (typeof props[propName] !== 'object' || props[propName].nodeType !== 1) {
            return new Error(`Expected prop '${propName}' to be of type Element`);
        }
        return null;
    },
    disableCollapsibleSidebar: PropTypes.bool,
    expanded: PropTypes.bool,
    setExpanded: PropTypes.func.isRequired,
};

export default DashboardSidebar;