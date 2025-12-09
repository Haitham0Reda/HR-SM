import React, { useMemo } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Chip,
    Box,
    alpha,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    Star as StarIcon,
    TrendingUp as TrendingUpIcon,
    Business as BusinessIcon
} from '@mui/icons-material';

const PricingTierComparison = ({ modules, deploymentMode }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Calculate totals for each tier
    const tierTotals = useMemo(() => {
        const totals = {
            starter: 0,
            business: 0,
            enterprise: 0
        };

        modules.forEach(module => {
            const pricing = module.commercial.pricing;
            const priceKey = deploymentMode === 'saas' ? 'monthly' : 'onPremise';

            ['starter', 'business', 'enterprise'].forEach(tier => {
                const price = pricing[tier][priceKey];
                if (typeof price === 'number') {
                    totals[tier] += price;
                }
            });
        });

        return totals;
    }, [modules, deploymentMode]);

    // Format price for display
    const formatPrice = (price, tier) => {
        if (price === 'custom' || tier === 'enterprise') {
            return 'Custom';
        }
        if (price === 0) {
            return 'Included';
        }
        if (deploymentMode === 'saas') {
            return `$${price}/emp/mo`;
        }
        return `$${price.toLocaleString()}`;
    };

    // Get tier icon and color
    const getTierInfo = (tier) => {
        switch (tier) {
            case 'starter':
                return {
                    icon: <StarIcon sx={{ fontSize: 20 }} />,
                    color: '#0288d1',
                    label: 'Starter',
                    description: 'Up to 50 employees'
                };
            case 'business':
                return {
                    icon: <TrendingUpIcon sx={{ fontSize: 20 }} />,
                    color: '#2e7d32',
                    label: 'Business',
                    description: 'Up to 200 employees'
                };
            case 'enterprise':
                return {
                    icon: <BusinessIcon sx={{ fontSize: 20 }} />,
                    color: '#d32f2f',
                    label: 'Enterprise',
                    description: 'Unlimited employees'
                };
            default:
                return { icon: null, color: '#666', label: tier, description: '' };
        }
    };

    if (isMobile) {
        // Mobile view: Show cards instead of table
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {['starter', 'business', 'enterprise'].map(tier => {
                    const tierInfo = getTierInfo(tier);
                    return (
                        <Paper
                            key={tier}
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: 3,
                                border: '2px solid',
                                borderColor: tierInfo.color,
                                bgcolor: alpha(tierInfo.color, 0.05)
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <Box sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    bgcolor: tierInfo.color,
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {tierInfo.icon}
                                </Box>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        {tierInfo.label}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {tierInfo.description}
                                    </Typography>
                                </Box>
                            </Box>

                            {modules.map(module => {
                                const pricing = module.commercial.pricing[tier];
                                const priceKey = deploymentMode === 'saas' ? 'monthly' : 'onPremise';
                                const price = pricing[priceKey];

                                return (
                                    <Box
                                        key={module.key}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            py: 1,
                                            borderBottom: '1px solid',
                                            borderColor: 'divider'
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {module.displayName}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: tierInfo.color }}>
                                            {formatPrice(price, tier)}
                                        </Typography>
                                    </Box>
                                );
                            })}

                            {tier !== 'enterprise' && (
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    pt: 2,
                                    mt: 2,
                                    borderTop: '2px solid',
                                    borderColor: tierInfo.color
                                }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        Total
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: tierInfo.color }}>
                                        {deploymentMode === 'saas'
                                            ? `$${tierTotals[tier]}/emp/mo`
                                            : `$${tierTotals[tier].toLocaleString()}`
                                        }
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    );
                })}
            </Box>
        );
    }

    // Desktop view: Show table
    return (
        <TableContainer
            component={Paper}
            elevation={0}
            sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden'
            }}
        >
            <Table>
                <TableHead>
                    <TableRow sx={{ bgcolor: alpha('#1976d2', 0.05) }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '1rem', py: 2 }}>
                            Module
                        </TableCell>
                        {['starter', 'business', 'enterprise'].map(tier => {
                            const tierInfo = getTierInfo(tier);
                            return (
                                <TableCell
                                    key={tier}
                                    align="center"
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        py: 2,
                                        minWidth: 150
                                    }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 2,
                                            bgcolor: tierInfo.color,
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mb: 0.5
                                        }}>
                                            {tierInfo.icon}
                                        </Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            {tierInfo.label}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {tierInfo.description}
                                        </Typography>
                                    </Box>
                                </TableCell>
                            );
                        })}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {modules.map((module, index) => (
                        <TableRow
                            key={module.key}
                            sx={{
                                '&:nth-of-type(odd)': {
                                    bgcolor: alpha('#000', 0.02)
                                },
                                '&:hover': {
                                    bgcolor: alpha('#1976d2', 0.05)
                                }
                            }}
                        >
                            <TableCell sx={{ fontWeight: 600 }}>
                                {module.displayName}
                            </TableCell>
                            {['starter', 'business', 'enterprise'].map(tier => {
                                const pricing = module.commercial.pricing[tier];
                                const priceKey = deploymentMode === 'saas' ? 'monthly' : 'onPremise';
                                const price = pricing[priceKey];
                                const tierInfo = getTierInfo(tier);

                                return (
                                    <TableCell
                                        key={tier}
                                        align="center"
                                        sx={{
                                            fontWeight: 700,
                                            color: tierInfo.color
                                        }}
                                    >
                                        {formatPrice(price, tier)}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}

                    {/* Total Row */}
                    <TableRow sx={{ bgcolor: alpha('#1976d2', 0.1) }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '1.1rem', py: 2 }}>
                            Total (All Modules)
                        </TableCell>
                        {['starter', 'business', 'enterprise'].map(tier => {
                            const tierInfo = getTierInfo(tier);
                            return (
                                <TableCell
                                    key={tier}
                                    align="center"
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: '1.1rem',
                                        color: tierInfo.color,
                                        py: 2
                                    }}
                                >
                                    {tier === 'enterprise' ? (
                                        'Custom'
                                    ) : (
                                        <>
                                            {deploymentMode === 'saas'
                                                ? `$${tierTotals[tier]}/emp/mo`
                                                : `$${tierTotals[tier].toLocaleString()}`
                                            }
                                        </>
                                    )}
                                </TableCell>
                            );
                        })}
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default PricingTierComparison;
