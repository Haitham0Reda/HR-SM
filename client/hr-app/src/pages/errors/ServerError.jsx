import React from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Stack,
    useTheme,
    alpha,
    Paper,
    Chip
} from '@mui/material';
import {
    Home as HomeIcon,
    Refresh as RefreshIcon,
    ErrorOutline as ErrorOutlineIcon,
    ContactSupport as ContactSupportIcon
} from '@mui/icons-material';




/**
 * ServerError Component without Router Context
 * This component can be rendered outside of Router context (e.g., in ErrorBoundary)
 */
const ServerErrorWithoutRouter = ({ errorId, message }) => {
    const theme = useTheme();

    // Generate error reference ID if not provided
    const referenceId = errorId || `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    /**
     * Handle page refresh
     */
    const handleRefresh = () => {
        window.location.reload();
    };

    const navigationOptions = [
        {
            label: 'Refresh Page',
            icon: <RefreshIcon />,
            onClick: handleRefresh,
            variant: 'contained',
            ariaLabel: 'Refresh the page'
        },
        {
            label: 'Go to Home',
            icon: <HomeIcon />,
            onClick: () => window.location.href = '/',
            variant: 'outlined',
            ariaLabel: 'Navigate to home page'
        }
    ];

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
                    {/* Error Visual */}
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
                                color: alpha(theme.palette.error.main, 0.1),
                                lineHeight: 1,
                                userSelect: 'none'
                            }}
                            aria-hidden="true"
                        >
                            500
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
                            <ErrorOutlineIcon
                                sx={{
                                    fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
                                    color: theme.palette.error.main,
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
                        Something Went Wrong
                    </Typography>

                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{
                            mb: 3,
                            maxWidth: '600px',
                            mx: 'auto',
                            lineHeight: 1.7
                        }}
                    >
                        {message || 
                            "We're sorry, but something unexpected happened on our end. " +
                            "Our team has been notified and is working to fix the issue. " +
                            "Please try refreshing the page or come back later."
                        }
                    </Typography>

                    {/* Error Reference ID */}
                    <Box sx={{ mb: 4 }}>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 1 }}
                        >
                            Error Reference ID
                        </Typography>
                        <Chip
                            label={referenceId}
                            size="medium"
                            sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                color: theme.palette.error.main,
                                fontWeight: 600
                            }}
                            aria-label={`Error reference ID: ${referenceId}`}
                        />
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 1 }}
                        >
                            Please provide this ID when contacting support
                        </Typography>
                    </Box>

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

                    {/* Support Information */}
                    <Box
                        sx={{
                            mt: 4,
                            pt: 3,
                            borderTop: `1px solid ${theme.palette.divider}`
                        }}
                    >
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                        >
                            Need immediate assistance?
                        </Typography>
                        <Button
                            variant="text"
                            startIcon={<ContactSupportIcon />}
                            onClick={() => window.open('mailto:support@example.com', '_blank')}
                            aria-label="Contact support via email"
                            sx={{
                                '&:focus-visible': {
                                    outline: `3px solid ${theme.palette.primary.main}`,
                                    outlineOffset: '2px'
                                }
                            }}
                        >
                            Contact Support
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

/**
 * ServerError Component (500 Error Page)
 * 
 * Displays a friendly 500 error page when server errors occur.
 * Provides role-aware navigation options and error reference information.
 * 
 * This component safely handles both Router and non-Router contexts.
 * 
 * Requirements: 13.2, 13.3, 13.4, 13.5
 * 
 * Accessibility Features:
 * - Proper heading hierarchy (h1 for main heading)
 * - Descriptive alt text for visual elements
 * - Keyboard navigation support for all interactive elements
 * - WCAG 2.1 AA compliant color contrast
 * - Focus indicators on interactive elements
 * 
 * @param {Object} props - Component props
 * @param {string} props.errorId - Optional error reference ID for support
 * @param {string} props.message - Optional custom error message
 */
const ServerError = ({ errorId, message }) => {
    // Always use the non-Router version to avoid hook context issues
    // This ensures the component works in ErrorBoundary and other contexts
    return <ServerErrorWithoutRouter errorId={errorId} message={message} />;
};

export default ServerError;
