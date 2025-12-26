/**
 * Module Guard Component
 * 
 * React component that conditionally renders content based on module availability.
 * Integrates with the module availability system to show/hide features.
 * 
 * Requirements: 5.1, 4.2, 4.5
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Box, Button, Card, CardContent, Typography } from '@mui/material';
import { Lock, Warning, Info } from '@mui/icons-material';
import { useModuleCheck } from '../../hooks/useModuleAvailability';

/**
 * Module Guard Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.module - Required module name
 * @param {React.ReactNode} props.children - Content to render when module is available
 * @param {React.ReactNode} props.fallback - Custom fallback content when module is unavailable
 * @param {boolean} props.showReason - Whether to show the unavailability reason
 * @param {string} props.variant - Display variant ('alert', 'card', 'minimal')
 * @param {Function} props.onUpgrade - Callback when upgrade button is clicked
 */
const ModuleGuard = ({
    module,
    children,
    fallback = null,
    showReason = true,
    variant = 'card',
    onUpgrade = null
}) => {
    const { available, loading, unavailabilityReason, error } = useModuleCheck(module);

    // Show loading state
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" p={2}>
                <Typography variant="body2" color="textSecondary">
                    Checking module availability...
                </Typography>
            </Box>
        );
    }

    // Show error state
    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                <Typography variant="body2">
                    Unable to check module availability: {error}
                </Typography>
            </Alert>
        );
    }

    // Module is available - render children
    if (available) {
        return <>{children}</>;
    }

    // Module is not available - render fallback or default message
    if (fallback) {
        return <>{fallback}</>;
    }

    // Render default unavailability message based on variant
    return renderUnavailableMessage(module, unavailabilityReason, variant, showReason, onUpgrade);
};

/**
 * Render unavailability message based on variant
 */
const renderUnavailableMessage = (module, reason, variant, showReason, onUpgrade) => {
    const getReasonDetails = (reason) => {
        switch (reason) {
            case 'module_disabled':
                return {
                    icon: <Warning color="warning" />,
                    title: 'Module Not Enabled',
                    message: `The ${module} module is not enabled for your organization.`,
                    action: 'Contact your administrator to enable this module.',
                    severity: 'warning'
                };
            case 'feature_not_licensed':
                return {
                    icon: <Lock color="error" />,
                    title: 'License Upgrade Required',
                    message: `The ${module} module requires a license upgrade.`,
                    action: 'Upgrade your license to access this feature.',
                    severity: 'error',
                    showUpgrade: true
                };
            case 'license_invalid':
                return {
                    icon: <Lock color="error" />,
                    title: 'Invalid License',
                    message: 'Your license is invalid or expired.',
                    action: 'Please contact support to resolve license issues.',
                    severity: 'error'
                };
            case 'module_not_found':
                return {
                    icon: <Info color="info" />,
                    title: 'Module Not Found',
                    message: `The ${module} module is not available.`,
                    action: 'This feature may not be supported in your version.',
                    severity: 'info'
                };
            default:
                return {
                    icon: <Warning color="warning" />,
                    title: 'Module Unavailable',
                    message: `The ${module} module is currently unavailable.`,
                    action: 'Please try again later or contact support.',
                    severity: 'warning'
                };
        }
    };

    const details = getReasonDetails(reason);

    if (variant === 'minimal') {
        return (
            <Box p={1}>
                <Typography variant="body2" color="textSecondary">
                    {details.message}
                </Typography>
            </Box>
        );
    }

    if (variant === 'alert') {
        return (
            <Alert 
                severity={details.severity} 
                icon={details.icon}
                sx={{ m: 2 }}
                action={
                    details.showUpgrade && onUpgrade ? (
                        <Button color="inherit" size="small" onClick={onUpgrade}>
                            Upgrade
                        </Button>
                    ) : null
                }
            >
                <Typography variant="subtitle2" gutterBottom>
                    {details.title}
                </Typography>
                <Typography variant="body2">
                    {details.message}
                </Typography>
                {showReason && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        {details.action}
                    </Typography>
                )}
            </Alert>
        );
    }

    // Default card variant
    return (
        <Card sx={{ m: 2, textAlign: 'center' }}>
            <CardContent>
                <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                    {details.icon}
                    <Typography variant="h6" color="textSecondary">
                        {details.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {details.message}
                    </Typography>
                    {showReason && (
                        <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                            {details.action}
                        </Typography>
                    )}
                    {details.showUpgrade && onUpgrade && (
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={onUpgrade}
                            sx={{ mt: 1 }}
                        >
                            Upgrade License
                        </Button>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

ModuleGuard.propTypes = {
    module: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    fallback: PropTypes.node,
    showReason: PropTypes.bool,
    variant: PropTypes.oneOf(['alert', 'card', 'minimal']),
    onUpgrade: PropTypes.func
};

/**
 * Higher-order component version of ModuleGuard
 * 
 * @param {string} module - Required module name
 * @param {Object} options - Guard options
 * @returns {Function} HOC function
 */
export const withModuleGuard = (module, options = {}) => {
    return (WrappedComponent) => {
        const GuardedComponent = (props) => {
            return (
                <ModuleGuard module={module} {...options}>
                    <WrappedComponent {...props} />
                </ModuleGuard>
            );
        };

        GuardedComponent.displayName = `withModuleGuard(${WrappedComponent.displayName || WrappedComponent.name})`;
        
        return GuardedComponent;
    };
};

/**
 * Hook-based module guard for conditional rendering
 * 
 * @param {string} module - Required module name
 * @returns {Object} Guard state and render function
 */
export const useModuleGuard = (module) => {
    const { available, loading, unavailabilityReason, error } = useModuleCheck(module);

    const renderGuarded = (children, options = {}) => {
        return (
            <ModuleGuard 
                module={module} 
                {...options}
            >
                {children}
            </ModuleGuard>
        );
    };

    return {
        available,
        loading,
        error,
        unavailabilityReason,
        renderGuarded
    };
};

export default ModuleGuard;