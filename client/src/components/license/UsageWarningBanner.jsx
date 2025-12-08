/**
 * UsageWarningBanner Component
 * 
 * A banner component that displays usage warnings when a module approaches or exceeds its limits.
 * 
 * Features:
 * - Displays usage percentage and current/limit values
 * - Supports severity levels (warning, critical)
 * - Dismissible with localStorage persistence
 * - Real-time usage updates
 * - Supports light/dark theme
 * - WCAG 2.1 AA accessible
 * 
 * Severity Levels:
 * - warning: 80-94% usage (yellow/warning color)
 * - critical: 95%+ usage (red/error color)
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Alert, AlertTitle, Box, Typography, Button, IconButton, LinearProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import { useNavigate } from 'react-router-dom';
import { designTokens } from '../../theme/designTokens';
import { useLicense } from '../../context/LicenseContext';

const UsageWarningBanner = ({
    moduleKey,
    moduleName,
    limitType,
    usage,
    onDismiss,
    dismissible = true,
    showUpgradeButton = true,
    sx = {},
}) => {
    const navigate = useNavigate();
    const { getModuleUsage } = useLicense();
    const [dismissed, setDismissed] = useState(false);
    const [currentUsage, setCurrentUsage] = useState(usage);

    // Generate unique key for localStorage
    const dismissKey = `usage-warning-dismissed-${moduleKey}-${limitType}`;

    // Check if banner was previously dismissed
    useEffect(() => {
        if (dismissible) {
            const isDismissed = localStorage.getItem(dismissKey) === 'true';
            setDismissed(isDismissed);
        }
    }, [dismissKey, dismissible]);

    // Real-time usage updates
    useEffect(() => {
        if (!moduleKey || !limitType) return;

        const updateUsage = () => {
            const moduleUsage = getModuleUsage(moduleKey);
            if (moduleUsage && moduleUsage[limitType]) {
                setCurrentUsage(moduleUsage[limitType]);
            }
        };

        // Initial update
        updateUsage();

        // Poll for updates every 30 seconds
        const interval = setInterval(updateUsage, 30000);

        return () => clearInterval(interval);
    }, [moduleKey, limitType, getModuleUsage]);

    // Use provided usage or current usage from context
    const usageData = usage || currentUsage;

    // Early return checks - must be before any other hooks
    const shouldRender = usageData &&
        !dismissed &&
        usageData.limit &&
        usageData.percentage !== null &&
        usageData.percentage >= 80;

    // Clear dismissal after 24 hours
    useEffect(() => {
        if (dismissible && !shouldRender) {
            const dismissTime = localStorage.getItem(`${dismissKey}-time`);
            if (dismissTime) {
                const hoursSinceDismiss = (Date.now() - parseInt(dismissTime)) / (1000 * 60 * 60);
                if (hoursSinceDismiss >= 24) {
                    localStorage.removeItem(dismissKey);
                    localStorage.removeItem(`${dismissKey}-time`);
                    setDismissed(false);
                }
            } else if (dismissed) {
                localStorage.setItem(`${dismissKey}-time`, Date.now().toString());
            }
        }
    }, [dismissKey, dismissed, dismissible, shouldRender]);

    if (!shouldRender) {
        return null;
    }

    const { current, limit, percentage } = usageData;

    // Determine severity based on percentage
    const severity = percentage >= 95 ? 'critical' : 'warning';
    const alertSeverity = severity === 'critical' ? 'error' : 'warning';
    const Icon = severity === 'critical' ? ErrorIcon : WarningIcon;

    // Format limit type for display
    const formatLimitType = (type) => {
        const typeMap = {
            employees: 'employee',
            storage: 'storage',
            apiCalls: 'API call',
        };
        return typeMap[type] || type;
    };

    // Format value based on limit type
    const formatValue = (value, type) => {
        if (type === 'storage') {
            // Convert bytes to GB
            const gb = value / (1024 * 1024 * 1024);
            return `${gb.toFixed(2)} GB`;
        }
        if (type === 'apiCalls') {
            return value.toLocaleString();
        }
        return value.toString();
    };

    const handleDismiss = () => {
        if (dismissible) {
            localStorage.setItem(dismissKey, 'true');
            setDismissed(true);
            if (onDismiss) {
                onDismiss();
            }
        }
    };

    const handleUpgrade = () => {
        navigate(`/pricing?module=${moduleKey}`);
    };

    return (
        <Alert
            severity={alertSeverity}
            icon={<Icon />}
            sx={{
                marginBottom: designTokens.spacing.md,
                borderRadius: designTokens.borderRadius.md,
                boxShadow: designTokens.shadows.sm,
                ...sx,
            }}
            action={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.sm }}>
                    {showUpgradeButton && (
                        <Button
                            color="inherit"
                            size="small"
                            onClick={handleUpgrade}
                            sx={{
                                fontWeight: designTokens.typography.fontWeight.semibold,
                                textTransform: 'none',
                            }}
                            aria-label={`Upgrade ${moduleName || moduleKey} plan`}
                        >
                            Upgrade Plan
                        </Button>
                    )}
                    {dismissible && (
                        <IconButton
                            aria-label="dismiss warning"
                            color="inherit"
                            size="small"
                            onClick={handleDismiss}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            }
            role="alert"
            aria-live="polite"
        >
            <AlertTitle sx={{ fontWeight: designTokens.typography.fontWeight.semibold }}>
                {severity === 'critical' ? 'Critical: ' : 'Warning: '}
                {moduleName || moduleKey} Usage Limit
            </AlertTitle>

            <Box sx={{ marginTop: designTokens.spacing.xs }}>
                <Typography
                    variant="body2"
                    sx={{
                        marginBottom: designTokens.spacing.sm,
                        lineHeight: designTokens.typography.lineHeight.relaxed,
                    }}
                >
                    You're using {percentage}% of your {formatLimitType(limitType)} limit (
                    {formatValue(current, limitType)} of {formatValue(limit, limitType)})
                    {severity === 'critical' && '. Further usage may be blocked.'}
                </Typography>

                {/* Progress Bar */}
                <Box sx={{ marginTop: designTokens.spacing.sm }}>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(percentage, 100)}
                        color={severity === 'critical' ? 'error' : 'warning'}
                        sx={{
                            height: '8px',
                            borderRadius: designTokens.borderRadius.pill,
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        }}
                        aria-label={`Usage progress: ${percentage}%`}
                    />
                </Box>
            </Box>
        </Alert>
    );
};

UsageWarningBanner.propTypes = {
    /** Module key for routing and identification */
    moduleKey: PropTypes.string.isRequired,

    /** Display name of the module */
    moduleName: PropTypes.string,

    /** Type of limit being tracked (employees, storage, apiCalls) */
    limitType: PropTypes.oneOf(['employees', 'storage', 'apiCalls']).isRequired,

    /** Usage data object with current, limit, and percentage */
    usage: PropTypes.shape({
        current: PropTypes.number.isRequired,
        limit: PropTypes.number.isRequired,
        percentage: PropTypes.number.isRequired,
    }),

    /** Callback when banner is dismissed */
    onDismiss: PropTypes.func,

    /** Whether the banner can be dismissed */
    dismissible: PropTypes.bool,

    /** Whether to show the upgrade button */
    showUpgradeButton: PropTypes.bool,

    /** Custom styles */
    sx: PropTypes.object,
};

export default UsageWarningBanner;
