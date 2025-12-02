/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree
 * Logs errors and displays a fallback UI
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Container
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details

        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // You can also log the error to an error reporting service here
        // logErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            return (
                <Container maxWidth="md">
                    <Box
                        sx={{
                            minHeight: '100vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 4
                        }}
                    >
                        <Paper
                            elevation={0}
                            sx={{
                                p: 5,
                                textAlign: 'center',
                                borderRadius: 3,
                                border: '2px solid',
                                borderColor: 'error.light',
                                bgcolor: 'background.paper',
                                maxWidth: 600
                            }}
                        >
                            <ErrorOutlineIcon
                                sx={{
                                    fontSize: 80,
                                    color: 'error.main',
                                    mb: 3
                                }}
                            />
                            
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 700,
                                    mb: 2,
                                    color: 'text.primary'
                                }}
                            >
                                Oops! Something went wrong
                            </Typography>
                            
                            <Typography
                                variant="body1"
                                color="text.secondary"
                                sx={{ mb: 4, lineHeight: 1.7 }}
                            >
                                We encountered an unexpected error. Don't worry, your data is safe.
                                Try refreshing the page or contact support if the problem persists.
                            </Typography>

                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <Paper
                                    sx={{
                                        p: 2,
                                        mb: 3,
                                        bgcolor: 'grey.100',
                                        textAlign: 'left',
                                        maxHeight: 200,
                                        overflow: 'auto'
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        component="pre"
                                        sx={{
                                            fontFamily: 'monospace',
                                            fontSize: '0.75rem',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word'
                                        }}
                                    >
                                        {this.state.error.toString()}
                                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                                    </Typography>
                                </Paper>
                            )}

                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                                <Button
                                    variant="outlined"
                                    onClick={this.handleReset}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        px: 3
                                    }}
                                >
                                    Try Again
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<RefreshIcon />}
                                    onClick={this.handleReload}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        px: 3
                                    }}
                                >
                                    Reload Page
                                </Button>
                            </Box>
                        </Paper>
                    </Box>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
