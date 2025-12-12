import React from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Stack,
    useTheme,
    alpha,
    Paper
} from '@mui/material';
import {
    Home as HomeIcon,
    ArrowBack as ArrowBackIcon,
    Search as SearchIcon,
    Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

/**
 * NotFound Component (404 Error Page)
 * 
 * Displays a friendly 404 error page when users navigate to non-existent routes.
 * Provides role-aware navigation options to help users get back on track.
 * 
 * Requirements: 13.1, 13.3, 13.4, 13.5
 * 
 * Accessibility Features:
 * - Proper heading hierarchy (h1 for main heading)
 * - Descriptive alt text for visual elements
 * - Keyboard navigation support for all interactive elements
 * - WCAG 2.1 AA compliant color contrast
 * - Focus indicators on interactive elements
 */
const NotFound = () => {
    useDocumentTitle('Page Not Found');
    const theme = useTheme();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    /**
     * Get role-aware navigation options
     * Returns different navigation options based on user role and authentication status
     */
    const getNavigationOptions = () => {
        if (!isAuthenticated) {
            return [
                {
                    label: 'Go to Login',
                    icon: <HomeIcon />,
                    onClick: () => navigate('/'),
                    variant: 'contained',
                    ariaLabel: 'Navigate to login page'
                }
            ];
        }

        const options = [
            {
                label: 'Go to Dashboard',
                icon: <DashboardIcon />,
                onClick: () => navigate('/app/dashboard'),
                variant: 'contained',
                ariaLabel: 'Navigate to dashboard'
            },
            {
                label: 'Go Back',
                icon: <ArrowBackIcon />,
                onClick: () => navigate(-1),
                variant: 'outlined',
                ariaLabel: 'Go back to previous page'
            }
        ];

        // Add role-specific navigation options
        if (user?.role === 'Admin' || user?.role === 'HR') {
            options.push({
                label: 'User Management',
                icon: <SearchIcon />,
                onClick: () => navigate('/app/users'),
                variant: 'outlined',
                ariaLabel: 'Navigate to user management'
            });
        }

        return options;
    };

    const navigationOptions = getNavigationOptions();

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.default 
                    : theme.palette.grey[50],
                py: 4
            }}
        >
            <Container maxWidth="md">
                <Paper
                    elevation={3}
                    sx={{
                        p: { xs: 3, sm: 4, md: 6 },
                        textAlign: 'center',
                        borderRadius: 3,
                        bgcolor: theme.palette.background.paper
                    }}
                >
                    {/* 404 Visual */}
                    <Box
                        sx={{
                            mb: 3,
                            position: 'relative'
                        }}
                    >
                        <Typography
                            variant="h1"
                            component="h1"
                            sx={{
                                fontSize: { xs: '6rem', sm: '8rem', md: '10rem' },
                                fontWeight: 700,
                                color: alpha(theme.palette.primary.main, 0.1),
                                lineHeight: 1,
                                userSelect: 'none'
                            }}
                            aria-hidden="true"
                        >
                            404
                        </Typography>
                        <Box
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '100%'
                            }}
                        >
                            <SearchIcon
                                sx={{
                                    fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
                                    color: theme.palette.primary.main,
                                    opacity: 0.8
                                }}
                                aria-hidden="true"
                            />
                        </Box>
                    </Box>

                    {/* Error Message */}
                    <Typography
                        variant="h4"
                        component="h2"
                        gutterBottom
                        sx={{
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            mb: 2
                        }}
                    >
                        Page Not Found
                    </Typography>

                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{
                            mb: 4,
                            maxWidth: '600px',
                            mx: 'auto',
                            lineHeight: 1.7
                        }}
                    >
                        Oops! The page you're looking for doesn't exist. It might have been moved, 
                        deleted, or the URL might be incorrect. Don't worry, we'll help you get back 
                        on track.
                    </Typography>

                    {/* Navigation Actions */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        justifyContent="center"
                        sx={{ mb: 3 }}
                    >
                        {navigationOptions.map((option, index) => (
                            <Button
                                key={index}
                                variant={option.variant}
                                startIcon={option.icon}
                                onClick={option.onClick}
                                size="large"
                                aria-label={option.ariaLabel}
                                sx={{
                                    minWidth: { xs: '100%', sm: '160px' },
                                    py: 1.5,
                                    '&:focus-visible': {
                                        outline: `3px solid ${theme.palette.primary.main}`,
                                        outlineOffset: '2px'
                                    }
                                }}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </Stack>

                    {/* Help Text */}
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            display: 'block',
                            mt: 3
                        }}
                    >
                        If you believe this is an error, please contact support.
                    </Typography>
                </Paper>
            </Container>
        </Box>
    );
};

export default NotFound;
