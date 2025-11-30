import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    Grid,
    Chip,
    Divider,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Breadcrumbs,
    Link,
} from '@mui/material';
import {
    ArrowBack,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle,
    Cancel,
    CalendarToday,
    AccessTime,
    Description,
    EventAvailable,
    Block,
    NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import vacationService from '../../services/vacation.service';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const VacationRequestDetails = () => {
    useDocumentTitle('Vacation Request Details');
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [vacation, setVacation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [openCancelDialog, setOpenCancelDialog] = useState(false);
    const [actionType, setActionType] = useState('');
    const [cancellationReason, setCancellationReason] = useState('');

    const canManage = isHR || isAdmin;

    useEffect(() => {
        fetchVacation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchVacation = async () => {
        try {
            setLoading(true);
            const data = await vacationService.getById(id);
            setVacation(data);
        } catch (error) {
            console.error('Error fetching vacation:', error);
            showNotification('Failed to load vacation', 'error');
            navigate('/app/vacation-requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            await vacationService.approve(id);
            showNotification('Vacation approved successfully', 'success');
            await fetchVacation();
        } catch (error) {
            console.error('Approve error:', error);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleReject = async () => {
        const reason = prompt('Please provide a reason for rejection (minimum 10 characters):');
        if (reason === null) return;

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            showNotification('Rejection reason is required', 'error');
            return;
        }

        if (trimmedReason.length < 10) {
            showNotification('Rejection reason must be at least 10 characters long', 'error');
            return;
        }

        try {
            await vacationService.reject(id, trimmedReason);
            showNotification('Vacation rejected successfully', 'success');
            await fetchVacation();
        } catch (error) {
            console.error('Reject error:', error);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const handleCancelRequest = async () => {
        if (!cancellationReason.trim()) {
            showNotification('Cancellation reason is required', 'error');
            return;
        }

        if (cancellationReason.trim().length < 10) {
            showNotification('Cancellation reason must be at least 10 characters long', 'error');
            return;
        }

        try {
            await vacationService.cancel(id, cancellationReason.trim());
            showNotification('Vacation cancelled successfully', 'success');
            setOpenCancelDialog(false);
            setCancellationReason('');
            await fetchVacation();
        } catch (error) {
            console.error('Cancel error:', error);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Cancellation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await vacationService.delete(id);
            showNotification('Vacation deleted successfully', 'success');
            navigate('/app/vacation-requests');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'warning',
            approved: 'success',
            rejected: 'error',
            cancelled: 'default',
        };
        return colors[status] || 'default';
    };

    const getVacationTypeColor = (type) => {
        const colors = {
            annual: 'primary',
            casual: 'info',
            sick: 'warning',
            unpaid: 'default',
        };
        return colors[type] || 'default';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) return <Loading />;
    if (!vacation) return null;

    const isPending = vacation.status === 'pending';
    const isApproved = vacation.status === 'approved';
    const isOwnRequest = vacation.employee?._id === user?._id || String(vacation.employee?._id) === String(user?._id);
    const canEdit = isOwnRequest && isPending;
    const canDelete = isOwnRequest;
    const canApprove = canManage && isPending;
    const canCancel = isOwnRequest && isApproved;

    return (
        <Box sx={{ p: 3 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }} aria-label="breadcrumb">
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate('/app/dashboard')}
                    sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    Dashboard
                </Link>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate('/app/vacation-requests')}
                    sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    Vacation Requests
                </Link>
                <Typography color="text.primary">Vacation Request Details</Typography>
            </Breadcrumbs>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/app/vacation-requests')} color="primary">
                        <ArrowBack />
                    </IconButton>
                    <Box>
                        <Typography variant="h4">Vacation Request Details</Typography>
                        <Typography variant="body2" color="text.secondary">
                            View vacation request information and status
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {canApprove && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircle />}
                                onClick={handleApprove}
                            >
                                Approve
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<Cancel />}
                                onClick={handleReject}
                            >
                                Reject
                            </Button>
                        </>
                    )}
                    {canCancel && (
                        <Button
                            variant="outlined"
                            color="warning"
                            startIcon={<Block />}
                            onClick={() => setOpenCancelDialog(true)}
                        >
                            Cancel Request
                        </Button>
                    )}
                    {canEdit && (
                        <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => navigate(`/app/vacation-requests/${id}/edit`)}
                        >
                            Edit
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => {
                                setActionType('delete');
                                setOpenConfirm(true);
                            }}
                        >
                            Delete
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Main Content */}
            <Grid container spacing={3}>
                {/* Left Column - Vacation Information */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Vacation Information
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip
                                    label={vacation.vacationType.toUpperCase()}
                                    color={getVacationTypeColor(vacation.vacationType)}
                                    sx={{ fontWeight: 600 }}
                                />
                                <Chip
                                    label={vacation.status.toUpperCase()}
                                    color={getStatusColor(vacation.status)}
                                    sx={{ fontWeight: 600 }}
                                />
                            </Box>
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <CalendarToday color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Start Date
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {formatDate(vacation.startDate)}
                                        </Typography>
                                        {vacation.startTime && (
                                            <Typography variant="body2" color="text.secondary">
                                                {vacation.startTime}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <CalendarToday color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            End Date
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {formatDate(vacation.endDate)}
                                        </Typography>
                                        {vacation.endTime && (
                                            <Typography variant="body2" color="text.secondary">
                                                {vacation.endTime}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <AccessTime color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Duration
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {vacation.duration} {vacation.duration === 1 ? 'day' : 'days'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <EventAvailable color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Vacation Type
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {vacation.vacationType.charAt(0).toUpperCase() + vacation.vacationType.slice(1)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            {vacation.reason && (
                                <Grid size={{ xs: 12 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                        <Description color="primary" />
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Reason
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {vacation.reason}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>
                </Grid>

                {/* Right Column - Status & Employee Info */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                            Employee Information
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Name
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {vacation.employee?.personalInfo?.fullName || vacation.employee?.username || 'N/A'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Department
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {vacation.department?.name || 'N/A'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Position
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {vacation.position?.title || 'N/A'}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>

                    {(vacation.approvedBy || vacation.rejectedBy || vacation.cancelledBy) && (
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Status Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {vacation.approvedBy && (
                                    <>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Approved By
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {vacation.approvedBy?.personalInfo?.fullName || vacation.approvedBy?.username || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Approved At
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {formatDate(vacation.approvedAt)}
                                            </Typography>
                                        </Box>
                                        {vacation.approverNotes && (
                                            <Box>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Notes
                                                </Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {vacation.approverNotes}
                                                </Typography>
                                            </Box>
                                        )}
                                    </>
                                )}
                                {vacation.rejectedBy && (
                                    <>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Rejected By
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {vacation.rejectedBy?.personalInfo?.fullName || vacation.rejectedBy?.username || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Rejected At
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {formatDate(vacation.rejectedAt)}
                                            </Typography>
                                        </Box>
                                        {vacation.rejectionReason && (
                                            <Box>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Reason
                                                </Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500, color: 'error.main' }}>
                                                    {vacation.rejectionReason}
                                                </Typography>
                                            </Box>
                                        )}
                                    </>
                                )}
                                {vacation.cancelledBy && (
                                    <>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Cancelled By
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {vacation.cancelledBy?.personalInfo?.fullName || vacation.cancelledBy?.username || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Cancelled At
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {formatDate(vacation.cancelledAt)}
                                            </Typography>
                                        </Box>
                                        {vacation.cancellationReason && (
                                            <Box>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Reason
                                                </Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500, color: 'warning.main' }}>
                                                    {vacation.cancellationReason}
                                                </Typography>
                                            </Box>
                                        )}
                                    </>
                                )}
                            </Box>
                        </Paper>
                    )}
                </Grid>
            </Grid>

            {/* Cancel Dialog */}
            <Dialog open={openCancelDialog} onClose={() => setOpenCancelDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Cancel Vacation Request</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Please provide a reason for cancelling this vacation request (minimum 10 characters):
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                        placeholder="Enter cancellation reason..."
                        autoFocus
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setOpenCancelDialog(false);
                        setCancellationReason('');
                    }}>
                        Close
                    </Button>
                    <Button onClick={handleCancelRequest} variant="contained" color="warning">
                        Cancel Request
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                open={openConfirm}
                title="Delete Vacation Request"
                message="Are you sure you want to delete this vacation request? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setOpenConfirm(false)}
                confirmColor="error"
            />
        </Box>
    );
};

export default VacationRequestDetails;
