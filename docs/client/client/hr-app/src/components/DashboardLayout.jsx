import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import { Outlet } from 'react-router';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';
import SitemarkIcon from './SitemarkIcon';
import { useAuth } from '../contexts/AuthContext';
import SurveyRedirect from './SurveyRedirect';
import { designTokens } from '../theme/designTokens';

// Memoize SitemarkIcon to prevent unnecessary re-renders
const MemoizedSitemarkIcon = React.memo(SitemarkIcon);

/**
 * DashboardLayout Component
 * 
 * Main layout component that provides consistent structure across all pages.
 * Includes collapsible sidebar, header with navigation, and main content area.
 * 
 * @param {Object} props
 * @param {React.ReactNode} [props.children] - Optional children to render instead of Outlet
 * @param {boolean} [props.disableSidebar=false] - Hide the sidebar completely
 * @param {boolean} [props.disableHeader=false] - Hide the header completely
 * @param {boolean} [props.disablePadding=false] - Remove default padding from content area
 * @param {Object} [props.sx] - Additional MUI sx prop for the main content area
 */
export default function DashboardLayout({ 
    children, 
    disableSidebar = false,
    disableHeader = false,
    disablePadding = false,
    sx = {}
}) {
    const theme = useTheme();
    const { user } = useAuth();

    const [isDesktopNavigationExpanded, setIsDesktopNavigationExpanded] =
        React.useState(true);
    const [isMobileNavigationExpanded, setIsMobileNavigationExpanded] =
        React.useState(false);

    const isOverMdViewport = useMediaQuery(theme.breakpoints.up('md'));

    const isNavigationExpanded = isOverMdViewport
        ? isDesktopNavigationExpanded
        : isMobileNavigationExpanded;

    const setIsNavigationExpanded = React.useCallback(
        (newExpanded) => {
            if (isOverMdViewport) {
                setIsDesktopNavigationExpanded(newExpanded);
            } else {
                setIsMobileNavigationExpanded(newExpanded);
            }
        },
        [
            isOverMdViewport,
            setIsDesktopNavigationExpanded,
            setIsMobileNavigationExpanded,
        ],
    );

    const handleToggleHeaderMenu = React.useCallback(
        (isExpanded) => {
            setIsNavigationExpanded(isExpanded);
        },
        [setIsNavigationExpanded],
    );

    const layoutRef = React.useRef(null);

    return (
        <Box
            ref={layoutRef}
            sx={{
                position: 'relative',
                display: 'flex',
                overflow: 'hidden',
                height: '100%',
                width: '100%',
                backgroundColor: 'background.default',
            }}
        >
            {/* Header */}
            {!disableHeader && (
                <DashboardHeader
                    logo={<MemoizedSitemarkIcon />}
                    title=""
                    menuOpen={isNavigationExpanded}
                    onToggleMenu={handleToggleHeaderMenu}
                    user={user}
                    notificationCount={0}
                />
            )}

            {/* Sidebar */}
            {!disableSidebar && (
                <DashboardSidebar
                    expanded={isNavigationExpanded}
                    setExpanded={setIsNavigationExpanded}
                    container={layoutRef?.current ?? undefined}
                />
            )}

            {/* Main Content Area */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minWidth: 0,
                    transition: `margin ${designTokens.transitions.duration.standard}ms ${designTokens.transitions.easing.easeInOut}`,
                }}
            >
                {/* Toolbar spacer (only if header is visible) */}
                {!disableHeader && <Toolbar sx={{ displayPrint: 'none' }} />}

                {/* Main scrollable content */}
                <Box
                    component="main"
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        overflow: 'auto',
                        padding: disablePadding ? 0 : {
                            xs: designTokens.spacing.md,
                            sm: designTokens.spacing.lg,
                            md: designTokens.spacing.xl,
                        },
                        backgroundColor: 'background.default',
                        ...sx
                    }}
                >
                    <SurveyRedirect />
                    {children || <Outlet />}
                </Box>
            </Box>
        </Box>
    );
}