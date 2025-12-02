import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    Divider
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
// Legacy leave service removed - this page needs refactoring to handle different request types
// import leaveService from '../../services/leave.service';

const RequestDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [request] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchRequestDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchRequestDetails = async () => {
        try {
            setLoading(true);
            // TODO: Refactor to determine request type and fetch from appropriate service
            // const data = await appropriateService.getById(id);
            // setRequest(data);
            showNotification('This page needs refactoring after legacy leave removal', 'warning');
        } catch (error) {

            showNotification('Failed to fetch request details', 'error');
        } finally {
            setLoading(false);
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

    const leaveType = request.leaveType || request.type || '';
    const leaveTypeName = leaveType.charAt(0).toUpperCase() + leaveType.slice(1) + ' Leave';

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
                            {leaveTypeName} Request #{(request._id || '').slice(-4)}
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate('/app/requests')}
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
                                        {user?.personalInfo?.fullName || user?.username || 'N/A'}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="body1" fontWeight="bold">Date</Typography>
                                    <Typography variant="body1">
                                        {new Date(request.startDate).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="body1" fontWeight="bold">Request Type</Typography>
                                    <Typography variant="body1">{leaveTypeName}</Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="body1" fontWeight="bold">Requested Time</Typography>
                                    <Typography variant="body1">{request.duration || 0} day(s)</Typography>
                                </Box>

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
                                    Reason:
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
                                        {request.reason || 'No reason provided'}
                                    </Typography>
                                </Box>

                                {request.leaveType === 'sick' && request.medicalDocumentation?.provided && (
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
                                                    {(request.leaveType === 'sick' || request.type === 'sick')
                                                        ? 'Waiting Doctor Review'
                                                        : request.workflow?.currentStep === 'supervisor-review'
                                                            ? 'Awaiting Supervisor Review'
                                                            : 'Pending Review'}
                                                </Typography>
                                                {(request.leaveType === 'sick' || request.type === 'sick') && (
                                                    <Chip
                                                        label="Waiting Doctor"
                                                        color="warning"
                                                        size="small"
                                                        sx={{ mt: 1 }}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default RequestDetailsPage;
