/**
 * Policy Details Page
 * 
 * Page for viewing detailed information about an insurance policy.
 * Uses ModuleGuard to check if life-insurance module is enabled.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Button,
    Chip,
    Alert,
    CircularProgress,
    Stack,
    Divider,
    Card,
    CardContent
} from '@mui/material';
import {
    Edit as EditIcon,
    Group as FamilyIcon,
    Assignment as ClaimIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import ModuleGuard from '../../components/ModuleGuard';
import PageContainer from '../../components/PageContainer';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import insuranceService from '../../services/insurance.service';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PolicyDetailsPage = () => {
    const { policyId } = useParams();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    
    const [policy, setPolicy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                setLoading(true);
                const response = await insuranceService.getPolicyById(policyId);
                setPolicy(response.data);
            } catch (err) {
                setError(err.message || 'Failed to load policy');
            } finally {
                setLoading(false);
            }
        };

        if (policyId) {
            fetchPolicy();
        }
    }, [policyId]);

    const getStatusChip = (status) => {
        const statusConfig = {
            active: { color: 'success', label: 'Active' },
            expired: { color: 'error', label: 'Expired' },
            cancelled: { color: 'default', label: 'Cancelled' },
            suspended: { color: 'warning', label: 'Suspended' }
        };

        const config = statusConfig[status] || { color: 'default', label: status };
        return <Chip color={config.color} label={config.label} />;
    };

    const handleEdit = () => {
        navigate(getCompanyRoute(`/insurance/policies/${policyId}/edit`));
    };

    const handleFamilyMembers = () => {
        navigate(getCompanyRoute(`/insurance/policies/${policyId}/family`));
    };

    const handleClaims = () => {
        navigate(getCompanyRoute(`/insurance/policies/${policyId}/claims`));
    };

    const handleBack = () => {
        navigate(getCompanyRoute('/insurance/policies'));
    };

    if (loading) {
        return (
            <ModuleGuard moduleId="life-insurance">
                <PageContainer
                    title="Policy Details"
                    breadcrumbs={[
                        { title: 'Insurance', path: getCompanyRoute('/insurance') },
                        { title: 'Policies', path: getCompanyRoute('/insurance/policies') },
                        { title: 'Details' }
                    ]}
                >
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                        <CircularProgress />
                    </Box>
                </PageContainer>
            </ModuleGuard>
        );
    }

    if (error) {
        return (
            <ModuleGuard moduleId="life-insurance">
                <PageContainer
                    title="Policy Details"
                    breadcrumbs={[
                        { title: 'Insurance', path: getCompanyRoute('/insurance') },
                        { title: 'Policies', path: getCompanyRoute('/insurance/policies') },
                        { title: 'Details' }
                    ]}
                >
                    <Alert severity="error">{error}</Alert>
                </PageContainer>
            </ModuleGuard>
        );
    }

    if (!policy) {
        return (
            <ModuleGuard moduleId="life-insurance">
                <PageContainer
                    title="Policy Details"
                    breadcrumbs={[
                        { title: 'Insurance', path: getCompanyRoute('/insurance') },
                        { title: 'Policies', path: getCompanyRoute('/insurance/policies') },
                        { title: 'Details' }
                    ]}
                >
                    <Alert severity="error">Policy not found</Alert>
                </PageContainer>
            </ModuleGuard>
        );
    }

    return (
        <ModuleGuard moduleId="life-insurance">
            <PageContainer
                title={`Policy ${policy.policyNumber}`}
                breadcrumbs={[
                    { title: 'Insurance', path: getCompanyRoute('/insurance') },
                    { title: 'Policies', path: getCompanyRoute('/insurance/policies') },
                    { title: policy.policyNumber }
                ]}
                actions={
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            onClick={handleBack}
                        >
                            Back to Policies
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<FamilyIcon />}
                            onClick={handleFamilyMembers}
                        >
                            Family Members ({policy.familyMembers?.length || 0})
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<ClaimIcon />}
                            onClick={handleClaims}
                        >
                            Claims
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={handleEdit}
                        >
                            Edit Policy
                        </Button>
                    </Stack>
                }
            >
                <Grid container spacing={3}>
                    {/* Policy Information */}
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 3 }}>
                                Policy Information
                            </Typography>
                            
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Policy Number
                                    </Typography>
                                    <Typography variant="body1" fontWeight="medium">
                                        {policy.policyNumber}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Status
                                    </Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        {getStatusChip(policy.status)}
                                    </Box>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Policy Type
                                    </Typography>
                                    <Typography variant="body1">
                                        {policy.policyType}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Coverage Amount
                                    </Typography>
                                    <Typography variant="body1" fontWeight="medium">
                                        {formatCurrency(policy.coverageAmount)}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Monthly Premium
                                    </Typography>
                                    <Typography variant="body1">
                                        {formatCurrency(policy.premium)}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Deductible
                                    </Typography>
                                    <Typography variant="body1">
                                        {formatCurrency(policy.deductible || 0)}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Start Date
                                    </Typography>
                                    <Typography variant="body1">
                                        {formatDate(policy.startDate)}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        End Date
                                    </Typography>
                                    <Typography variant="body1">
                                        {formatDate(policy.endDate)}
                                    </Typography>
                                </Grid>
                                
                                {policy.notes && (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.secondary">
                                            Notes
                                        </Typography>
                                        <Typography variant="body1">
                                            {policy.notes}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Paper>

                        {/* Employee Information */}
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 3 }}>
                                Employee Information
                            </Typography>
                            
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Name
                                    </Typography>
                                    <Typography variant="body1">
                                        {policy.employee?.name || 'N/A'}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Employee Number
                                    </Typography>
                                    <Typography variant="body1">
                                        {policy.employee?.employeeNumber || 'N/A'}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Department
                                    </Typography>
                                    <Typography variant="body1">
                                        {policy.employee?.department?.name || 'N/A'}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Position
                                    </Typography>
                                    <Typography variant="body1">
                                        {policy.employee?.position?.title || 'N/A'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Summary Cards */}
                    <Grid item xs={12} md={4}>
                        <Stack spacing={2}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" color="primary">
                                        Family Members
                                    </Typography>
                                    <Typography variant="h4">
                                        {policy.familyMembers?.length || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Covered family members
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent>
                                    <Typography variant="h6" color="primary">
                                        Beneficiaries
                                    </Typography>
                                    <Typography variant="h4">
                                        {policy.beneficiaries?.length || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Named beneficiaries
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent>
                                    <Typography variant="h6" color="primary">
                                        Active Claims
                                    </Typography>
                                    <Typography variant="h4">
                                        {policy.activeClaims || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Claims in progress
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Stack>
                    </Grid>
                </Grid>
            </PageContainer>
        </ModuleGuard>
    );
};

export default PolicyDetailsPage;