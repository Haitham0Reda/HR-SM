import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    Button,
    Breadcrumbs,
    Link,
    Divider,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    CheckCircle as ApproveIcon,
    Cancel as RejectIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import vacationService from '../../services/vacation.service';
import missionService from '../../services/mission.service';
import sickLeaveService from '../../services/sickLeave.service';
import permissionService from '../../services/permission.service';

const RequestDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { user, isHR, isAdmin } = useAuth();
    const [request, setRequest] = useState(null);
    const [requestType, setRequestType] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchRequestDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchRequestDetails = async () => {
        try {
            setLoading(true);

            // Try to fetch from each service until we find the request
            let data = null;
            let type = null;

            // Try vacation service
            try {
                data = await vacationService.getById(id);
                if (data) {
                    type = 'vacation';
                    data.displayType = 'Vacation';
                    data.date = data.startDate;
                }
            } catch (err) {
                // Not a vacation, continue
            }

            // Try mission service
            if (!data) {
                try {
                    data = await missionService.getById(id);
                    if (data) {
                        type = 'mission';
                        data.displayType = 'Mission';
                        data.date = data.startDate;
                    }
                } catch (err) {
                    // Not a mission, continue
                }
            }

            // Try sick leave service
            if (!data) {
                try {
                    data = await sickLeaveService.getById(id);
                    if (data) {
                        type = 'sick-leave';
                        data.displayType = 'Sick Leave';
                        data.date = data.startDate;
                    }
                } catch (err) {
                    // Not a sick leave, continue
                }
            }

            // Try permission service
            if (!data) {
                try {
                    data = await permissionService.getById(id);
                    if (data) {
                        type = 'permission';
                        data.displayType = (data.permissionType || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        data.date = data.date;
                    }
                } catch (err) {
                    // Not a permission, continue
                }
            }

            if (data) {
                setRequest(data);
                setRequestType(type);
            } else {
                showNotification('Request not found', 'error');
                navigate(getCompanyRoute('/requests'));
            }
        } catch (error) {
            showNotification('Failed to fetch request details', 'error');
            navigate(getCompanyRoute('/requests'));
        } finally {
            setLoading(false);
        }
    };

    const getService = () => {
        switch (requestType) {
            case 'vacation':
                return vacationService;
            case 'mission':
                return missionService;
            case 'sick-leave':
                return sickLeaveService;
            case 'permission':
                return permissionService;
            default:
                return null;
        }
    };

    const handleApprove = async () => {
        try {
            setActionLoading(true);
            const service = getService();
            if (!service || !service.approve) {
                showNotification('Approve action not available for this request type', 'error');
                return;
            }
            await service.approve(id);
            showNotification('Request approved successfully', 'success');
            await fetchRequestDetails();
        } catch (error) {
            showNotification(error.response?.data?.error || 'Failed to approve request', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            showNotification('Rejection reason is required', 'error');
            return;
        }
        if (rejectionReason.trim().length < 10) {
            showNotification('Rejection reason must be at least 10 characters', 'error');
            return;
        }

        try {
            setActionLoading(true);
            const service = getService();
            if (!service || !service.reject) {
                showNotification('Reject action not available for this request type', 'error');
                return;
            }
            await service.reject(id, rejectionReason.trim());
            showNotification('Request rejected successfully', 'success');
            setRejectDialogOpen(false);
            setRejectionReason('');
            await fetchRequestDetails();
        } catch (error) {
            showNotification(error.response?.data?.error || 'Failed to reject request', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        const reason = prompt('Please provide a reason for cancellation:');
        if (reason === null) return;

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            showNotification('Cancellation reason is required', 'error');
            return;
        }

        try {
            setActionLoading(true);
            const service = getService();
            if (!service || !service.cancel) {
                showNotification('Cancel action not available for this request type', 'error');
                return;
            }
            await service.cancel(id, trimmedReason);
            showNotification('Request cancelled successfully', 'success');
            await fetchRequestDetails();
        } catch (error) {
            showNotification(error.response?.data?.error || 'Failed to cancel request', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
            return;
        }

        try {
            setActionLoading(true);
            const service = getService();
            if (!service || !service.delete) {
                showNotification('Delete action not available for this request type', 'error');
                return;
            }
            await service.delete(id);
            showNotification('Request deleted successfully', 'success');
            navigate(getCompanyRoute('/requests'));
        } catch (error) {
            showNotification(error.response?.data?.error || 'Failed to delete request', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'warning',
            approved: 'success',
            rejected: 'error',
            cancelled: 'default'
        };
        return colors[status] || 'default';
    };

    if (loading) return <Loading />;
    if (!request) return <Typography>Request not found</Typography>;

    const requestTypeName = request.displayType || 'Request';
    const requestSubType = request.vacationType ? ` (${request.vacationType})` : '';

    return (
        <Box sx={{ p: 3 }}>
            {/* Header with Breadcrumbs */}
            <Box sx={{ mb: 3 }}>
                <Breadcrumbs sx={{ mb: 2 }}>
                    <Link
                        component="button"
                        variant="body1"
                        onClick={() => navigate('/')}
                        sx={{ textDecoration: 'none', color: 'primary.main', cursor: 'pointer' }}
                    >
                        Home
                    </Link>
                    <Link
                        component="button"
                        variant="body1"
                        onClick={() => navigate('/app')}
                        sx={{ textDecoration: 'none', color: 'primary.main', cursor: 'pointer' }}
                    >
                        My Requests
                    </Link>
                    <Typography color="text.primary">View Request</Typography>
                </Breadcrumbs>
                <Typography variant="h4">Request Details</Typography>
            </Box>

            {/* Request Header */}
            <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h5">
                            {requestTypeName}{requestSubType} Request #{(request._id || '').slice(-4)}
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate(getCompanyRoute('/requests'))}
                        >
                            Back to List
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Grid container spacing={3}>
                {/* Request Information */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Request Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="body1" fontWeight="bold">Request ID</Typography>
                                    <Typography variant="body1">#{(request._id || '').slice(-4)}</Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="body1" fontWeight="bold">Employee ID</Typography>
                                    <Typography variant="body1">{user?.employeeId || user?._id?.slice(-6) || 'N/A'}</Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="body1" fontWeight="bold">Employee Name</Typography>
                                    <Typography variant="body1">
                                        {request.employee?.personalInfo?.fullName || request.employee?.username || user?.personalInfo?.fullName || user?.username || 'N/A'}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="body1" fontWeight="bold">Date</Typography>
                                    <Typography variant="body1">
                                        {request.date ? new Date(request.date).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                        }) : 'N/A'}
                                    </Typography>
                                </Box>

                                {request.startDate && request.endDate && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                        <Typography variant="body1" fontWeight="bold">Period</Typography>
                                        <Typography variant="body1">
                                            {new Date(request.startDate).toLocaleDateString('en-GB')} - {new Date(request.endDate).toLocaleDateString('en-GB')}
                                        </Typography>
                                    </Box>
                                )}

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="body1" fontWeight="bold">Request Type</Typography>
                                    <Typography variant="body1">{requestTypeName}{requestSubType}</Typography>
                                </Box>

                                {request.duration !== undefined && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                        <Typography variant="body1" fontWeight="bold">Duration</Typography>
                                        <Typography variant="body1">{request.duration || 0} day(s)</Typography>
                                    </Box>
                                )}

                                {requestType === 'permission' && request.time && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                        <Typography variant="body1" fontWeight="bold">Time</Typography>
                                        <Typography variant="body1">
                                            {request.time.scheduled || 'N/A'} → {request.time.requested || 'N/A'}
                                        </Typography>
                                    </Box>
                                )}

                                {requestType === 'mission' && request.mission?.location && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                        <Typography variant="body1" fontWeight="bold">Location</Typography>
                                        <Typography variant="body1">{request.mission.location}</Typography>
                                    </Box>
                                )}

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="body1" fontWeight="bold">Status</Typography>
                                    <Chip
                                        label={request.status?.toUpperCase() || 'PENDING'}
                                        color={getStatusColor(request.status)}
                                        size="small"
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="body1" fontWeight="bold">Submitted On</Typography>
                                    <Typography variant="body1">
                                        {new Date(request.createdAt).toLocaleString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                        })}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Request Details */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Request Details
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Box>
                                <Typography variant="body1" fontWeight="bold" gutterBottom>
                                    {requestType === 'mission' ? 'Purpose:' : 'Reason:'}
                                </Typography>
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: 'action.hover',
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        minHeight: '100px'
                                    }}
                                >
                                    <Typography variant="body1">
                                        {request.reason || request.purpose || request.notes || request.mission?.purpose || 'No reason provided'}
                                    </Typography>
                                </Box>

                                {requestType === 'sick-leave' && request.medicalDocumentation?.provided && (
                                    <Box sx={{ mt: 3 }}>
                                        <Typography variant="body1" fontWeight="bold" gutterBottom>
                                            Medical Document:
                                        </Typography>
                                        <Chip
                                            label="✓ Document Attached"
                                            color="success"
                                            sx={{ mt: 1 }}
                                        />
                                    </Box>
                                )}

                                {request.attachments && request.attachments.length > 0 && (
                                    <Box sx={{ mt: 3 }}>
                                        <Typography variant="body1" fontWeight="bold" gutterBottom>
                                            Attachments:
                                        </Typography>
                                        {request.attachments.map((attachment, index) => (
                                            <Chip
                                                key={index}
                                                label={attachment.filename || `Attachment ${index + 1}`}
                                                color="info"
                                                sx={{ mt: 1, mr: 1 }}
                                            />
                                        ))}
                                    </Box>
                                )}

                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="body1" fontWeight="bold" gutterBottom>
                                        Workflow Status:
                                    </Typography>
                                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                        {request.status === 'approved' ? (
                                            <>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong>Status:</strong> APPROVED ✓
                                                </Typography>
                                                {request.approvedBy && (
                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                        <strong>Approved By:</strong> {request.approvedBy.name || 'Manager'}
                                                    </Typography>
                                                )}
                                                {request.approvedAt && (
                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                        <strong>Approved On:</strong> {new Date(request.approvedAt).toLocaleString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            hour12: true
                                                        })}
                                                    </Typography>
                                                )}
                                                {request.approverNotes && (
                                                    <Typography variant="body2">
                                                        <strong>Notes:</strong> {request.approverNotes}
                                                    </Typography>
                                                )}
                                            </>
                                        ) : request.status === 'rejected' ? (
                                            <>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong>Status:</strong> REJECTED ✗
                                                </Typography>
                                                {request.rejectedBy && (
                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                        <strong>Rejected By:</strong> {request.rejectedBy.name || 'Manager'}
                                                    </Typography>
                                                )}
                                                {request.rejectedAt && (
                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                        <strong>Rejected On:</strong> {new Date(request.rejectedAt).toLocaleString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            hour12: true
                                                        })}
                                                    </Typography>
                                                )}
                                                {request.rejectionReason && (
                                                    <Typography variant="body2" sx={{ color: 'error.main' }}>
                                                        <strong>Reason:</strong> {request.rejectionReason}
                                                    </Typography>
                                                )}
                                            </>
                                        ) : request.status === 'cancelled' ? (
                                            <>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong>Status:</strong> CANCELLED
                                                </Typography>
                                                {request.cancelledAt && (
                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                        <strong>Cancelled On:</strong> {new Date(request.cancelledAt).toLocaleString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            hour12: true
                                                        })}
                                                    </Typography>
                                                )}
                                                {request.cancellationReason && (
                                                    <Typography variant="body2">
                                                        <strong>Reason:</strong> {request.cancellationReason}
                                                    </Typography>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong>Status:</strong> PENDING
                                                </Typography>
                                                <Typography variant="body2">
                                                    {request.workflow?.currentStep === 'supervisor-review'
                                                        ? 'Awaiting Supervisor Review'
                                                        : 'Pending Review'}
                                                </Typography>
                                                <Chip
                                                    label="Pending Approval"
                                                    color="warning"
                                                    size="small"
                                                    sx={{ mt: 1 }}
                                                />
                                            </>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Actions Card */}
                    <Card sx={{ bgcolor: 'background.paper', border: '2px solid', borderColor: 'primary.main', mt: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                                Actions
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                                {/* Approve/Reject actions for HR/Admin on pending requests */}
                                {(isHR || isAdmin) && request.status === 'pending' && (
                                    <>
                                        <Button
                                            variant="contained"
                                            color="success"
                                            startIcon={<ApproveIcon />}
                                            onClick={handleApprove}
                                            disabled={actionLoading}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            startIcon={<RejectIcon />}
                                            onClick={() => setRejectDialogOpen(true)}
                                            disabled={actionLoading}
                                        >
                                            Reject
                                        </Button>
                                    </>
                                )}

                                {/* Cancel action for own pending/approved requests */}
                                {(request.employee?._id === user?._id || String(request.employee?._id) === String(user?._id)) &&
                                    (request.status === 'pending' || request.status === 'approved') && (
                                        <Button
                                            variant="outlined"
                                            color="warning"
                                            startIcon={<RejectIcon />}
                                            onClick={handleCancel}
                                            disabled={actionLoading}
                                        >
                                            Cancel
                                        </Button>
                                    )}

                                {/* Delete action for own requests */}
                                {(request.employee?._id === user?._id || String(request.employee?._id) === String(user?._id)) && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<DeleteIcon />}
                                        onClick={handleDelete}
                                        disabled={actionLoading}
                                    >
                                        Delete
                                    </Button>
                                )}

                                {/* No actions available message */}
                                {request.status !== 'pending' &&
                                    !(request.status === 'approved' && (request.employee?._id === user?._id || String(request.employee?._id) === String(user?._id))) &&
                                    !(request.employee?._id === user?._id || String(request.employee?._id) === String(user?._id)) &&
                                    !(isHR || isAdmin) && (
                                        <Typography variant="body2" color="text.secondary" sx={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                                            No actions available for this request
                                        </Typography>
                                    )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reject Request</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Please provide a reason for rejecting this request (minimum 10 characters):
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Rejection Reason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter the reason for rejection..."
                        error={rejectionReason.trim().length > 0 && rejectionReason.trim().length < 10}
                        helperText={
                            rejectionReason.trim().length > 0 && rejectionReason.trim().length < 10
                                ? 'Reason must be at least 10 characters'
                                : `${rejectionReason.length} characters`
                        }
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setRejectDialogOpen(false);
                        setRejectionReason('');
                    }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReject}
                        variant="contained"
                        color="error"
                        disabled={actionLoading || rejectionReason.trim().length < 10}
                    >
                        Reject Request
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RequestDetailsPage;
