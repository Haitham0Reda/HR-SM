import * as React from 'react';
import PropTypes from 'prop-types';

import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Grow from '@mui/material/Grow';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';


import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link } from 'react-router';
import DashboardSidebarContext from '../context/DashboardSidebarContext';
import { MINI_DRAWER_WIDTH } from '../constants';

function DashboardSidebarPageItem({
    id,
    title,
    icon,
    href,
    action,
    defaultExpanded = false,
    expanded = defaultExpanded,
    selected = false,
    disabled = false,
    nestedNavigation,
    sx,
}) {
    const sidebarContext = React.useContext(DashboardSidebarContext);
    if (!sidebarContext) {
        throw new Error('Sidebar context was used without a provider.');
    }
    const {
        onPageItemClick,
        mini = false,
        fullyExpanded = true,
        fullyCollapsed = false,
    } = sidebarContext;

    const [isHovered, setIsHovered] = React.useState(false);

    const handleClick = React.useCallback(() => {
        if (onPageItemClick) {
            onPageItemClick(id, !!nestedNavigation);
        }
    }, [onPageItemClick, id, nestedNavigation]);

    let nestedNavigationCollapseSx = { display: 'none' };
    if (mini && fullyCollapsed) {
        nestedNavigationCollapseSx = {
            fontSize: 18,
            position: 'absolute',
            top: '41.5%',
            right: '2px',
            transform: 'translateY(-50%) rotate(-90deg)',
        };
    } else if (!mini && fullyExpanded) {
        nestedNavigationCollapseSx = {
            ml: 0.5,
            fontSize: 20,
            transform: `rotate(${expanded ? 0 : -90}deg)`,
            transition: (theme) =>
                theme.transitions.create('transform', {
                    easing: theme.transitions.easing.sharp,
                    duration: 100,
                }),
        };
    }

    const hasExternalHref = href
        ? href.startsWith('http://') || href.startsWith('https://')
        : false;

    const LinkComponent = hasExternalHref ? 'a' : Link;

    const miniNestedNavigationSidebarContextValue = React.useMemo(() => {
        return {
            onPageItemClick: onPageItemClick ?? (() => { }),
            mini: false,
            fullyExpanded: true,
            fullyCollapsed: false,
            hasDrawerTransitions: false,
        };
    }, [onPageItemClick]);

    return (
        <React.Fragment>
            <ListItem
                disablePadding
                {...(nestedNavigation && mini
                    ? {
                        onMouseEnter: () => {
                            setIsHovered(true);
                        },
                        onMouseLeave: () => {
                            setIsHovered(false);
                        },
                    }
                    : {})}
                sx={{
                    display: 'block',
                    py: 0,
                    px: 1,
                    overflowX: 'hidden',
                    ...sx,
                    // Keep adjustments when sidebar is closed
                    minWidth: mini ? MINI_DRAWER_WIDTH : 'auto',
                }}
            >
                <ListItemButton
                    selected={selected}
                    disabled={disabled}
                    sx={{
                        height: mini ? 50 : 'auto',
                        borderRadius: 2,
                        mb: 0.5,
                        transition: 'all 0.2s',
                        '&.Mui-selected': {
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            fontWeight: 600,
                            '&:hover': {
                                bgcolor: 'primary.dark',
                            },
                            '& .MuiListItemIcon-root': {
                                color: 'primary.contrastText',
                            },
                        },
                        '&:hover': {
                            bgcolor: 'action.hover',
                            transform: 'translateX(4px)',
                        },
                        // Keep adjustments when sidebar is closed
                        minHeight: 48,
                    }}
                    {...(nestedNavigation && !mini
                        ? {
                            onClick: handleClick,
                        }
                        : {})}
                    {...(!nestedNavigation
                        ? {
                            LinkComponent,
                            ...(hasExternalHref
                                ? {
                                    target: '_blank',
                                    rel: 'noopener noreferrer',
                                }
                                : {}),
                            to: href,
                            onClick: handleClick,
                        }
                        : {})}
                >
                    {icon || mini ? (
                        <Box
                            sx={
                                mini
                                    ? {
                                        position: 'absolute',
                                        left: '50%',
                                        top: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        // Keep adjustments when sidebar is closed
                                        minWidth: 36,
                                        minHeight: 36,
                                        width: 36,
                                        height: 36,
                                    }
                                    : {}
                            }
                        >
                            <ListItemIcon
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: mini ? 'center' : 'auto',
                                    minWidth: 0,
                                    // Keep adjustments when sidebar is closed
                                    width: '100%',
                                    height: '100%',
                                }}
                            >
                                {icon ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 36,
                                            height: 36,
                                            borderRadius: '50%',
                                            bgcolor: selected ? 'primary.main' : 'action.selected',
                                            color: selected ? 'primary.contrastText' : 'action.active',
                                        }}
                                    >
                                        {icon}
                                    </Box>
                                ) : mini ? (
                                    <Avatar
                                        sx={{
                                            fontSize: 10,
                                            height: 16,
                                            width: 16,
                                        }}
                                    >
                                        {title
                                            .split(' ')
                                            .slice(0, 2)
                                            .map((titleWord) => titleWord.charAt(0).toUpperCase())}
                                    </Avatar>
                                ) : null}
                            </ListItemIcon>
                        </Box>
                    ) : null}
                    {!mini ? (
                        <ListItemText
                            primary={title}
                            sx={{
                                whiteSpace: 'nowrap',
                                zIndex: 1,
                            }}
                        />
                    ) : null}
                    {action && !mini && fullyExpanded ? action : null}
                    {nestedNavigation ? (
                        <ExpandMoreIcon sx={nestedNavigationCollapseSx} />
                    ) : null}
                </ListItemButton>
                {nestedNavigation && mini ? (
                    <Grow in={isHovered}>
                        <Box
                            sx={{
                                position: 'fixed',
                                left: MINI_DRAWER_WIDTH - 2,
                                pl: '6px',
                            }}
                        >
                            <Paper
                                elevation={8}
                                sx={{
                                    pt: 0.2,
                                    pb: 0.2,
                                    transform: 'translateY(-50px)',
                                }}
                            >
                                <DashboardSidebarContext.Provider
                                    value={miniNestedNavigationSidebarContextValue}
                                >
                                    {nestedNavigation}
                                </DashboardSidebarContext.Provider>
                            </Paper>
                        </Box>
                    </Grow>
                ) : null}
            </ListItem>
            {nestedNavigation && !mini ? (
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    {nestedNavigation}
                </Collapse>
            ) : null}
        </React.Fragment>
    );
}

DashboardSidebarPageItem.propTypes = {
    action: PropTypes.node,
    defaultExpanded: PropTypes.bool,
    disabled: PropTypes.bool,
    expanded: PropTypes.bool,
    href: PropTypes.string.isRequired,
    icon: PropTypes.node,
    id: PropTypes.string.isRequired,
    nestedNavigation: PropTypes.node,
    selected: PropTypes.bool,
    title: PropTypes.string.isRequired,
    sx: PropTypes.object,
};

export default DashboardSidebarPageItem;