import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    LinearProgress,
    Alert,
    AlertTitle,
    Divider,
    useTheme,
    alpha,
    Stack,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Refresh as RefreshIcon,
    ContactSupport as ContactSupportIcon,
    ShoppingCart as ShoppingCartIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import { useLicense } from '../../context/LicenseContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { commercialModuleConfigs } from '../../config/commercialModuleConfigs';

/**
 * LicenseStatusPage Component
 * 
 * Displays a comprehensive dashboard of license status for all enabled modules.
 * Shows expiration dates, usage metrics, and provides renewal/support actions.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
const LicenseStatusPage = () => {
    useDocumentTitle('License Status');
    const theme = useTheme();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const {
        licenses,
        usage,
        loading,
        error,
        getEnabledModules,
        getDaysUntilExpiration,
        isExpiringSoon,
        getModuleUsage,
        refreshLicenses
    } = useLicense();

    const [refreshing, setRefreshing] = useState(false);

    /**
     * Handle license refresh
     */
    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshLicenses();
        setRefreshing(false);
    };

    /**
     * Get status color based on expiration
     */
    const getStatusColor = (moduleKey) => {
        const daysUntil = getDaysUntilExpiration(moduleKey);
        
        if (daysUntil === null) {
            return 'success'; // No expiration
        }
        
        if (daysUntil <= 0) {
            return 'error'; // Expired
        }
        
        if (daysUntil <= 7) {
            return 'error'; // Critical (7 days or less)
        }
        
        if (daysUntil <= 30) {
            return 'warning'; // Warning (30 days or less)
        }
        
        return 'success'; // Normal
    };

    /**
     * Get status icon based on expiration
     */
    const getStatusIcon = (moduleKey) => {
        const statusColor = getStatusColor(moduleKey);
        
        switch (statusColor) {
            case 'error':
                return <ErrorIcon color="error" />;
            case 'warning':
                return <WarningIcon color="warning" />;
            default:
                return <CheckCircleIcon color="success" />;
        }
    };

    /**
     * Format expiration date display
     */
    const formatExpirationDisplay = (moduleKey) => {
        const license = licenses[moduleKey];
        const daysUntil = getDaysUntilExpiration(moduleKey);
        
        if (!license || !license.expiresAt) {
            return 'No expiration';
        }
        
        const expirationDate = new Date(license.expiresAt);
        const formattedDate = expirationDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        if (daysUntil === null) {
            return formattedDate;
        }
        
        if (daysUntil <= 0) {
            return `Expired on ${formattedDate}`;
        }
        
        if (daysUntil === 1) {
            return `Expires tomorrow (${formattedDate})`;
        }
        
        if (daysUntil <= 30) {
            return `Expires in ${daysUntil} days (${formattedDate})`;
        }
        
        return `Expires ${formattedDate}`;
    };

    /**
     * Format usage percentage
     */
    const formatUsagePercentage = (percentage) => {
        if (percentage === null || percentage === undefined) {
            return 'N/A';
        }
        return `${percentage}%`;
    };

    /**
     * Get usage color based on percentage
     */
    const getUsageColor = (percentage) => {
        if (percentage === null || percentage === undefined) {
            return theme.palette.grey[400];
        }
        
        if (percentage >= 95) {
            return theme.palette.error.main;
        }
        
        if (percentage >= 80) {
            return theme.palette.warning.main;
        }
        
        return theme.palette.success.main;
    };

    /**
     * Format limit value for display
     */
    const formatLimitValue = (value) => {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        
        if (value === 'unlimited') {
            return 'Unlimited';
        }
        
        // Format storage in GB if it's a large number
        if (value > 1000000000) {
            return `${(value / 1073741824).toFixed(2)} GB`;
        }
        
        return value.toLocaleString();
    };

    /**
     * Render module status card
     */
    const renderModuleCard = (moduleKey) => {
        const license = licenses[moduleKey];
        const moduleUsage = getModuleUsage(moduleKey);
        const moduleConfig = commercialModuleConfigs[moduleKey];
        const statusColor = getStatusColor(moduleKey);
        const daysUntil = getDaysUntilExpiration(moduleKey);
        
        if (!license || !moduleConfig) {
            return null;
        }

        return (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={moduleKey}>
                <Card
                    sx={{
                        height: '100%',
                        border: statusColor === 'error' ? `2px solid ${theme.palette.error.main}` :
                                statusColor === 'warning' ? `2px solid ${theme.palette.warning.main}` :
                                `1px solid ${theme.palette.divider}`,
                        boxShadow: statusColor === 'error' || statusColor === 'warning' ? 3 : 1,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: 4,
                            transform: 'translateY(-2px)'
                        }
                    }}
                >
                    <CardContent>
                        {/* Module Header */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="h6" gutterBottom>
                                    {moduleConfig.displayName}
                                </Typography>
                                <Chip
                                    label={license.tier?.toUpperCase() || 'UNKNOWN'}
                                    size="small"
                                    color="primary"
                                    sx={{ mr: 1 }}
                                />
                                <Chip
                                    label={license.status?.toUpperCase() || 'UNKNOWN'}
                                    size="small"
                                    color={statusColor}
                                />
                            </Box>
                            <Box>
                                {getStatusIcon(moduleKey)}
                            </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* Expiration Information */}
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                License Expiration
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    fontWeight: statusColor === 'error' || statusColor === 'warning' ? 600 : 400,
                                    color: statusColor === 'error' ? theme.palette.error.main :
                                           statusColor === 'warning' ? theme.palette.warning.main :
                                           theme.palette.text.primary
                                }}
                            >
                                {formatExpirationDisplay(moduleKey)}
                            </Typography>
                            
                            {/* Countdown for expiring licenses */}
                            {daysUntil !== null && daysUntil > 0 && daysUntil <= 30 && (
                                <Alert
                                    severity={daysUntil <= 7 ? 'error' : 'warning'}
                                    sx={{ mt: 1 }}
                                    icon={daysUntil <= 7 ? <ErrorIcon /> : <WarningIcon />}
                                >
                                    <AlertTitle>
                                        {daysUntil <= 7 ? 'Critical: Expires Soon' : 'Warning: Expiring Soon'}
                                    </AlertTitle>
                                    {daysUntil <= 7
                                        ? `This license expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}. Renew immediately to avoid service disruption.`
                                        : `This license expires in ${daysUntil} days. Consider renewing soon.`
                                    }
                                </Alert>
                            )}
                        </Box>

                        {/* Usage Metrics */}
                        {moduleUsage && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Usage Metrics
                                </Typography>
                                
                                {/* Employees */}
                                {moduleUsage.employees && moduleUsage.employees.limit !== null && (
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption">Employees</Typography>
                                            <Typography variant="caption">
                                                {moduleUsage.employees.current} / {formatLimitValue(moduleUsage.employees.limit)}
                                                {' '}({formatUsagePercentage(moduleUsage.employees.percentage)})
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min(moduleUsage.employees.percentage || 0, 100)}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                backgroundColor: alpha(theme.palette.grey[400], 0.2),
                                                '& .MuiLinearProgress-bar': {
                                                    backgroundColor: getUsageColor(moduleUsage.employees.percentage),
                                                    borderRadius: 4
                                                }
                                            }}
                                        />
                                    </Box>
                                )}

                                {/* Storage */}
                                {moduleUsage.storage && moduleUsage.storage.limit !== null && (
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption">Storage</Typography>
                                            <Typography variant="caption">
                                                {formatLimitValue(moduleUsage.storage.current)} / {formatLimitValue(moduleUsage.storage.limit)}
                                                {' '}({formatUsagePercentage(moduleUsage.storage.percentage)})
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min(moduleUsage.storage.percentage || 0, 100)}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                backgroundColor: alpha(theme.palette.grey[400], 0.2),
                                                '& .MuiLinearProgress-bar': {
                                                    backgroundColor: getUsageColor(moduleUsage.storage.percentage),
                                                    borderRadius: 4
                                                }
                                            }}
                                        />
                                    </Box>
                                )}

                                {/* API Calls */}
                                {moduleUsage.apiCalls && moduleUsage.apiCalls.limit !== null && (
                                    <Box sx={{ mb: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption">API Calls</Typography>
                                            <Typography variant="caption">
                                                {formatLimitValue(moduleUsage.apiCalls.current)} / {formatLimitValue(moduleUsage.apiCalls.limit)}
                                                {' '}({formatUsagePercentage(moduleUsage.apiCalls.percentage)})
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min(moduleUsage.apiCalls.percentage || 0, 100)}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                backgroundColor: alpha(theme.palette.grey[400], 0.2),
                                                '& .MuiLinearProgress-bar': {
                                                    backgroundColor: getUsageColor(moduleUsage.apiCalls.percentage),
                                                    borderRadius: 4
                                                }
                                            }}
                                        />
                                    </Box>
                                )}
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Grid>
        );
    };

    // Get enabled modules
    const enabledModules = getEnabledModules();

    // Check if any modules are in warning or critical state
    const hasWarnings = enabledModules.some(key => {
        const statusColor = getStatusColor(key);
        return statusColor === 'warning';
    });

    const hasCritical = enabledModules.some(key => {
        const statusColor = getStatusColor(key);
        return statusColor === 'error';
    });

    if (loading) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <Typography>Loading license information...</Typography>
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Alert severity="error">
                    <AlertTitle>Error Loading License Information</AlertTitle>
                    {error}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Page Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" component="h1">
                        License Status
                    </Typography>
                    <Stack direction="row" spacing={2}>
                        <Tooltip title="Refresh license data">
                            <IconButton
                                onClick={handleRefresh}
                                disabled={refreshing}
                                color="primary"
                            >
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                        <Button
                            variant="outlined"
                            startIcon={<ContactSupportIcon />}
                            onClick={() => window.open('mailto:support@example.com', '_blank')}
                        >
                            Contact Support
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<ShoppingCartIcon />}
                            onClick={() => navigate(getCompanyRoute('/pricing'))}
                            color="primary"
                        >
                            Renew License
                        </Button>
                    </Stack>
                </Box>

                <Typography variant="body1" color="text.secondary">
                    View the status of all your licensed modules, including expiration dates and usage metrics.
                </Typography>
            </Box>

            {/* Global Alerts */}
            {hasCritical && (
                <Alert severity="error" sx={{ mb: 3 }} icon={<ErrorIcon />}>
                    <AlertTitle>Critical: Licenses Expiring Soon</AlertTitle>
                    One or more licenses will expire within 7 days. Please renew immediately to avoid service disruption.
                </Alert>
            )}

            {hasWarnings && !hasCritical && (
                <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
                    <AlertTitle>Warning: Licenses Expiring Soon</AlertTitle>
                    One or more licenses will expire within 30 days. Consider renewing soon to ensure uninterrupted service.
                </Alert>
            )}

            {/* Module Status Grid */}
            {enabledModules.length === 0 ? (
                <Alert severity="info" icon={<InfoIcon />}>
                    <AlertTitle>No Licensed Modules</AlertTitle>
                    You don't have any licensed modules yet. Visit the pricing page to explore available modules.
                </Alert>
            ) : (
                <Grid container spacing={3}>
                    {enabledModules.map(moduleKey => renderModuleCard(moduleKey))}
                </Grid>
            )}

            {/* Help Section */}
            <Box sx={{ mt: 4, p: 3, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Need Help?
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                    If you have questions about your license or need assistance with renewals, our support team is here to help.
                </Typography>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        startIcon={<ContactSupportIcon />}
                        onClick={() => window.open('mailto:support@example.com', '_blank')}
                    >
                        Email Support
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => navigate(getCompanyRoute('/pricing'))}
                    >
                        View Pricing
                    </Button>
                </Stack>
            </Box>
        </Container>
    );
};

export default LicenseStatusPage;
