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
import Typography from '@mui/material/Typography';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
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
    locked = false,
    nestedNavigation,
    isNested = false,
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

    const handleClick = React.useCallback((e) => {
        if (nestedNavigation) {
            e.preventDefault();
            e.stopPropagation();
        }
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
                }}
            >
                <ListItemButton
                    selected={selected}
                    disabled={disabled || locked}
                    sx={{
                        height: mini ? 50 : 'auto',
                        borderRadius: 2,
                        mb: 0.5,
                        ml: isNested ? 0.5 : 0,
                        mr: isNested ? 0.5 : 0,
                        pl: isNested ? 1.5 : 2,
                        pr: isNested ? 0.5 : 2,
                        bgcolor: isNested ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                        transition: 'all 0.2s',
                        width: isNested ? 'calc(100% - 8px)' : '100%',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        ...(locked && {
                            opacity: 0.6,
                            cursor: 'not-allowed',
                            '&:hover': {
                                bgcolor: 'transparent',
                                transform: 'none',
                            },
                        }),
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
                            bgcolor: isNested ? 'action.selected' : 'action.hover',
                            transform: locked ? 'none' : 'translateX(4px)',
                        },
                    }}
                    onClick={locked ? (e) => e.preventDefault() : handleClick}
                    {...(nestedNavigation || locked
                        ? {
                            component: 'div',
                        }
                        : {
                            LinkComponent,
                            ...(hasExternalHref
                                ? {
                                    target: '_blank',
                                    rel: 'noopener noreferrer',
                                }
                                : {}),
                            to: href,
                        })}
                >
                    {icon || mini ? (
                        <Box
                            sx={
                                mini
                                    ? {
                                        position: 'absolute',
                                        left: '50%',
                                        top: 'calc(50% - 6px)',
                                        transform: 'translate(-50%, -50%)',
                                    }
                                    : {}
                            }
                        >
                            <ListItemIcon
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: mini ? 'center' : 'auto',
                                    minWidth: isNested ? 34 : 40,
                                    '& svg': {
                                        fontSize: isNested ? '1.125rem' : '1.5rem',
                                    },
                                }}
                            >
                                {icon ?? null}
                                {!icon && mini ? (
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
                            {mini ? (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        position: 'absolute',
                                        bottom: -18,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontSize: 10,
                                        fontWeight: 500,
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: MINI_DRAWER_WIDTH - 28,
                                    }}
                                >
                                    {title}
                                </Typography>
                            ) : null}
                        </Box>
                    ) : null}
                    {!mini ? (
                        <ListItemText
                            primary={title}
                            sx={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                zIndex: 1,
                                '& .MuiListItemText-primary': {
                                    fontSize: isNested ? '0.8125rem' : '1rem',
                                },
                            }}
                        />
                    ) : null}
                    {locked && !mini && fullyExpanded ? (
                        <LockIcon 
                            sx={{ 
                                fontSize: 18, 
                                color: 'text.disabled',
                                ml: 'auto'
                            }} 
                        />
                    ) : action && !mini && fullyExpanded ? action : null}
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
    locked: PropTypes.bool,
    expanded: PropTypes.bool,
    href: PropTypes.string.isRequired,
    icon: PropTypes.node,
    id: PropTypes.string.isRequired,
    isNested: PropTypes.bool,
    nestedNavigation: PropTypes.node,
    selected: PropTypes.bool,
    title: PropTypes.string.isRequired,
    sx: PropTypes.object,
};

export default DashboardSidebarPageItem;