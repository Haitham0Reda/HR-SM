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
    Schedule,
    AttachMoney,
    NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import overtimeService from '../../services/overtime.service';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const OvertimeDetails = () => {
    useDocumentTitle('Overtime Details');
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [overtime, setOvertime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);

    const canManage = isHR || isAdmin;

    useEffect(() => {
        fetchOvertime();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchOvertime = async () => {
        try {
            setLoading(true);
            const data = await overtimeService.getById(id);
            setOvertime(data);
        } catch (error) {
            console.error('Error fetching overtime:', error);
            showNotification('Failed to load overtime', 'error');
            navigate('/app/overtime');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            await overtimeService.approve(id);
            showNotification('Overtime approved successfully', 'success');
            await fetchOvertime();
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
            await overtimeService.reject(id, trimmedReason);
            showNotification('Overtime rejected successfully', 'success');
            await fetchOvertime();
        } catch (error) {
            console.error('Reject error:', error);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await overtimeService.delete(id);
            showNotification('Overtime deleted successfully', 'success');
            navigate('/app/overtime');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'warning',
            approved: 'success',
            rejected: 'error',
        };
        return colors[status] || 'default';
    };

    const getCompensationTypeLabel = (type) => {
        const labels = {
            'paid': 'Paid',
            'time-off': 'Time Off',
            'none': 'None',
        };
        return labels[type] || type;
    };

    const getCompensationTypeColor = (type) => {
        const colors = {
            'paid': 'success',
            'time-off': 'info',
            'none': 'default',
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
    if (!overtime) return null;

    const isPending = overtime.status === 'pending';
    const isOwnRequest = overtime.employee?._id === user?._id || String(overtime.employee?._id) === String(user?._id);
    const canEdit = isOwnRequest && isPending;
    const canDelete = isOwnRequest;
    const canApprove = canManage && isPending;

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
                    onClick={() => navigate('/app/overtime')}
                    sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    Overtime
                </Link>
                <Typography color="text.primary">Overtime Details</Typography>
            </Breadcrumbs>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/app/overtime')} color="primary">
                        <ArrowBack />
                    </IconButton>
                    <Box>
                        <Typography variant="h4">Overtime Details</Typography>
                        <Typography variant="body2" color="text.secondary">
                            View overtime information and compensation status
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
                    {canEdit && (
                        <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => navigate(`/app/overtime/${id}/edit`)}
                        >
                            Edit
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => setOpenConfirm(true)}
                        >
                            Delete
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Main Content */}
            <Grid container spacing={3}>
                {/* Left Column - Overtime Information */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Overtime Information
                            </Typography>
                            <Chip
                                label={overtime.status.toUpperCase()}
                                color={getStatusColor(overtime.status)}
                                sx={{ fontWeight: 600 }}
                            />
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <CalendarToday color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Date
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {formatDate(overtime.date)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <AccessTime color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Time Range
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {overtime.startTime} - {overtime.endTime}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <Schedule color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Duration
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {overtime.duration} {overtime.duration === 1 ? 'hour' : 'hours'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <AttachMoney color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Compensation Type
                                        </Typography>
                                        <Chip
                                            label={getCompensationTypeLabel(overtime.compensationType)}
                                            color={getCompensationTypeColor(overtime.compensationType)}
                                            size="small"
                                            sx={{ mt: 0.5 }}
                                        />
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <CheckCircle color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Compensation Status
                                        </Typography>
                                        <Chip
                                            label={overtime.compensated ? 'Compensated' : 'Not Compensated'}
                                            color={overtime.compensated ? 'success' : 'default'}
                                            size="small"
                                            sx={{ mt: 0.5 }}
                                        />
                                    </Box>
                                </Box>
                            </Grid>

                            {overtime.compensatedAt && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                        <CalendarToday color="primary" />
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Compensated At
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {formatDate(overtime.compensatedAt)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            )}

                            {overtime.reason && (
                                <Grid size={{ xs: 12 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                        <Description color="primary" />
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Reason
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {overtime.reason}
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
                                    {overtime.employee?.personalInfo?.fullName || overtime.employee?.username || 'N/A'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Department
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {overtime.department?.name || 'N/A'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Position
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {overtime.position?.title || 'N/A'}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>

                    {(overtime.approvedBy || overtime.rejectedBy) && (
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Approval Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {overtime.approvedBy && (
                                    <>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Approved By
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {overtime.approvedBy?.personalInfo?.fullName || overtime.approvedBy?.username || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Approved At
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {formatDate(overtime.approvedAt)}
                                            </Typography>
                                        </Box>
                                        {overtime.approverNotes && (
                                            <Box>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Notes
                                                </Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {overtime.approverNotes}
                                                </Typography>
                                            </Box>
                                        )}
                                    </>
                                )}
                                {overtime.rejectedBy && (
                                    <>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Rejected By
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {overtime.rejectedBy?.personalInfo?.fullName || overtime.rejectedBy?.username || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Rejected At
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {formatDate(overtime.rejectedAt)}
                                            </Typography>
                                        </Box>
                                        {overtime.rejectionReason && (
                                            <Box>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Reason
                                                </Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500, color: 'error.main' }}>
                                                    {overtime.rejectionReason}
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

            <ConfirmDialog
                open={openConfirm}
                title="Delete Overtime"
                message="Are you sure you want to delete this overtime record? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setOpenConfirm(false)}
                confirmColor="error"
            />
        </Box>
    );
};

export default OvertimeDetails;
