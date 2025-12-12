/**
 * Module Guard Component
 * 
 * Conditionally renders children based on module availability.
 * Shows fallback content if module is disabled.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Paper } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useModules } from '../contexts/ModuleContext';

const ModuleGuard = ({ 
    moduleId, 
    children, 
    fallback = null,
    showDefaultFallback = true 
}) => {
    const { isModuleEnabled, loading } = useModules();

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
                        <LockIcon
                            sx={{
                                fontSize: 64,
                                color: 'text.secondary',
                                mb: 2,
                            }}
                        />
                        <Typography variant="h5" gutterBottom>
                            Module Not Available
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            This feature is not enabled for your organization.
                            Please contact your administrator to enable the {moduleId} module.
                        </Typography>
                    </Paper>
                </Box>
            );
        }

        // Don't render anything
        return null;
    }

    // Module is enabled, render children
    return <>{children}</>;
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
};

export default ModuleGuard;
