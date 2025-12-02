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
    NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import permissionService from '../../services/permission.service';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const PermissionDetails = () => {
    useDocumentTitle('Permission Details');
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [permission, setPermission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);

    const canManage = isHR || isAdmin;

    useEffect(() => {
        fetchPermission();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchPermission = async () => {
        try {
            setLoading(true);
            const data = await permissionService.getById(id);
            setPermission(data);
        } catch (error) {

            showNotification('Failed to load permission', 'error');
            navigate('/app/permissions');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            await permissionService.approve(id);
            showNotification('Permission approved successfully', 'success');
            await fetchPermission();
        } catch (error) {

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
            await permissionService.reject(id, trimmedReason);
            showNotification('Permission rejected successfully', 'success');
            await fetchPermission();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await permissionService.delete(id);
            showNotification('Permission deleted successfully', 'success');
            navigate('/app/permissions');
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

    const getPermissionTypeLabel = (type) => {
        const labels = {
            'late-arrival': 'Late Arrival',
            'early-departure': 'Early Departure',
        };
        return labels[type] || type;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) return <Loading />;
    if (!permission) return null;

    const isPending = permission.status === 'pending';
    const isOwnRequest = permission.employee?._id === user?._id || String(permission.employee?._id) === String(user?._id);
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
                    onClick={() => navigate('/app/permissions')}
                    sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    Permissions
                </Link>
                <Typography color="text.primary">Permission Details</Typography>
            </Breadcrumbs>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/app/permissions')} color="primary">
                        <ArrowBack />
                    </IconButton>
                    <Box>
                        <Typography variant="h4">Permission Details</Typography>
                        <Typography variant="body2" color="text.secondary">
                            View permission information and status
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
                            onClick={() => navigate(`/app/permissions/${id}/edit`)}
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
                {/* Left Column - Permission Information */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Permission Information
                            </Typography>
                            <Chip
                                label={permission.status.toUpperCase()}
                                color={getStatusColor(permission.status)}
                                sx={{ fontWeight: 600 }}
                            />
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <Schedule color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Permission Type
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {getPermissionTypeLabel(permission.permissionType)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <CalendarToday color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Date
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {formatDate(permission.date)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <AccessTime color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Time
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {permission.time}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            {permission.duration && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                        <AccessTime color="primary" />
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Duration
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {permission.duration} {permission.duration === 1 ? 'hour' : 'hours'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            )}

                            {permission.reason && (
                                <Grid size={{ xs: 12 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                        <Description color="primary" />
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Reason
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {permission.reason}
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
                                    {permission.employee?.personalInfo?.fullName || permission.employee?.username || 'N/A'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Department
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {permission.department?.name || 'N/A'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Position
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {permission.position?.title || 'N/A'}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>

                    {(permission.approvedBy || permission.rejectedBy) && (
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Approval Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {permission.approvedBy && (
                                    <>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Approved By
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {permission.approvedBy?.personalInfo?.fullName || permission.approvedBy?.username || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Approved At
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {formatDate(permission.approvedAt)}
                                            </Typography>
                                        </Box>
                                        {permission.approverNotes && (
                                            <Box>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Notes
                                                </Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {permission.approverNotes}
                                                </Typography>
                                            </Box>
                                        )}
                                    </>
                                )}
                                {permission.rejectedBy && (
                                    <>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Rejected By
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {permission.rejectedBy?.personalInfo?.fullName || permission.rejectedBy?.username || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Rejected At
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {formatDate(permission.rejectedAt)}
                                            </Typography>
                                        </Box>
                                        {permission.rejectionReason && (
                                            <Box>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Reason
                                                </Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500, color: 'error.main' }}>
                                                    {permission.rejectionReason}
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
                title="Delete Permission"
                message="Are you sure you want to delete this permission? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setOpenConfirm(false)}
                confirmColor="error"
            />
        </Box>
    );
};

export default PermissionDetails;
