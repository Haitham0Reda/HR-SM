import React, { useState, useMemo } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Button,
    Switch,
    FormControlLabel,
    Grid,
    Chip,
    Avatar,
    Stack,
    alpha,
    Divider
} from '@mui/material';
import {
    AttachMoney as MoneyIcon,
    Business as BusinessIcon,
    CloudQueue as CloudIcon,
    Storage as StorageIcon,
    TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useThemeConfig } from '../../context/ThemeContext';
import { useLicense } from '../../context/LicenseContext';
import ModuleCard from './components/ModuleCard';
import PricingTierComparison from './components/PricingTierComparison';

// Import module configurations
const commercialModuleConfigs = {
    'hr-core': {
        key: 'hr-core',
        displayName: 'HR Core',
        commercial: {
            description: 'Essential HR functionality including user management, authentication, roles, departments, and audit logging. Always included as the foundation of the system.',
            targetSegment: 'All customers - included in every deployment',
            valueProposition: 'Secure user management, role-based access control, and comprehensive audit trails for compliance',
            pricing: {
                starter: { monthly: 0, onPremise: 0 },
                business: { monthly: 0, onPremise: 0 },
                enterprise: { monthly: 0, onPremise: 0 }
            }
        },
        dependencies: { required: [], optional: [] }
    },
    'attendance': {
        key: 'attendance',
        displayName: 'Attendance & Time Tracking',
        commercial: {
            description: 'Track employee attendance, working hours, and time-off with automated reporting and biometric device integration',
            targetSegment: 'Businesses with hourly or shift-based employees, manufacturing, retail, healthcare',
            valueProposition: 'Reduce time theft by up to 5%, automate timesheet processing, ensure labor law compliance, integrate with biometric devices',
            pricing: {
                starter: { monthly: 5, onPremise: 500 },
                business: { monthly: 8, onPremise: 1500 },
                enterprise: { monthly: 'custom', onPremise: 'custom' }
            }
        },
        dependencies: { required: ['hr-core'], optional: ['reporting'] }
    },
    'leave': {
        key: 'leave',
        displayName: 'Leave Management',
        commercial: {
            description: 'Comprehensive leave request management with automated approval workflows, balance tracking, and policy enforcement',
            targetSegment: 'All businesses managing employee time-off, vacation, and sick leave',
            valueProposition: 'Eliminate manual leave tracking, ensure policy compliance, reduce administrative overhead by 70%, provide employee self-service',
            pricing: {
                starter: { monthly: 3, onPremise: 300 },
                business: { monthly: 5, onPremise: 800 },
                enterprise: { monthly: 'custom', onPremise: 'custom' }
            }
        },
        dependencies: { required: ['hr-core'], optional: ['attendance', 'reporting'] }
    },
    'payroll': {
        key: 'payroll',
        displayName: 'Payroll Management',
        commercial: {
            description: 'Automated payroll processing with tax calculations, deductions, benefits management, and compliance reporting',
            targetSegment: 'Businesses processing payroll in-house, SMBs to enterprises',
            valueProposition: 'Reduce payroll processing time by 80%, ensure tax compliance, automate salary calculations, integrate with attendance',
            pricing: {
                starter: { monthly: 10, onPremise: 2000 },
                business: { monthly: 15, onPremise: 5000 },
                enterprise: { monthly: 'custom', onPremise: 'custom' }
            }
        },
        dependencies: { required: ['hr-core', 'attendance'], optional: ['leave', 'reporting'] }
    },
    'documents': {
        key: 'documents',
        displayName: 'Document Management',
        commercial: {
            description: 'Secure document storage, version control, e-signatures, and automated document workflows for employee files',
            targetSegment: 'Businesses managing employee contracts, certifications, and compliance documents',
            valueProposition: 'Eliminate paper filing, ensure document security, automate expiration tracking, enable remote document signing',
            pricing: {
                starter: { monthly: 4, onPremise: 400 },
                business: { monthly: 7, onPremise: 1200 },
                enterprise: { monthly: 'custom', onPremise: 'custom' }
            }
        },
        dependencies: { required: ['hr-core'], optional: ['reporting'] }
    },
    'communication': {
        key: 'communication',
        displayName: 'Communication & Notifications',
        commercial: {
            description: 'Internal messaging, announcements, notifications, and employee communication hub with mobile push support',
            targetSegment: 'Organizations needing internal communication tools, remote teams, distributed workforce',
            valueProposition: 'Centralize employee communications, reduce email clutter, ensure message delivery, engage remote employees',
            pricing: {
                starter: { monthly: 2, onPremise: 200 },
                business: { monthly: 4, onPremise: 600 },
                enterprise: { monthly: 'custom', onPremise: 'custom' }
            }
        },
        dependencies: { required: ['hr-core'], optional: [] }
    },
    'reporting': {
        key: 'reporting',
        displayName: 'Reporting & Analytics',
        commercial: {
            description: 'Advanced analytics, custom reports, dashboards, and data visualization for HR metrics and insights',
            targetSegment: 'Data-driven organizations, HR analytics teams, management requiring insights',
            valueProposition: 'Make data-driven decisions, identify trends, automate compliance reporting, visualize workforce metrics',
            pricing: {
                starter: { monthly: 6, onPremise: 800 },
                business: { monthly: 12, onPremise: 2500 },
                enterprise: { monthly: 'custom', onPremise: 'custom' }
            }
        },
        dependencies: { required: ['hr-core'], optional: [] }
    },
    'tasks': {
        key: 'tasks',
        displayName: 'Task & Work Reporting',
        commercial: {
            description: 'Task assignment, work reporting, project tracking, and productivity monitoring for employee work management',
            targetSegment: 'Project-based organizations, consulting firms, teams requiring work tracking',
            valueProposition: 'Track project progress, monitor productivity, assign and manage tasks, generate work reports',
            pricing: {
                starter: { monthly: 4, onPremise: 500 },
                business: { monthly: 7, onPremise: 1500 },
                enterprise: { monthly: 'custom', onPremise: 'custom' }
            }
        },
        dependencies: { required: ['hr-core'], optional: ['reporting'] }
    }
};

const PricingPage = () => {
    const { colorMode } = useThemeConfig();
    const { isModuleEnabled } = useLicense();
    const [deploymentMode, setDeploymentMode] = useState('saas'); // 'saas' or 'onpremise'

    // Get all modules except HR Core (which is always included)
    const modules = useMemo(() => {
        return Object.values(commercialModuleConfigs).filter(
            module => module.key !== 'hr-core'
        );
    }, []);

    // Calculate bundle discount
    const calculateBundleDiscount = (moduleCount) => {
        if (moduleCount >= 5) return 0.15; // 15% for 5+ modules
        if (moduleCount >= 3) return 0.10; // 10% for 3+ modules
        return 0;
    };

    const handleContactSales = () => {
        window.location.href = 'mailto:sales@hrms.com?subject=Enterprise Pricing Inquiry';
    };

    const handleUpgradeNow = (moduleKey) => {
        // Navigate to upgrade flow or contact sales
        window.location.href = `mailto:sales@hrms.com?subject=Upgrade Request - ${moduleKey}`;
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            pb: 8
        }}>
            {/* Hero Section */}
            <Paper
                elevation={0}
                sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    color: 'white',
                    py: 8,
                    px: 3,
                    borderRadius: 0,
                    mb: 6
                }}
            >
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Avatar sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            width: 80,
                            height: 80,
                            mx: 'auto',
                            mb: 3,
                            backdropFilter: 'blur(10px)'
                        }}>
                            <MoneyIcon sx={{ fontSize: 40 }} />
                        </Avatar>
                        <Typography variant="h2" sx={{ fontWeight: 700, mb: 2 }}>
                            Flexible Pricing for Every Business
                        </Typography>
                        <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 700, mx: 'auto', mb: 4 }}>
                            Choose the modules you need and pay only for what you use. Scale as you grow.
                        </Typography>

                        {/* Deployment Mode Toggle */}
                        <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                            bgcolor: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 3,
                            p: 1.5,
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CloudIcon />
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                    SaaS (Cloud)
                                </Typography>
                            </Box>
                            <Switch
                                checked={deploymentMode === 'onpremise'}
                                onChange={(e) => setDeploymentMode(e.target.checked ? 'onpremise' : 'saas')}
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                        color: 'white',
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                        backgroundColor: 'rgba(255,255,255,0.5)',
                                    }
                                }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <StorageIcon />
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                    On-Premise
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Key Benefits */}
                    <Grid container spacing={3} sx={{ mt: 2 }}>
                        <Grid item xs={12} md={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                    ✓ Modular Architecture
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Pick only the modules you need
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                    ✓ Bundle Discounts
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Save up to 15% with multiple modules
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                    ✓ Flexible Deployment
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Cloud or on-premise options
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Paper>

            <Container maxWidth="lg">
                {/* Pricing Tier Comparison */}
                <Box sx={{ mb: 8 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
                        Compare Pricing Tiers
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
                        Choose the tier that fits your organization size and needs
                    </Typography>
                    <PricingTierComparison
                        modules={modules}
                        deploymentMode={deploymentMode}
                    />
                </Box>

                {/* Module Cards */}
                <Box sx={{ mb: 6 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
                        Available Modules
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
                        Build your perfect HR solution with our modular approach
                    </Typography>

                    <Grid container spacing={3}>
                        {modules.map((module) => (
                            <Grid item xs={12} md={6} lg={4} key={module.key}>
                                <ModuleCard
                                    module={module}
                                    deploymentMode={deploymentMode}
                                    isEnabled={isModuleEnabled(module.key)}
                                    onUpgrade={() => handleUpgradeNow(module.key)}
                                    allModules={commercialModuleConfigs}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Bundle Discount Info */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 4,
                        borderRadius: 3,
                        border: '2px solid',
                        borderColor: 'success.main',
                        bgcolor: alpha('#2e7d32', 0.05),
                        mb: 6
                    }}
                >
                    <Box sx={{ textAlign: 'center' }}>
                        <TrendingUpIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                            Save More with Bundle Discounts
                        </Typography>
                        <Grid container spacing={3} sx={{ mt: 2 }}>
                            <Grid item xs={12} md={4}>
                                <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
                                    10% OFF
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Purchase 3+ modules
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
                                    15% OFF
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Purchase 5+ modules
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
                                    Custom Pricing
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Enterprise solutions
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>

                {/* CTA Section */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 5,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        color: 'white',
                        textAlign: 'center'
                    }}
                >
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                        Ready to Get Started?
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 4, opacity: 0.9 }}>
                        Contact our sales team for a personalized quote and demo
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleContactSales}
                            sx={{
                                bgcolor: 'white',
                                color: 'primary.main',
                                px: 4,
                                py: 1.5,
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.9)'
                                }
                            }}
                        >
                            Contact Sales
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            sx={{
                                borderColor: 'white',
                                color: 'white',
                                px: 4,
                                py: 1.5,
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                '&:hover': {
                                    borderColor: 'white',
                                    bgcolor: 'rgba(255,255,255,0.1)'
                                }
                            }}
                        >
                            Schedule Demo
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
};

export default PricingPage;
