import React from 'react';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PropTypes from 'prop-types';

const PageContainer = ({ title, subtitle, breadcrumbs, actions, children }) => {
    return (
        <Box
            sx={{
                p: { xs: 2, sm: 3, md: 4 },
                maxWidth: 1600,
                mx: 'auto',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" />}
                    sx={{ mb: 2 }}
                    aria-label="breadcrumb"
                >
                    {breadcrumbs.map((crumb, index) => {
                        const isLast = index === breadcrumbs.length - 1;
                        return isLast ? (
                            <Typography
                                key={crumb.label}
                                color="text.primary"
                                sx={{ fontWeight: 600, fontSize: '0.875rem' }}
                            >
                                {crumb.label}
                            </Typography>
                        ) : (
                            <MuiLink
                                key={crumb.label}
                                component={Link}
                                to={crumb.href}
                                underline="hover"
                                color="text.secondary"
                                sx={{
                                    fontSize: '0.875rem',
                                    '&:hover': {
                                        color: 'primary.main',
                                    },
                                }}
                            >
                                {crumb.label}
                            </MuiLink>
                        );
                    })}
                </Breadcrumbs>
            )}

            {/* Page Header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 3,
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Box>
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            fontWeight: 700,
                            mb: subtitle ? 1 : 0,
                            color: 'text.primary',
                        }}
                    >
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                {actions && <Box sx={{ display: 'flex', gap: 1.5 }}>{actions}</Box>}
            </Box>

            {/* Page Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {children}
            </Box>
        </Box>
    );
};

PageContainer.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    breadcrumbs: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            href: PropTypes.string,
        })
    ),
    actions: PropTypes.node,
    children: PropTypes.node.isRequired,
};

export default PageContainer;
