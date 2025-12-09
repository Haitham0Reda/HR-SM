'use client';
import * as React from 'react';
import PropTypes from 'prop-types';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Breadcrumbs, { breadcrumbsClasses } from '@mui/material/Breadcrumbs';
import Container from '@mui/material/Container';
import MuiLink from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import { Link } from 'react-router';
import { designTokens } from '../theme/designTokens';

const PageContentHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
    flexWrap: 'wrap',
}));

const PageHeaderBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
    margin: theme.spacing(1, 0),
    [`& .${breadcrumbsClasses.separator}`]: {
        color: (theme.vars || theme).palette.action.disabled,
        margin: 1,
    },
    [`& .${breadcrumbsClasses.ol}`]: {
        alignItems: 'center',
    },
    [`& a`]: {
        transition: `color ${designTokens.transitions.duration.short}ms ${designTokens.transitions.easing.easeInOut}`,
        '&:hover': {
            color: (theme.vars || theme).palette.primary.main,
        },
    },
}));

const PageHeaderToolbar = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(1),
    // Ensure the toolbar is always on the right side, even after wrapping
    marginLeft: 'auto',
}));

/**
 * PageContainer Component
 * 
 * Standardized page wrapper with breadcrumbs, title, and action area.
 * Provides consistent page structure and spacing across the application.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 * @param {Array<{title: string, path?: string}>} [props.breadcrumbs] - Breadcrumb navigation items
 * @param {string} [props.title] - Page title
 * @param {React.ReactNode} [props.actions] - Action buttons or controls
 * @param {boolean} [props.maxWidth='lg'] - Maximum width of the container
 * @param {boolean} [props.disableGutters=false] - Remove horizontal padding
 * @param {Object} [props.sx] - Additional MUI sx prop for styling
 */
function PageContainer(props) {
    const { 
        children, 
        breadcrumbs, 
        title, 
        actions = null,
        maxWidth = 'lg',
        disableGutters = false,
        sx = {}
    } = props;

    return (
        <Container 
            maxWidth={maxWidth}
            disableGutters={disableGutters}
            sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                ...sx
            }}
        >
            <Stack sx={{ flex: 1, my: 2 }} spacing={2}>
                {/* Page Header */}
                {(breadcrumbs || title || actions) && (
                    <Stack spacing={1}>
                        {/* Breadcrumbs */}
                        {breadcrumbs && breadcrumbs.length > 0 && (
                            <PageHeaderBreadcrumbs
                                aria-label="breadcrumb"
                                separator={<NavigateNextRoundedIcon fontSize="small" />}
                            >
                                {breadcrumbs.map((breadcrumb, index) => {
                                    return breadcrumb.path ? (
                                        <MuiLink
                                            key={index}
                                            component={Link}
                                            underline="hover"
                                            color="inherit"
                                            to={breadcrumb.path}
                                        >
                                            {breadcrumb.title}
                                        </MuiLink>
                                    ) : (
                                        <Typography
                                            key={index}
                                            sx={{ 
                                                color: 'text.primary', 
                                                fontWeight: designTokens.typography.fontWeight.semibold 
                                            }}
                                        >
                                            {breadcrumb.title}
                                        </Typography>
                                    );
                                })}
                            </PageHeaderBreadcrumbs>
                        )}

                        {/* Title and Actions */}
                        {(title || actions) && (
                            <PageContentHeader>
                                {title && (
                                    <Typography 
                                        variant="h4"
                                        sx={{
                                            fontWeight: designTokens.typography.fontWeight.bold,
                                            color: 'text.primary',
                                        }}
                                    >
                                        {title}
                                    </Typography>
                                )}
                                {actions && (
                                    <PageHeaderToolbar>{actions}</PageHeaderToolbar>
                                )}
                            </PageContentHeader>
                        )}
                    </Stack>
                )}

                {/* Page Content */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {children}
                </Box>
            </Stack>
        </Container>
    );
}

PageContainer.propTypes = {
    actions: PropTypes.node,
    breadcrumbs: PropTypes.arrayOf(
        PropTypes.shape({
            path: PropTypes.string,
            title: PropTypes.string.isRequired,
        }),
    ),
    children: PropTypes.node,
    title: PropTypes.string,
    maxWidth: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', false]),
    disableGutters: PropTypes.bool,
    sx: PropTypes.object,
};

export default PageContainer;