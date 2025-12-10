import React, { useState, useEffect } from 'react';
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
    LocationOn,
    CalendarToday,
    AccessTime,
    Business,
    Description,
    NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import missionService from '../../services/mission.service';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const MissionDetails = () => {
    useDocumentTitle('Mission Details');
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [mission, setMission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);

    const canManage = isHR || isAdmin;

    useEffect(() => {
        fetchMission();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchMission = async () => {
        try {
            setLoading(true);
            const data = await missionService.getById(id);
            setMission(data);
        } catch (error) {

            showNotification('Failed to load mission', 'error');
            navigate('/app/missions');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            await missionService.approve(id);
            showNotification('Mission approved successfully', 'success');
            await fetchMission();
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
            await missionService.reject(id, trimmedReason);
            showNotification('Mission rejected successfully', 'success');
            await fetchMission();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await missionService.delete(id);
            showNotification('Mission deleted successfully', 'success');
            navigate('/app/missions');
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

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) return <Loading />;
    if (!mission) return null;

    const isPending = mission.status === 'pending';
    const isOwnRequest = mission.employee?._id === user?._id || String(mission.employee?._id) === String(user?._id);
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
                    onClick={() => navigate('/app/missions')}
                    sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    Missions
                </Link>
                <Typography color="text.primary">Mission Details</Typography>
            </Breadcrumbs>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/app/missions')} color="primary">
                        <ArrowBack />
                    </IconButton>
                    <Box>
                        <Typography variant="h4">Mission Details</Typography>
                        <Typography variant="body2" color="text.secondary">
                            View mission information and status
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
                            onClick={() => navigate(`/app/missions/${id}/edit`)}
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
                {/* Left Column - Mission Information */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Mission Information
                            </Typography>
                            <Chip
                                label={mission.status.toUpperCase()}
                                color={getStatusColor(mission.status)}
                                sx={{ fontWeight: 600 }}
                            />
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <LocationOn color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Location
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {mission.location}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <Description color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Purpose
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {mission.purpose}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <CalendarToday color="primary" />
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Start Date
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {formatDate(mission.startDate)}
                                        </Typography>
                                        {mission.startTime && (
                                            <Typography variant="body2" color="text.secondary">
                                                {mission.startTime}
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
                                            {formatDate(mission.endDate)}
                                        </Typography>
                                        {mission.endTime && (
                                            <Typography variant="body2" color="text.secondary">
                                                {mission.endTime}
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
                                            {mission.duration} {mission.duration === 1 ? 'day' : 'days'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            {mission.relatedDepartment && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                        <Business color="primary" />
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Related Department
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {mission.relatedDepartment?.name || 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            )}

                            {mission.reason && (
                                <Grid size={{ xs: 12 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                        <Description color="primary" />
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Additional Notes
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {mission.reason}
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
                                    {mission.employee?.personalInfo?.fullName || mission.employee?.username || 'N/A'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Department
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {mission.department?.name || 'N/A'}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Position
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {mission.position?.title || 'N/A'}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>

                    {(mission.approvedBy || mission.rejectedBy) && (
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Approval Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {mission.approvedBy && (
                                    <>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Approved By
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {mission.approvedBy?.personalInfo?.fullName || mission.approvedBy?.username || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Approved At
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {formatDate(mission.approvedAt)}
                                            </Typography>
                                        </Box>
                                        {mission.approverNotes && (
                                            <Box>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Notes
                                                </Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {mission.approverNotes}
                                                </Typography>
                                            </Box>
                                        )}
                                    </>
                                )}
                                {mission.rejectedBy && (
                                    <>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Rejected By
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {mission.rejectedBy?.personalInfo?.fullName || mission.rejectedBy?.username || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Rejected At
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {formatDate(mission.rejectedAt)}
                                            </Typography>
                                        </Box>
                                        {mission.rejectionReason && (
                                            <Box>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Reason
                                                </Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500, color: 'error.main' }}>
                                                    {mission.rejectionReason}
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
                title="Delete Mission"
                message="Are you sure you want to delete this mission? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setOpenConfirm(false)}
                confirmColor="error"
            />
        </Box>
    );
};

export default MissionDetails;
