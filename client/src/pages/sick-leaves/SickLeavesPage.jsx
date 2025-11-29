import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Chip,
    IconButton,
    TextField,
    MenuItem,
    Grid,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle,
    Cancel,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import sickLeaveService from '../../services/sickLeave.service';

const SickLeavesPage = () => {
    useDocumentTitle('Sick Leaves');
    const navigate = useNavigate();
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [sickLeaves, setSickLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedSickLeave, setSelectedSickLeave] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        workflowStatus: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });

    const canManage = isHR || isAdmin;
    const isDoctor = user?.role?.name === 'doctor' || user?.roles?.some(r => r.name === 'doctor');

    const statusOptions = [
        { value: '', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    const workflowOptions = [
        { value: '', label: 'All Workflow Steps' },
        { value: 'supervisor-review', label: 'Supervisor Review' },
        { value: 'doctor-review', label: 'Doctor Review' },
        { value: 'completed', label: 'Completed' },
        { value: 'rejected', label: 'Rejected' },
    ];

    const sortOptions = [
        { value: 'createdAt', label: 'Date Created' },
        { value: 'startDate', label: 'Start Date' },
        { value: 'endDate', label: 'End Date' },
    ];

    useEffect(() => {
        fetchSickLeaves();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const fetchSickLeaves = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.workflowStatus) params.workflowStatus = filters.workflowStatus;
            if (filters.sortBy) params.sortBy = filters.sortBy;
            if (filters.sortOrder) params.sortOrder = filters.sortOrder;

            const data = await sickLeaveService.getAll(params);
            const sickLeavesArray = Array.isArray(data) ? data : [];

            // Filter based on role
            let filteredData;
            if (canManage || isDoctor) {
                // Admin/HR/Doctor see all sick leaves
                filteredData = sickLeavesArray;
            } else {
                // Regular employees see only their own sick leaves
                filteredData = sickLeavesArray.filter(sickLeave => {
                    const sickLeaveUserId = sickLeave.employee?._id || sickLeave.employee;
                    const currentUserId = user?._id;
                    return sickLeaveUserId === currentUserId || String(sickLeaveUserId) === String(currentUserId);
                });
            }

            setSickLeaves(filteredData);
        } catch (error) {
            console.error('Error fetching sick leaves:', error);
            showNotification('Failed to fetch sick leaves', 'error');
            setSickLeaves([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleDelete = async () => {
        try {
            await sickLeaveService.delete(selectedSickLeave._id);
            showNotification('Sick leave deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedSickLeave(null);
            fetchSickLeaves();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleApproveBySupervisor = async (sickLeaveId) => {
        try {
            await sickLeaveService.approveBySupervisor(sickLeaveId);
            showNotification('Sick leave approved by supervisor successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchSickLeaves();
        } catch (error) {
            console.error('Approve error:', error);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleApproveByDoctor = async (sickLeaveId) => {
        try {
            await sickLeaveService.approveByDoctor(sickLeaveId);
            showNotification('Sick leave approved by doctor successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchSickLeaves();
        } catch (error) {
            console.error('Approve error:', error);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleRejectBySupervisor = async (sickLeaveId) => {
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
            await sickLeaveService.rejectBySupervisor(sickLeaveId, trimmedReason);
            showNotification('Sick leave rejected by supervisor successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchSickLeaves();
        } catch (error) {
            console.error('Reject error:', error);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
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
            showNotification('Sick leave rejected by doctor successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchSickLeaves();
        } catch (error) {
            console.error('Reject error:', error);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
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

    const getWorkflowColor = (workflowStep) => {
        const colors = {
            'supervisor-review': 'info',
            'doctor-review': 'warning',
            'completed': 'success',
            'rejected': 'error',
        };
        return colors[workflowStep] || 'default';
    };

    const columns = [
        ...(canManage || isDoctor ? [{
            field: 'employee',
            headerName: 'Employee',
            width: 180,
            align: 'center',
            renderCell: (row) => row.employee?.personalInfo?.fullName || row.employee?.username || 'N/A',
        }] : []),
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
            field: 'workflow',
            headerName: 'Workflow Step',
            width: 150,
            align: 'center',
            renderCell: (row) => (
                <Chip
                    label={row.workflow?.currentStep?.replace('-', ' ') || 'N/A'}
                    color={getWorkflowColor(row.workflow?.currentStep)}
                    size="small"
                />
            ),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            align: 'center',
            renderCell: (row) => (
                <Chip
                    label={row.status}
                    color={getStatusColor(row.status)}
                    size="small"
                />
            ),
        },
        {
            field: 'medicalDoc',
            headerName: 'Medical Doc',
            width: 120,
            align: 'center',
            renderCell: (row) => (
                <Chip
                    label={row.medicalDocumentation?.provided ? 'Provided' : 'Not Provided'}
                    color={row.medicalDocumentation?.provided ? 'success' : 'default'}
                    size="small"
                    variant="outlined"
                />
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 220,
            align: 'center',
            renderCell: (row) => {
                const isPending = row.status === 'pending';
                const isOwnRequest = row.employee?._id === user?._id || String(row.employee?._id) === String(user?._id);
                const workflowStep = row.workflow?.currentStep;

                const canEdit = isOwnRequest && isPending && workflowStep === 'supervisor-review';
                const canDelete = isOwnRequest;
                const canSupervisorApprove = canManage && isPending && workflowStep === 'supervisor-review';
                const canDoctorApprove = isDoctor && isPending && workflowStep === 'doctor-review';

                return (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {canSupervisorApprove && (
                            <>
                                <IconButton
                                    size="small"
                                    onClick={() => handleApproveBySupervisor(row._id)}
                                    color="success"
                                    title="Approve (Supervisor)"
                                >
                                    <CheckCircle fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => handleRejectBySupervisor(row._id)}
                                    color="error"
                                    title="Reject (Supervisor)"
                                >
                                    <Cancel fontSize="small" />
                                </IconButton>
                            </>
                        )}
                        {canDoctorApprove && (
                            <>
                                <IconButton
                                    size="small"
                                    onClick={() => handleApproveByDoctor(row._id)}
                                    color="success"
                                    title="Approve (Doctor)"
                                >
                                    <CheckCircle fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => handleRejectByDoctor(row._id)}
                                    color="error"
                                    title="Reject (Doctor)"
                                >
                                    <Cancel fontSize="small" />
                                </IconButton>
                            </>
                        )}
                        <IconButton
                            size="small"
                            onClick={() => navigate(`/app/sick-leaves/${row._id}`)}
                            color="info"
                            title="View Details"
                        >
                            <ViewIcon fontSize="small" />
                        </IconButton>
                        {canEdit && (
                            <IconButton
                                size="small"
                                onClick={() => navigate(`/app/sick-leaves/${row._id}/edit`)}
                                color="primary"
                                title="Edit"
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        )}
                        {canDelete && (
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setSelectedSickLeave(row);
                                    setOpenConfirm(true);
                                }}
                                color="error"
                                title="Delete"
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Box>
                );
            },
        },
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4">Sick Leaves</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {canManage || isDoctor ? 'Manage sick leave requests with two-step approval' : 'View and manage your sick leave requests'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    {isDoctor && (
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/app/sick-leaves/doctor-queue')}
                        >
                            Doctor Review Queue
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/app/sick-leaves/create')}
                    >
                        New Sick Leave
                    </Button>
                </Box>
            </Box>

            {/* Filters */}
            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            select
                            fullWidth
                            label="Status"
                            name="status"
                            value={filters.status}
                            onChange={handleFilterChange}
                            size="small"
                        >
                            {statusOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            select
                            fullWidth
                            label="Workflow Step"
                            name="workflowStatus"
                            value={filters.workflowStatus}
                            onChange={handleFilterChange}
                            size="small"
                        >
                            {workflowOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            select
                            fullWidth
                            label="Sort By"
                            name="sortBy"
                            value={filters.sortBy}
                            onChange={handleFilterChange}
                            size="small"
                        >
                            {sortOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            select
                            fullWidth
                            label="Order"
                            name="sortOrder"
                            value={filters.sortOrder}
                            onChange={handleFilterChange}
                            size="small"
                        >
                            <MenuItem value="asc">Ascending</MenuItem>
                            <MenuItem value="desc">Descending</MenuItem>
                        </TextField>
                    </Grid>
                </Grid>
            </Box>

            <DataTable
                data={sickLeaves}
                columns={columns}
                emptyMessage="No sick leaves found. Click 'New Sick Leave' to create one."
            />

            <ConfirmDialog
                open={openConfirm}
                title="Delete Sick Leave"
                message="Are you sure you want to delete this sick leave? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedSickLeave(null);
                }}
                confirmColor="error"
            />
        </Box>
    );
};

export default SickLeavesPage;
