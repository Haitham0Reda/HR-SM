/**
 * UpgradeModal Component
 * 
 * A modal dialog that displays when a user attempts to access a locked feature.
 * Shows feature information and provides upgrade options.
 * 
 * Features:
 * - Modal dialog with feature details
 * - Pricing tier comparison
 * - Multiple upgrade options
 * - Supports light/dark theme
 * - WCAG 2.1 AA accessible
 * - Keyboard navigation support
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Button,
    Box,
    Stack,
    IconButton,
    Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { designTokens } from '../../theme/designTokens';
import { useThemeConfig } from '../../context/ThemeContext';

const UpgradeModal = React.memo(({
    open,
    onClose,
    moduleKey,
    featureName,
    description,
    currentTier = 'starter',
    requiredTier = 'business',
    pricingTiers = [],
    onUpgradeClick,
}) => {
    const navigate = useNavigate();
    const { colorMode } = useThemeConfig();
    const isDark = colorMode === 'dark';

    const handleUpgradeClick = (tier) => {
        if (onUpgradeClick) {
            onUpgradeClick(tier);
        } else {
            navigate(`/pricing?module=${moduleKey}&tier=${tier}`);
        }
        onClose();
    };

    const handleViewAllPricing = () => {
        navigate(`/pricing?module=${moduleKey}`);
        onClose();
    };

    // Default pricing tiers if none provided
    const defaultTiers = [
        {
            name: 'Business',
            price: 8,
            features: ['All Starter features', 'Advanced reporting', 'Priority support', 'Custom integrations'],
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            features: ['All Business features', 'Unlimited users', 'Dedicated support', 'SLA guarantee'],
        },
    ];

    const displayTiers = pricingTiers.length > 0 ? pricingTiers : defaultTiers;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            sx={{
                '& .MuiDialog-paper': {
                    borderRadius: designTokens.borderRadius.lg,
                    boxShadow: designTokens.shadows.xl,
                },
            }}
            aria-labelledby="upgrade-modal-title"
            aria-describedby="upgrade-modal-description"
        >
            {/* Header */}
            <DialogTitle
                id="upgrade-modal-title"
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: designTokens.spacing.lg,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.sm }}>
                    <LockIcon sx={{ color: 'primary.main', fontSize: '28px' }} aria-hidden="true" />
                    <Typography
                        variant="h5"
                        component="span"
                        sx={{
                            fontWeight: designTokens.typography.fontWeight.semibold,
                        }}
                    >
                        Upgrade Required
                    </Typography>
                </Box>
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                        color: 'text.secondary',
                        '&:hover': {
                            bgcolor: 'action.hover',
                        },
                    }}
                    aria-label="Close upgrade modal"
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            {/* Content */}
            <DialogContent
                id="upgrade-modal-description"
                sx={{
                    padding: designTokens.spacing.lg,
                }}
            >
                <Stack spacing={3}>
                    {/* Feature Info */}
                    <Box>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: designTokens.typography.fontWeight.semibold,
                                marginBottom: designTokens.spacing.sm,
                                color: 'text.primary',
                            }}
                        >
                            {featureName}
                        </Typography>
                        {description && (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'text.secondary',
                                    lineHeight: designTokens.typography.lineHeight.relaxed,
                                }}
                            >
                                {description}
                            </Typography>
                        )}
                    </Box>

                    <Divider />

                    {/* Current Plan Info */}
                    <Box
                        sx={{
                            padding: designTokens.spacing.md,
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
                            borderRadius: designTokens.borderRadius.md,
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'text.secondary',
                                marginBottom: designTokens.spacing.xs,
                            }}
                        >
                            Your current plan:
                        </Typography>
                        <Typography
                            variant="subtitle1"
                            sx={{
                                fontWeight: designTokens.typography.fontWeight.semibold,
                                color: 'text.primary',
                                textTransform: 'capitalize',
                            }}
                        >
                            {currentTier}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'warning.main',
                                marginTop: designTokens.spacing.xs,
                            }}
                        >
                            This feature requires the {requiredTier} plan or higher
                        </Typography>
                    </Box>

                    {/* Pricing Tiers */}
                    <Box>
                        <Typography
                            variant="subtitle1"
                            sx={{
                                fontWeight: designTokens.typography.fontWeight.semibold,
                                marginBottom: designTokens.spacing.md,
                                color: 'text.primary',
                            }}
                        >
                            Available Upgrade Options:
                        </Typography>
                        <Stack spacing={2}>
                            {displayTiers.map((tier, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        padding: designTokens.spacing.md,
                                        border: '2px solid',
                                        borderColor: tier.name.toLowerCase() === requiredTier.toLowerCase()
                                            ? 'primary.main'
                                            : 'divider',
                                        borderRadius: designTokens.borderRadius.md,
                                        backgroundColor: tier.name.toLowerCase() === requiredTier.toLowerCase()
                                            ? isDark ? 'rgba(77, 163, 255, 0.08)' : 'rgba(0, 123, 255, 0.04)'
                                            : 'transparent',
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            backgroundColor: isDark ? 'rgba(77, 163, 255, 0.08)' : 'rgba(0, 123, 255, 0.04)',
                                        },
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: designTokens.spacing.sm }}>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: designTokens.typography.fontWeight.semibold,
                                                color: 'text.primary',
                                            }}
                                        >
                                            {tier.name}
                                        </Typography>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: designTokens.typography.fontWeight.bold,
                                                color: 'primary.main',
                                            }}
                                        >
                                            {typeof tier.price === 'number' ? `$${tier.price}/mo` : tier.price}
                                        </Typography>
                                    </Box>
                                    <Stack spacing={0.5}>
                                        {tier.features.map((feature, featureIndex) => (
                                            <Box
                                                key={featureIndex}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: designTokens.spacing.xs,
                                                }}
                                            >
                                                <CheckCircleIcon
                                                    sx={{
                                                        fontSize: '16px',
                                                        color: 'success.main',
                                                    }}
                                                    aria-hidden="true"
                                                />
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: 'text.secondary',
                                                    }}
                                                >
                                                    {feature}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                    <Button
                                        variant={tier.name.toLowerCase() === requiredTier.toLowerCase() ? 'contained' : 'outlined'}
                                        color="primary"
                                        fullWidth
                                        onClick={() => handleUpgradeClick(tier.name.toLowerCase())}
                                        sx={{
                                            marginTop: designTokens.spacing.md,
                                            borderRadius: designTokens.borderRadius.md,
                                        }}
                                        aria-label={`Upgrade to ${tier.name} plan`}
                                    >
                                        Upgrade to {tier.name}
                                    </Button>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>

            {/* Actions */}
            <DialogActions
                sx={{
                    padding: designTokens.spacing.lg,
                    paddingTop: designTokens.spacing.md,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    gap: designTokens.spacing.sm,
                }}
            >
                <Button
                    variant="text"
                    onClick={handleViewAllPricing}
                    sx={{
                        color: 'text.secondary',
                    }}
                    aria-label="View all pricing options"
                >
                    View All Pricing
                </Button>
                <Button
                    variant="outlined"
                    onClick={onClose}
                    aria-label="Close modal"
                >
                    Maybe Later
                </Button>
            </DialogActions>
        </Dialog>
    );
};

});

UpgradeModal.propTypes = {
    /** Modal open state */
    open: PropTypes.bool.isRequired,

    /** Close handler */
    onClose: PropTypes.func.isRequired,

    /** Module key for routing */
    moduleKey: PropTypes.string.isRequired,

    /** Name of the locked feature */
    featureName: PropTypes.string.isRequired,

    /** Description of the feature */
    description: PropTypes.string,

    /** Current pricing tier */
    currentTier: PropTypes.string,

    /** Required pricing tier for the feature */
    requiredTier: PropTypes.string,

    /** Array of pricing tier objects */
    pricingTiers: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string.isRequired,
            price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
            features: PropTypes.arrayOf(PropTypes.string).isRequired,
        })
    ),

    /** Custom upgrade click handler */
    onUpgradeClick: PropTypes.func,
};

UpgradeModal.displayName = 'UpgradeModal';

export default UpgradeModal;
