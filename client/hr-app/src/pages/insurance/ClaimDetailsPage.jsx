/**
 * Claim Details Page
 * 
 * Page for viewing detailed information about an insurance claim.
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
    CardContent,
    List,
    ListItem,
    ListItemText,
    ListItemIcon
} from '@mui/material';
import {
    RateReview as ReviewIcon,
    ArrowBack as ArrowBackIcon,
    Description as FileIcon,
    Download as DownloadIcon
} from '@mui/icons-material';
import ModuleGuard from '../../components/ModuleGuard';
import PageContainer from '../../components/PageContainer';
import ClaimReviewModal from '../../components/insurance/ClaimReviewModal';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import { useAuth } from '../../hooks/useAuth';
import { useClaims } from '../../hooks/useInsurance';
import insuranceService from '../../services/insurance.service';
import { formatCurrency, formatDate } from '../../utils/formatters';

const ClaimDetailsPage = () => {
    const { claimId } = useParams();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { isHR, isAdmin } = useAuth();
    const { reviewClaim } = useClaims();
    
    const [claim, setClaim] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);

    const canReview = isHR || isAdmin;

    useEffect(() => {
        const fetchClaim = async () => {
            try {
                setLoading(true);
                const response = await insuranceService.getClaimById(claimId);
                setClaim(response.data);
            } catch (err) {
                setError(err.message || 'Failed to load claim');
            } finally {
                setLoading(false);
            }
        };

        if (claimId) {
            fetchClaim();
        }
    }, [claimId]);

    const getStatusChip = (status) => {
        const statusConfig = {
            pending: { color: 'warning', label: 'Pending' },
            under_review: { color: 'info', label: 'Under Review' },
            approved: { color: 'success', label: 'Approved' },
            rejected: { color: 'error', label: 'Rejected' },
            paid: { color: 'success', label: 'Paid' }
        };

        const config = statusConfig[status] || { color: 'default', label: status };
        return <Chip color={config.color} label={config.label} />;
    };

    const handleReview = () => {
        setReviewModalOpen(true);
    };

    const handleReviewSubmit = async (reviewData) => {
        try {
            setReviewLoading(true);
            const updatedClaim = await reviewClaim(claimId, reviewData);
            setClaim(updatedClaim);
            setReviewModalOpen(false);
        } catch (error) {
            // Error handling is done in the hook
        } finally {
            setReviewLoading(false);
        }
    };

    const handleBack = () => {
        navigate(getCompanyRoute('/insurance/claims'));
    };

    if (loading) {
        return (
            <ModuleGuard moduleId="life-insurance">
                <PageContainer
                    title="Claim Details"
                    breadcrumbs={[
                        { title: 'Insurance', path: getCompanyRoute('/insurance') },
                        { title: 'Claims', path: getCompanyRoute('/insurance/claims') },
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
                    title="Claim Details"
                    breadcrumbs={[
                        { title: 'Insurance', path: getCompanyRoute('/insurance') },
                        { title: 'Claims', path: getCompanyRoute('/insurance/claims') },
                        { title: 'Details' }
                    ]}
                >
                    <Alert severity="error">{error}</Alert>
                </PageContainer>
            </ModuleGuard>
        );
    }

    if (!claim) {
        return (
            <ModuleGuard moduleId="life-insurance">
                <PageContainer
                    title="Claim Details"
                    breadcrumbs={[
                        { title: 'Insurance', path: getCompanyRoute('/insurance') },
                        { title: 'Claims', path: getCompanyRoute('/insurance/claims') },
                        { title: 'Details' }
                    ]}
                >
                    <Alert severity="error">Claim not found</Alert>
                </PageContainer>
            </ModuleGuard>
        );
    }

    return (
        <ModuleGuard moduleId="life-insurance">
            <PageContainer
                title={`Claim ${claim.claimNumber}`}
                breadcrumbs={[
                    { title: 'Insurance', path: getCompanyRoute('/insurance') },
                    { title: 'Claims', path: getCompanyRoute('/insurance/claims') },
                    { title: claim.claimNumber }
                ]}
                actions={
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            onClick={handleBack}
                        >
                            Back to Claims
                        </Button>
                        {canReview && ['pending', 'under_review'].includes(claim.status) && (
                            <Button
                                variant="contained"
                                startIcon={<ReviewIcon />}
                                onClick={handleReview}
                            >
                                Review Claim
                            </Button>
                        )}
                    </Stack>
                }
            >
                <Grid container spacing={3}>
                    {/* Claim Information */}
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 3 }}>
                                Claim Information
                            </Typography>
                            
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Claim Number
                                    </Typography>
                                    <Typography variant="body1" fontWeight="medium">
                                        {claim.claimNumber}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Status
                                    </Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        {getStatusChip(claim.status)}
                                    </Box>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Claim Type
                                    </Typography>
                                    <Typography variant="body1">
                                        {claim.claimType}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Claim Amount
                                    </Typography>
                                    <Typography variant="body1" fontWeight="medium">
                                        {formatCurrency(claim.claimAmount)}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Claim Date
                                    </Typography>
                                    <Typography variant="body1">
                                        {formatDate(claim.claimDate)}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Submitted Date
                                    </Typography>
                                    <Typography variant="body1">
                                        {formatDate(claim.createdAt)}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                        Description
                                    </Typography>
                                    <Typography variant="body1">
                                        {claim.description}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Policy Information */}
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 3 }}>
                                Policy Information
                            </Typography>
                            
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Policy Number
                                    </Typography>
                                    <Typography variant="body1">
                                        {claim.policy?.policyNumber || 'N/A'}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Policy Type
                                    </Typography>
                                    <Typography variant="body1">
                                        {claim.policy?.policyType || 'N/A'}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Coverage Amount
                                    </Typography>
                                    <Typography variant="body1">
                                        {claim.policy?.coverageAmount ? formatCurrency(claim.policy.coverageAmount) : 'N/A'}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Employee
                                    </Typography>
                                    <Typography variant="body1">
                                        {claim.employee?.name || 'N/A'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Supporting Documents */}
                        {claim.documents && claim.documents.length > 0 && (
                            <Paper sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ mb: 3 }}>
                                    Supporting Documents
                                </Typography>
                                
                                <List>
                                    {claim.documents.map((doc, index) => (
                                        <ListItem key={index} divider>
                                            <ListItemIcon>
                                                <FileIcon />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={doc.originalName || `Document ${index + 1}`}
                                                secondary={`Uploaded: ${formatDate(doc.uploadedAt)}`}
                                            />
                                            <Button
                                                size="small"
                                                startIcon={<DownloadIcon />}
                                                onClick={() => window.open(doc.url, '_blank')}
                                            >
                                                Download
                                            </Button>
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        )}
                    </Grid>

                    {/* Review History */}
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                    Review History
                                </Typography>
                                
                                {claim.reviewHistory && claim.reviewHistory.length > 0 ? (
                                    <Stack spacing={2}>
                                        {claim.reviewHistory.map((review, index) => (
                                            <Box key={index}>
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatDate(review.reviewedAt)}
                                                </Typography>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {review.decision === 'approved' ? 'Approved' : 'Rejected'}
                                                    {review.decision === 'approved' && review.approvedAmount && 
                                                        ` - ${formatCurrency(review.approvedAmount)}`
                                                    }
                                                </Typography>
                                                <Typography variant="body2">
                                                    By: {review.reviewedBy?.name || 'N/A'}
                                                </Typography>
                                                {review.reviewNotes && (
                                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                                        {review.reviewNotes}
                                                    </Typography>
                                                )}
                                                {index < claim.reviewHistory.length - 1 && <Divider sx={{ mt: 2 }} />}
                                            </Box>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        No review history available
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Review Modal */}
                <ClaimReviewModal
                    open={reviewModalOpen}
                    onClose={() => setReviewModalOpen(false)}
                    claim={claim}
                    onSubmit={handleReviewSubmit}
                    loading={reviewLoading}
                />
            </PageContainer>
        </ModuleGuard>
    );
};

export default ClaimDetailsPage;