import React from 'react';
import ServerError from '../pages/errors/ServerError';
import logger from '../utils/logger';

/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI (ServerError page).
 * 
 * This is a class component because error boundaries must be class components
 * as of React 18.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            errorId: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to the console and error reporting service
        const errorId = this.state.errorId;
        
        logger.error('React Error Boundary caught an error', {
            errorId,
            error: error.toString(),
            errorInfo: errorInfo.componentStack,
            timestamp: new Date().toISOString()
        });

        // Update state with error details
        this.setState({
            error,
            errorInfo
        });

        // You can also log the error to an error reporting service here
        // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }

    render() {
        if (this.state.hasError) {
            // Render fallback UI
            return (
                <ServerError
                    errorId={this.state.errorId}
                    message="An unexpected error occurred while rendering this page. Our team has been notified."
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
