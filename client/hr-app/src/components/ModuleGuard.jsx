/**
 * Module Guard Component
 * 
 * Conditionally renders children based on module availability.
 * Shows fallback content if module is disabled or unlicensed.
 * Integrates with license-aware module availability system.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Paper, Button } from '@mui/material';
import { Lock, Warning, Info } from '@mui/icons-material';
import { useModules } from '../contexts/ModuleContext';

const ModuleGuard = ({ 
    moduleId, 
    children, 
    fallback = null,
    showDefaultFallback = true,
    variant = 'card',
    onUpgrade = null
}) => {
    const { isModuleEnabled, getModuleUnavailabilityReason, loading } = useModules();

    // Show loading state
    if (loading) {
        return null;
    }

    // Check if module is enabled
    const enabled = isModuleEnabled(moduleId);

    if (!enabled) {
        // Show custom fallback if provided
        if (fallback) {
            return fallback;
        }

        // Show default fallback if enabled
        if (showDefaultFallback) {
            const reason = getModuleUnavailabilityReason(moduleId);
            return renderUnavailableMessage(moduleId, reason, variant, onUpgrade);
        }

        // Don't render anything
        return null;
    }

    // Module is enabled, render children
    return <>{children}</>;
};

/**
 * Render unavailability message based on reason and variant
 */
const renderUnavailableMessage = (moduleId, reason, variant, onUpgrade) => {
    const getReasonDetails = (reason) => {
        switch (reason) {
            case 'module_disabled':
                return {
                    icon: <Warning sx={{ fontSize: 64, color: 'warning.main' }} />,
                    title: 'Module Not Enabled',
                    message: `The ${moduleId} module is not enabled for your organization.`,
                    action: 'Contact your administrator to enable this module.',
                    severity: 'warning'
                };
            case 'feature_not_licensed':
                return {
                    icon: <Lock sx={{ fontSize: 64, color: 'error.main' }} />,
                    title: 'License Upgrade Required',
                    message: `The ${moduleId} module requires a license upgrade.`,
                    action: 'Upgrade your license to access this feature.',
                    severity: 'error',
                    showUpgrade: true
                };
            case 'license_invalid':
                return {
                    icon: <Lock sx={{ fontSize: 64, color: 'error.main' }} />,
                    title: 'Invalid License',
                    message: 'Your license is invalid or expired.',
                    action: 'Please contact support to resolve license issues.',
                    severity: 'error'
                };
            case 'module_not_found':
                return {
                    icon: <Info sx={{ fontSize: 64, color: 'info.main' }} />,
                    title: 'Module Not Found',
                    message: `The ${moduleId} module is not available.`,
                    action: 'This feature may not be supported in your version.',
                    severity: 'info'
                };
            default:
                return {
                    icon: <Warning sx={{ fontSize: 64, color: 'text.secondary' }} />,
                    title: 'Module Not Available',
                    message: `The ${moduleId} module is currently unavailable.`,
                    action: 'Please contact your administrator to enable this module.',
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

    // Default card variant
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                p: 3,
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    textAlign: 'center',
                    maxWidth: '500px',
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                {details.icon}
                <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                    {details.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    {details.message}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 1 }}>
                    {details.action}
                </Typography>
                {details.showUpgrade && onUpgrade && (
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={onUpgrade}
                        sx={{ mt: 2 }}
                    >
                        Upgrade License
                    </Button>
                )}
            </Paper>
        </Box>
    );
};

ModuleGuard.propTypes = {
    /** Module ID to check */
    moduleId: PropTypes.string.isRequired,
    
    /** Content to render if module is enabled */
    children: PropTypes.node.isRequired,
    
    /** Custom fallback content if module is disabled */
    fallback: PropTypes.node,
    
    /** Show default "Module Not Available" message */
    showDefaultFallback: PropTypes.bool,
    
    /** Display variant */
    variant: PropTypes.oneOf(['card', 'minimal']),
    
    /** Callback when upgrade button is clicked */
    onUpgrade: PropTypes.func,
};

export default ModuleGuard;
