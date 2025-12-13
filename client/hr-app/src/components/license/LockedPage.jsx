/**
 * LockedPage Component
 * 
 * A full-page component that displays when a user navigates to a page
 * for a module that is not included in their license.
 * 
 * Features:
 * - Full-page locked state
 * - Module information display
 * - Upgrade CTA with pricing
 * - Navigation back to dashboard
 * - Supports light/dark theme
 * - WCAG 2.1 AA accessible
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Button, Container, Stack } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { designTokens } from '../../theme/designTokens';
import { useThemeConfig } from '../../context/ThemeContext';

const LockedPage = React.memo(({
    moduleKey,
    moduleName,
    description,
    features = [],
    startingPrice,
    onUpgradeClick,
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

    const handleBackClick = () => {
        navigate('/dashboard');
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'background.default',
                padding: designTokens.spacing.lg,
            }}
            role="main"
            aria-labelledby="locked-page-title"
        >
            <Container maxWidth="md">
                <Stack spacing={4} alignItems="center">
                    {/* Lock Icon */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                            marginBottom: designTokens.spacing.md,
                        }}
                        aria-hidden="true"
                    >
                        <LockIcon
                            sx={{
                                fontSize: '60px',
                                color: 'text.secondary',
                            }}
                        />
                    </Box>

                    {/* Module Name */}
                    <Typography
                        id="locked-page-title"
                        variant="h3"
                        component="h1"
                        sx={{
                            fontWeight: designTokens.typography.fontWeight.bold,
                            textAlign: 'center',
                            color: 'text.primary',
                        }}
                    >
                        {moduleName}
                    </Typography>

                    {/* Description */}
                    {description && (
                        <Typography
                            variant="h6"
                            sx={{
                                color: 'text.secondary',
                                textAlign: 'center',
                                maxWidth: '600px',
                                lineHeight: designTokens.typography.lineHeight.relaxed,
                                fontWeight: designTokens.typography.fontWeight.regular,
                            }}
                        >
                            {description}
                        </Typography>
                    )}

                    {/* Features List */}
                    {features.length > 0 && (
                        <Box
                            sx={{
                                width: '100%',
                                maxWidth: '500px',
                                padding: designTokens.spacing.lg,
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
                                borderRadius: designTokens.borderRadius.lg,
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <Typography
                                variant="subtitle1"
                                sx={{
                                    fontWeight: designTokens.typography.fontWeight.semibold,
                                    marginBottom: designTokens.spacing.md,
                                    color: 'text.primary',
                                }}
                            >
                                Key Features:
                            </Typography>
                            <Stack spacing={1.5} component="ul" sx={{ margin: 0, paddingLeft: designTokens.spacing.lg }}>
                                {features.map((feature, index) => (
                                    <Typography
                                        key={index}
                                        component="li"
                                        variant="body2"
                                        sx={{
                                            color: 'text.secondary',
                                            lineHeight: designTokens.typography.lineHeight.relaxed,
                                        }}
                                    >
                                        {feature}
                                    </Typography>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {/* Pricing */}
                    {startingPrice && (
                        <Box
                            sx={{
                                padding: designTokens.spacing.lg,
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                borderRadius: designTokens.borderRadius.lg,
                                textAlign: 'center',
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
                                variant="h4"
                                component="p"
                                sx={{
                                    fontWeight: designTokens.typography.fontWeight.bold,
                                    color: 'primary.main',
                                }}
                            >
                                ${startingPrice}
                                <Typography
                                    component="span"
                                    variant="body1"
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

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={2} sx={{ marginTop: designTokens.spacing.lg }}>
                        <Button
                            variant="outlined"
                            color="primary"
                            size="large"
                            startIcon={<ArrowBackIcon />}
                            onClick={handleBackClick}
                            sx={{
                                paddingX: designTokens.spacing.lg,
                                paddingY: designTokens.spacing.md,
                                borderRadius: designTokens.borderRadius.md,
                            }}
                            aria-label="Go back to dashboard"
                        >
                            Back to Dashboard
                        </Button>
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
                            aria-label={`Upgrade to access ${moduleName}`}
                        >
                            View Pricing & Upgrade
                        </Button>
                    </Stack>

                    {/* Additional Info */}
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'text.secondary',
                            textAlign: 'center',
                            marginTop: designTokens.spacing.md,
                        }}
                    >
                        This module is not included in your current plan. Upgrade to unlock all features.
                    </Typography>
                </Stack>
            </Container>
        </Box>
    );
});

LockedPage.propTypes = {
    /** Module key for routing to pricing page */
    moduleKey: PropTypes.string.isRequired,

    /** Name of the locked module */
    moduleName: PropTypes.string.isRequired,

    /** Description of the module */
    description: PropTypes.string,

    /** List of key features */
    features: PropTypes.arrayOf(PropTypes.string),

    /** Starting price for the module */
    startingPrice: PropTypes.number,

    /** Custom upgrade click handler */
    onUpgradeClick: PropTypes.func,
};

LockedPage.displayName = 'LockedPage';

export default LockedPage;
