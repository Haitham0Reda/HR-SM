/**
 * LockedFeature Component
 * 
 * An overlay component that displays when a user attempts to access
 * a feature that is not included in their current license.
 * 
 * Features:
 * - Displays lock icon and feature information
 * - Shows pricing information
 * - Provides upgrade CTA
 * - Supports light/dark theme
 * - WCAG 2.1 AA accessible
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';
import { designTokens } from '../../theme/designTokens';
import { useThemeConfig } from '../../context/ThemeContext';

const LockedFeature = React.memo(({
    moduleKey,
    featureName,
    description,
    startingPrice,
    onUpgradeClick,
    sx = {},
}) => {
    const navigate = useNavigate();
    const { colorMode } = useThemeConfig();
    const isDark = colorMode === 'dark';

    const handleUpgradeClick = () => {
        if (onUpgradeClick) {
            onUpgradeClick();
        } else {
            navigate(`/pricing?module=${moduleKey}`);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: designTokens.spacing.xxl,
                textAlign: 'center',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                borderRadius: designTokens.borderRadius.lg,
                border: '2px dashed',
                borderColor: 'divider',
                minHeight: '400px',
                ...sx,
            }}
            role="region"
            aria-label={`${featureName} is locked`}
        >
            {/* Lock Icon */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                    marginBottom: designTokens.spacing.lg,
                }}
                aria-hidden="true"
            >
                <LockIcon
                    sx={{
                        fontSize: '40px',
                        color: 'text.secondary',
                    }}
                />
            </Box>

            {/* Feature Name */}
            <Typography
                variant="h4"
                component="h2"
                sx={{
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    marginBottom: designTokens.spacing.sm,
                    color: 'text.primary',
                }}
            >
                {featureName}
            </Typography>

            {/* Description */}
            {description && (
                <Typography
                    variant="body1"
                    sx={{
                        color: 'text.secondary',
                        marginBottom: designTokens.spacing.lg,
                        maxWidth: '500px',
                        lineHeight: designTokens.typography.lineHeight.relaxed,
                    }}
                >
                    {description}
                </Typography>
            )}

            {/* Pricing Preview */}
            {startingPrice && (
                <Box
                    sx={{
                        padding: designTokens.spacing.md,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        borderRadius: designTokens.borderRadius.md,
                        marginBottom: designTokens.spacing.lg,
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'text.secondary',
                            marginBottom: designTokens.spacing.xs,
                        }}
                    >
                        Starting at
                    </Typography>
                    <Typography
                        variant="h5"
                        component="p"
                        sx={{
                            fontWeight: designTokens.typography.fontWeight.bold,
                            color: 'primary.main',
                        }}
                    >
                        ${startingPrice}
                        <Typography
                            component="span"
                            variant="body2"
                            sx={{
                                color: 'text.secondary',
                                fontWeight: designTokens.typography.fontWeight.regular,
                            }}
                        >
                            /employee/month
                        </Typography>
                    </Typography>
                </Box>
            )}

            {/* Upgrade Button */}
            <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleUpgradeClick}
                sx={{
                    paddingX: designTokens.spacing.xl,
                    paddingY: designTokens.spacing.md,
                    fontSize: designTokens.typography.fontSize.md,
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    borderRadius: designTokens.borderRadius.md,
                    boxShadow: designTokens.shadows.md,
                    '&:hover': {
                        boxShadow: designTokens.shadows.lg,
                        transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.2s ease-in-out',
                }}
                aria-label={`Upgrade to access ${featureName}`}
            >
                View Pricing & Upgrade
            </Button>

            {/* Additional Info */}
            <Typography
                variant="caption"
                sx={{
                    color: 'text.secondary',
                    marginTop: designTokens.spacing.md,
                }}
            >
                This feature is not included in your current plan
            </Typography>
        </Box>
    );
};

});

LockedFeature.propTypes = {
    /** Module key for routing to pricing page */
    moduleKey: PropTypes.string.isRequired,

    /** Name of the locked feature */
    featureName: PropTypes.string.isRequired,

    /** Description of the feature */
    description: PropTypes.string,

    /** Starting price for the feature */
    startingPrice: PropTypes.number,

    /** Custom upgrade click handler */
    onUpgradeClick: PropTypes.func,

    /** Custom styles */
    sx: PropTypes.object,
};

LockedFeature.displayName = 'LockedFeature';

export default LockedFeature;
