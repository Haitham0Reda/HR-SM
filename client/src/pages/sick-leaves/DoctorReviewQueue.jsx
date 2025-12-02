import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Chip,
    IconButton,
    Alert,
} from '@mui/material';
import {
    CheckCircle,
    Cancel,
    Visibility as ViewIcon,
    ArrowBack,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import sickLeaveService from '../../services/sickLeave.service';

const DoctorReviewQueue = () => {
    useDocumentTitle('Doctor Review Queue');
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [sickLeaves, setSickLeaves] = useState([]);
    const [loading, setLoading] = useState(true);

    const isDoctor = user?.role?.name === 'doctor' || user?.roles?.some(r => r.name === 'doctor');

    useEffect(() => {
        if (!isDoctor) {
            showNotification('Access denied. Doctor role required.', 'error');
            navigate('/app/sick-leaves');
            return;
        }
        fetchPendingReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPendingReviews = async () => {
        try {
            setLoading(true);
            const data = await sickLeaveService.getPendingDoctorReview();
            const sickLeavesArray = Array.isArray(data) ? data : [];
            setSickLeaves(sickLeavesArray);
        } catch (error) {

            showNotification('Failed to fetch pending reviews', 'error');
            setSickLeaves([]);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveByDoctor = async (sickLeaveId) => {
        try {
            await sickLeaveService.approveByDoctor(sickLeaveId);
            showNotification('Sick leave approved successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchPendingReviews();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleRejectByDoctor = async (sickLeaveId) => {
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
            await sickLeaveService.rejectByDoctor(sickLeaveId, trimmedReason);
            showNotification('Sick leave rejected successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchPendingReviews();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const columns = [
        {
            field: 'employee',
            headerName: 'Employee',
            width: 180,
            align: 'center',
            renderCell: (row) => row.employee?.personalInfo?.fullName || row.employee?.username || 'N/A',
        },
        {
            field: 'startDate',
            headerName: 'Start Date',
            width: 120,
            align: 'center',
            renderCell: (row) => new Date(row.startDate).toLocaleDateString(),
        },
        {
            field: 'endDate',
            headerName: 'End Date',
            width: 120,
            align: 'center',
            renderCell: (row) => new Date(row.endDate).toLocaleDateString(),
        },
        {
            field: 'duration',
            headerName: 'Days',
            width: 80,
            align: 'center',
        },
        {
            field: 'medicalDoc',
            headerName: 'Medical Documentation',
            width: 180,
            align: 'center',
            renderCell: (row) => (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Chip
                        label={row.medicalDocumentation?.provided ? 'Provided' : 'Not Provided'}
                        color={row.medicalDocumentation?.provided ? 'success' : 'warning'}
                        size="small"
                    />
                    {row.medicalDocumentation?.documents?.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            {row.medicalDocumentation.documents.length} file(s)
                        </Typography>
                    )}
                </Box>
            ),
        },
        {
            field: 'submittedDate',
            headerName: 'Submitted',
            width: 120,
            align: 'center',
            renderCell: (row) => new Date(row.createdAt).toLocaleDateString(),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 180,
            align: 'center',
            renderCell: (row) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                        size="small"
                        onClick={() => handleApproveByDoctor(row._id)}
                        color="success"
                        title="Approve"
                    >
                        <CheckCircle fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => handleRejectByDoctor(row._id)}
                        color="error"
                        title="Reject"
                    >
                        <Cancel fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => navigate(`/app/sick-leaves/${row._id}`)}
                        color="info"
                        title="View Details"
                    >
                        <ViewIcon fontSize="small" />
                    </IconButton>
                </Box>
            ),
        },
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4">Doctor Review Queue</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Sick leave requests pending doctor approval
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/app/sick-leaves')}
                >
                    Back to Sick Leaves
                </Button>
            </Box>

            {sickLeaves.length === 0 && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    No sick leave requests pending doctor review at this time.
                </Alert>
            )}

            <DataTable
                data={sickLeaves}
                columns={columns}
                emptyMessage="No sick leave requests pending doctor review."
            />
        </Box>
    );
};

export default DoctorReviewQueue;
