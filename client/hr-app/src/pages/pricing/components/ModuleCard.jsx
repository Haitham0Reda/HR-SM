import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    Chip,
    Stack,
    Divider,
    alpha,
    Tooltip
} from '@mui/material';
import {
    CheckCircle as CheckIcon,
    Lock as LockIcon,
    Link as LinkIcon,
    Info as InfoIcon
} from '@mui/icons-material';

const ModuleCard = ({ module, deploymentMode, isEnabled, onUpgrade, allModules }) => {
    const { displayName, commercial, dependencies } = module;
    const pricing = commercial.pricing;

    // Get pricing for current deployment mode
    const starterPrice = deploymentMode === 'saas' ? pricing.starter.monthly : pricing.starter.onPremise;
    const businessPrice = deploymentMode === 'saas' ? pricing.business.monthly : pricing.business.onPremise;

    // Format price display
    const formatPrice = (price) => {
        if (price === 'custom') return 'Custom';
        if (price === 0) return 'Included';
        if (deploymentMode === 'saas') {
            return `$${price}/employee/mo`;
        }
        return `$${price.toLocaleString()} one-time`;
    };

    // Get dependency names
    const getDependencyNames = () => {
        const required = dependencies.required || [];
        const optional = dependencies.optional || [];

        const requiredNames = required
            .filter(dep => dep !== 'hr-core') // Don't show HR Core as it's always included
            .map(dep => allModules[dep]?.displayName || dep);

        const optionalNames = optional
            .map(dep => allModules[dep]?.displayName || dep);

        return { requiredNames, optionalNames };
    };

    const { requiredNames, optionalNames } = getDependencyNames();

    return (
        <Card
            elevation={0}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                border: '2px solid',
                borderColor: isEnabled ? 'success.main' : 'divider',
                transition: 'all 0.3s',
                position: 'relative',
                '&:hover': {
                    borderColor: isEnabled ? 'success.main' : 'primary.main',
                    boxShadow: 4,
                    transform: 'translateY(-4px)'
                }
            }}
        >
            {/* Enabled Badge */}
            {isEnabled && (
                <Chip
                    icon={<CheckIcon />}
                    label="Active"
                    color="success"
                    size="small"
                    sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        fontWeight: 600
                    }}
                />
            )}

            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
                {/* Module Name */}
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, pr: isEnabled ? 8 : 0 }}>
                    {displayName}
                </Typography>

                {/* Description */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flex: 1 }}>
                    {commercial.description}
                </Typography>

                {/* Value Proposition */}
                <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha('#1976d2', 0.05),
                    border: '1px solid',
                    borderColor: alpha('#1976d2', 0.1),
                    mb: 2
                }}>
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        VALUE PROPOSITION
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        {commercial.valueProposition}
                    </Typography>
                </Box>

                {/* Target Segment */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        IDEAL FOR
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        {commercial.targetSegment}
                    </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Pricing */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                        PRICING
                    </Typography>
                    <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                Starter
                            </Typography>
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>
                                {formatPrice(starterPrice)}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                Business
                            </Typography>
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>
                                {formatPrice(businessPrice)}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                Enterprise
                            </Typography>
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>
                                Custom
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                {/* Dependencies */}
                {(requiredNames.length > 0 || optionalNames.length > 0) && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                                DEPENDENCIES
                            </Typography>

                            {requiredNames.length > 0 && (
                                <Box sx={{ mb: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                        <LinkIcon sx={{ fontSize: 14, color: 'error.main' }} />
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main' }}>
                                            Required:
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                        {requiredNames.map((name, index) => (
                                            <Chip
                                                key={index}
                                                label={name}
                                                size="small"
                                                sx={{
                                                    height: 24,
                                                    fontSize: '0.75rem',
                                                    bgcolor: alpha('#d32f2f', 0.1),
                                                    color: 'error.main',
                                                    fontWeight: 600
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            {optionalNames.length > 0 && (
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                        <InfoIcon sx={{ fontSize: 14, color: 'info.main' }} />
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'info.main' }}>
                                            Optional:
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                        {optionalNames.map((name, index) => (
                                            <Chip
                                                key={index}
                                                label={name}
                                                size="small"
                                                sx={{
                                                    height: 24,
                                                    fontSize: '0.75rem',
                                                    bgcolor: alpha('#0288d1', 0.1),
                                                    color: 'info.main',
                                                    fontWeight: 600
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                        </Box>
                    </>
                )}

                {/* Action Button */}
                <Box sx={{ mt: 'auto', pt: 2 }}>
                    {isEnabled ? (
                        <Button
                            fullWidth
                            variant="outlined"
                            color="success"
                            startIcon={<CheckIcon />}
                            disabled
                            sx={{
                                py: 1.5,
                                fontWeight: 600,
                                borderWidth: 2,
                                '&.Mui-disabled': {
                                    borderColor: 'success.main',
                                    color: 'success.main',
                                    opacity: 0.7
                                }
                            }}
                        >
                            Currently Active
                        </Button>
                    ) : (
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={onUpgrade}
                            sx={{
                                py: 1.5,
                                fontWeight: 600,
                                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                                }
                            }}
                        >
                            Upgrade Now
                        </Button>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default ModuleCard;
