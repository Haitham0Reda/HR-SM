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
    Stepper,
    Step,
    StepLabel,
    List,
    ListItem,
    ListItemText,
    Link,
    Breadcrumbs,
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
    LocalHospital,
    Assignment,
    NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import sickLeaveService from '../../services/sickLeave.service';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const SickLeaveDetails = () => {
    useDocumentTitle('Sick Leave Details');
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { id } = useParams();
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [sickLeave, setSickLeave] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);

    const canManage = isHR || isAdmin;
    const isDoctor = user?.role?.name === 'doctor' || user?.roles?.some(r => r.name === 'doctor');

    useEffect(() => {
        fetchSickLeave();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchSickLeave = async () => {
        try {
            setLoading(true);
            const data = await sickLeaveService.getById(id);
            setSickLeave(data);
        } catch (error) {

            showNotification('Failed to load sick leave', 'error');
            navigate(getCompanyRoute('/sick-leaves'));
        } finally {
            setLoading(false);
        }
    };

    const handleApproveBySupervisor = async () => {
        try {
            await sickLeaveService.approveBySupervisor(id);
            showNotification('Sick leave approved by supervisor successfully', 'success');
            await fetchSickLeave();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleApproveByDoctor = async () => {
        try {
            await sickLeaveService.approveByDoctor(id);
            showNotification('Sick leave approved by doctor successfully', 'success');
            await fetchSickLeave();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleRejectBySupervisor = async () => {
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
            await sickLeaveService.rejectBySupervisor(id, trimmedReason);
            showNotification('Sick leave rejected by supervisor successfully', 'success');
            await fetchSickLeave();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const handleRejectByDoctor = async () => {
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
            await sickLeaveService.rejectByDoctor(id, trimmedReason);
            showNotification('Sick leave rejected by doctor successfully', 'success');
            await fetchSickLeave();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await sickLeaveService.delete(id);
            showNotification('Sick leave deleted successfully', 'success');
            navigate(getCompanyRoute('/sick-leaves'));
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

    const getWorkflowStepIndex = (currentStep) => {
        const steps = ['supervisor-review', 'doctor-review', 'completed'];
        return steps.indexOf(currentStep);
    };

    if (loading) return <Loading />;
    if (!sickLeave) return null;

    const isPending = sickLeave.status === 'pending';
    const isOwnRequest = sickLeave.employee?._id === user?._id || String(sickLeave.employee?._id) === String(user?._id);
    const workflowStep = sickLeave.workflow?.currentStep;
    
    const canEdit = isOwnRequest && isPending && workflowStep === 'supervisor-review';
    const canDelete = isOwnRequest;
    const canSupervisorApprove = canManage && isPending && workflowStep === 'supervisor-review';
    const canDoctorApprove = isDoctor && isPending && workflowStep === 'doctor-review';

    const workflowSteps = ['Supervisor Review', 'Doctor Review', 'Completed'];
    const activeStep = getWorkflowStepIndex(workflowStep);

    return (
        <Box sx={{ p: 3 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }} aria-label="breadcrumb">
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate(getCompanyRoute('/dashboard'))}
                    sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    Dashboard
                </Link>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate(getCompanyRoute('/sick-leaves'))}
                    sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    Sick Leaves
                </Link>
                <Typography color="text.primary">Sick Leave Details</Typography>
            </Breadcrumbs>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate(getCompanyRoute('/sick-leaves'))}>
                        <ArrowBack />
                    </IconButton>
                    <Box>
                        <Typography variant="h4">Sick Leave Details</Typography>
                        <Typography variant="body2" color="text.secondary">
                            View and manage sick leave request
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {canEdit && (
                        <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => navigate(getCompanyRoute(`/sick-leaves/${id}/edit`))}
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

            <Grid container spacing={3}>
                {/* Main Information */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6">Request Information</Typography>
                            <Chip
                                label={sickLeave.status}
                                color={getStatusColor(sickLeave.status)}
                                size="medium"
                            />
                        </Box>
                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={2}>
                            {(canManage || isDoctor) && (
                                <Grid size={{ xs: 12 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Assignment color="action" />
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Employee
                                            </Typography>
                                            <Typography variant="body1">
                                                {sickLeave.employee?.personalInfo?.fullName || sickLeave.employee?.username || 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            )}

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarToday color="action" />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Start Date
                                        </Typography>
                                        <Typography variant="body1">
                                            {formatDate(sickLeave.startDate)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarToday color="action" />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            End Date
                                        </Typography>
                                        <Typography variant="body1">
                                            {formatDate(sickLeave.endDate)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AccessTime color="action" />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Duration
                                        </Typography>
                                        <Typography variant="body1">
                                            {sickLeave.duration} {sickLeave.duration === 1 ? 'day' : 'days'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            {sickLeave.reason && (
                                <Grid size={{ xs: 12 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                        <Description color="action" />
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Reason
                                            </Typography>
                                            <Typography variant="body1">
                                                {sickLeave.reason}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>

                    {/* Medical Documentation */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <LocalHospital color="primary" />
                            <Typography variant="h6">Medical Documentation</Typography>
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Required
                                </Typography>
                                <Typography variant="body1">
                                    <Chip
                                        label={sickLeave.medicalDocumentation?.required ? 'Yes' : 'No'}
                                        color={sickLeave.medicalDocumentation?.required ? 'warning' : 'default'}
                                        size="small"
                                    />
                                </Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Provided
                                </Typography>
                                <Typography variant="body1">
                                    <Chip
                                        label={sickLeave.medicalDocumentation?.provided ? 'Yes' : 'No'}
                                        color={sickLeave.medicalDocumentation?.provided ? 'success' : 'default'}
                                        size="small"
                                    />
                                </Typography>
                            </Grid>

                            {sickLeave.medicalDocumentation?.documents?.length > 0 && (
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Documents
                                    </Typography>
                                    <List dense>
                                        {sickLeave.medicalDocumentation.documents.map((doc, index) => (
                                            <ListItem key={index}>
                                                <ListItemText
                                                    primary={
                                                        <Link href={doc.url} target="_blank" rel="noopener">
                                                            {doc.filename}
                                                        </Link>
                                                    }
                                                    secondary={`Uploaded: ${formatDate(doc.uploadedAt)}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Grid>
                            )}

                            {sickLeave.medicalDocumentation?.doctorNotes && (
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Doctor Notes
                                    </Typography>
                                    <Typography variant="body1">
                                        {sickLeave.medicalDocumentation.doctorNotes}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>

                    {/* Rejection/Approval Information */}
                    {(sickLeave.rejectionReason || sickLeave.approverNotes) && (
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                {sickLeave.rejectionReason ? 'Rejection Information' : 'Approval Information'}
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            {sickLeave.rejectionReason && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Rejection Reason
                                    </Typography>
                                    <Typography variant="body1" color="error">
                                        {sickLeave.rejectionReason}
                                    </Typography>
                                </Box>
                            )}

                            {sickLeave.approverNotes && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Approver Notes
                                    </Typography>
                                    <Typography variant="body1">
                                        {sickLeave.approverNotes}
                                    </Typography>
                                </Box>
                            )}

                            {sickLeave.approvedBy && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Approved By
                                    </Typography>
                                    <Typography variant="body1">
                                        {sickLeave.approvedBy?.personalInfo?.fullName || sickLeave.approvedBy?.username || 'N/A'}
                                    </Typography>
                                    {sickLeave.approvedAt && (
                                        <Typography variant="caption" color="text.secondary">
                                            on {formatDate(sickLeave.approvedAt)}
                                        </Typography>
                                    )}
                                </Box>
                            )}

                            {sickLeave.rejectedBy && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Rejected By
                                    </Typography>
                                    <Typography variant="body1">
                                        {sickLeave.rejectedBy?.personalInfo?.fullName || sickLeave.rejectedBy?.username || 'N/A'}
                                    </Typography>
                                    {sickLeave.rejectedAt && (
                                        <Typography variant="caption" color="text.secondary">
                                            on {formatDate(sickLeave.rejectedAt)}
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </Paper>
                    )}
                </Grid>

                {/* Workflow Sidebar */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Approval Workflow
                        </Typography>
                        <Stepper activeStep={activeStep} orientation="vertical">
                            {workflowSteps.map((label, index) => (
                                <Step key={label}>
                                    <StepLabel>{label}</StepLabel>
                                </Step>
                            ))}
                        </Stepper>

                        {/* Action Buttons */}
                        {canSupervisorApprove && (
                            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={<CheckCircle />}
                                    onClick={handleApproveBySupervisor}
                                    fullWidth
                                >
                                    Approve (Supervisor)
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<Cancel />}
                                    onClick={handleRejectBySupervisor}
                                    fullWidth
                                >
                                    Reject (Supervisor)
                                </Button>
                            </Box>
                        )}

                        {canDoctorApprove && (
                            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={<CheckCircle />}
                                    onClick={handleApproveByDoctor}
                                    fullWidth
                                >
                                    Approve (Doctor)
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<Cancel />}
                                    onClick={handleRejectByDoctor}
                                    fullWidth
                                >
                                    Reject (Doctor)
                                </Button>
                            </Box>
                        )}
                    </Paper>

                    {/* Workflow Status Details */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Workflow Status
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Supervisor Approval
                                </Typography>
                                <Typography variant="body1">
                                    <Chip
                                        label={sickLeave.workflow?.supervisorApprovalStatus || 'pending'}
                                        color={
                                            sickLeave.workflow?.supervisorApprovalStatus === 'approved'
                                                ? 'success'
                                                : sickLeave.workflow?.supervisorApprovalStatus === 'rejected'
                                                ? 'error'
                                                : 'warning'
                                        }
                                        size="small"
                                    />
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Doctor Approval
                                </Typography>
                                <Typography variant="body1">
                                    <Chip
                                        label={sickLeave.workflow?.doctorApprovalStatus || 'pending'}
                                        color={
                                            sickLeave.workflow?.doctorApprovalStatus === 'approved'
                                                ? 'success'
                                                : sickLeave.workflow?.doctorApprovalStatus === 'rejected'
                                                ? 'error'
                                                : sickLeave.workflow?.doctorApprovalStatus === 'not-required'
                                                ? 'default'
                                                : 'warning'
                                        }
                                        size="small"
                                    />
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Current Step
                                </Typography>
                                <Typography variant="body1">
                                    {sickLeave.workflow?.currentStep?.replace('-', ' ') || 'N/A'}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Sick Leave"
                message="Are you sure you want to delete this sick leave? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setOpenConfirm(false)}
                confirmColor="error"
            />
        </Box>
    );
};

export default SickLeaveDetails;