/**
 * Claim Review Modal Component
 * 
 * Modal for reviewing and approving/rejecting insurance claims.
 * Follows existing modal patterns from the application.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    RadioGroup,
    FormControlLabel,
    Radio,
    Typography,
    Box,
    Grid,
    Chip,
    Divider,
    Alert,
    Stack
} from '@mui/material';
import {
    CheckCircle as ApproveIcon,
    Cancel as RejectIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/formatters';

const ClaimReviewModal = ({
    open,
    onClose,
    claim,
    onSubmit,
    loading = false
}) => {
    const [reviewData, setReviewData] = useState({
        decision: '',
        reviewNotes: '',
        approvedAmount: claim?.claimAmount || 0
    });

    const [errors, setErrors] = useState({});

    const handleFieldChange = (field, value) => {
        setReviewData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when field is updated
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!reviewData.decision) {
            newErrors.decision = 'Please select a decision';
        }

        if (!reviewData.reviewNotes || reviewData.reviewNotes.trim().length < 10) {
            newErrors.reviewNotes = 'Review notes must be at least 10 characters';
        }

        if (reviewData.decision === 'approved') {
            if (!reviewData.approvedAmount || reviewData.approvedAmount <= 0) {
                newErrors.approvedAmount = 'Approved amount must be greater than 0';
            }
            if (reviewData.approvedAmount > claim?.claimAmount) {
                newErrors.approvedAmount = 'Approved amount cannot exceed claim amount';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            await onSubmit(reviewData);
            handleClose();
        } catch (error) {
            // Error handling is done in parent component
        }
    };

    const handleClose = () => {
        setReviewData({
            decision: '',
            reviewNotes: '',
            approvedAmount: claim?.claimAmount || 0
        });
        setErrors({});
        onClose();
    };

    const getStatusChip = (status) => {
        const statusConfig = {
            pending: { color: 'warning', label: 'Pending' },
            under_review: { color: 'info', label: 'Under Review' },
            approved: { color: 'success', label: 'Approved' },
            rejected: { color: 'error', label: 'Rejected' },
            paid: { color: 'success', label: 'Paid' }
        };

        const config = statusConfig[status] || { color: 'default', label: status };
        return <Chip size="small" color={config.color} label={config.label} />;
    };

    if (!claim) return null;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { minHeight: '600px' }
            }}
        >
            <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        Review Claim {claim.claimNumber}
                    </Typography>
                    <Button
                        onClick={handleClose}
                        size="small"
                        sx={{ minWidth: 'auto', p: 1 }}
                    >
                        <CloseIcon />
                    </Button>
                </Stack>
            </DialogTitle>

            <DialogContent dividers>
                {/* Claim Information */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
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
                                Policy Number
                            </Typography>
                            <Typography variant="body1">
                                {claim.policy?.policyNumber || 'N/A'}
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
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Review Section */}
                <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Review Decision
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                Decision *
                            </Typography>
                            <RadioGroup
                                value={reviewData.decision}
                                onChange={(e) => handleFieldChange('decision', e.target.value)}
                                row
                            >
                                <FormControlLabel
                                    value="approved"
                                    control={<Radio />}
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <ApproveIcon sx={{ mr: 1, color: 'success.main' }} />
                                            Approve
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    value="rejected"
                                    control={<Radio />}
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <RejectIcon sx={{ mr: 1, color: 'error.main' }} />
                                            Reject
                                        </Box>
                                    }
                                />
                            </RadioGroup>
                            {errors.decision && (
                                <Typography variant="caption" color="error">
                                    {errors.decision}
                                </Typography>
                            )}
                        </Grid>

                        {reviewData.decision === 'approved' && (
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Approved Amount *"
                                    type="number"
                                    value={reviewData.approvedAmount}
                                    onChange={(e) => handleFieldChange('approvedAmount', Number(e.target.value))}
                                    fullWidth
                                    error={!!errors.approvedAmount}
                                    helperText={errors.approvedAmount || `Maximum: ${formatCurrency(claim.claimAmount)}`}
                                    InputProps={{
                                        startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                                    }}
                                />
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <TextField
                                label="Review Notes *"
                                multiline
                                rows={4}
                                value={reviewData.reviewNotes}
                                onChange={(e) => handleFieldChange('reviewNotes', e.target.value)}
                                fullWidth
                                error={!!errors.reviewNotes}
                                helperText={errors.reviewNotes || 'Detailed notes about your decision (minimum 10 characters)'}
                                placeholder="Provide detailed reasoning for your decision..."
                            />
                        </Grid>
                    </Grid>
                </Box>

                {reviewData.decision === 'approved' && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        This claim will be approved for {formatCurrency(reviewData.approvedAmount)} and moved to payment processing.
                    </Alert>
                )}

                {reviewData.decision === 'rejected' && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        This claim will be rejected and the employee will be notified.
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={handleClose}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || !reviewData.decision}
                    color={reviewData.decision === 'approved' ? 'success' : 'error'}
                    startIcon={
                        reviewData.decision === 'approved' ? <ApproveIcon /> : <RejectIcon />
                    }
                >
                    {loading ? 'Processing...' : `${reviewData.decision === 'approved' ? 'Approve' : 'Reject'} Claim`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

ClaimReviewModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    claim: PropTypes.object,
    onSubmit: PropTypes.func.isRequired,
    loading: PropTypes.bool
};

export default ClaimReviewModal;