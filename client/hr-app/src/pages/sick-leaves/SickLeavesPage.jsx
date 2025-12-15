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
    useTheme,
    Tabs,
    Tab,
    Paper,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle,
    Cancel,
    Visibility as ViewIcon,
    Person as PersonIcon,
    Group as GroupIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import sickLeaveService from '../../services/sickLeave.service';

const SickLeavesPage = () => {
    useDocumentTitle('Sick Leaves');
    const theme = useTheme();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [sickLeaves, setSickLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedSickLeave, setSelectedSickLeave] = useState(null);
    const [currentTab, setCurrentTab] = useState(0);
    const [filters, setFilters] = useState({
        status: '',
        workflowStatus: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });

    const canManage = isHR || isAdmin;
    const isDoctor = user?.role?.name === 'doctor' || user?.roles?.some(r => r.name === 'doctor');

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

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
            const sickLeavesArray = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
            setSickLeaves(sickLeavesArray);
        } catch (error) {

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

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: theme.palette.warning.main,
            approved: theme.palette.success.main,
            rejected: theme.palette.error.main,
            cancelled: theme.palette.grey[500],
        };
        return colors[status] || theme.palette.grey[500];
    };

    const getWorkflowColor = (workflowStep) => {
        const colors = {
            'supervisor-review': theme.palette.info.main,
            'doctor-review': theme.palette.warning.main,
            'completed': theme.palette.success.main,
            'rejected': theme.palette.error.main,
        };
        return colors[workflowStep] || theme.palette.grey[500];
    };

    // Filter data based on current tab
    const getFilteredData = () => {
        if (currentTab === 0) {
            // My Sick Leaves - show only current user's sick leaves
            return sickLeaves.filter(sickLeave => {
                const sickLeaveUserId = sickLeave.employee?._id || sickLeave.employee;
                const currentUserId = user?._id;
                return sickLeaveUserId === currentUserId || String(sickLeaveUserId) === String(currentUserId);
            });
        } else {
            // All Users Sick Leaves - show all sick leaves (only for HR/Admin/Doctor)
            return (canManage || isDoctor) ? sickLeaves : [];
        }
    };

    const filteredData = getFilteredData();

    const columns = [
        // Only show employee column in "All Users" tab (tab 1) and if user can manage or is doctor
        ...(currentTab === 1 && (canManage || isDoctor) ? [{
            id: 'employee',
            label: 'Employee',
            align: 'center',
            render: (row) => row.employee?.personalInfo?.fullName || row.employee?.username || 'N/A',
        }] : []),
        {
            id: 'startDate',
            label: 'Start Date',
            align: 'center',
            render: (row) => new Date(row.startDate).toLocaleDateString(),
        },
        {
            id: 'endDate',
            label: 'End Date',
            align: 'center',
            render: (row) => new Date(row.endDate).toLocaleDateString(),
        },
        {
            id: 'duration',
            label: 'Days',
            align: 'center',
            render: (row) => row.duration || '-',
        },
        {
            id: 'workflow',
            label: 'Workflow Step',
            align: 'center',
            render: (row) => {
                const workflowColor = getWorkflowColor(row.workflow?.currentStep);
                return (
                    <Chip
                        label={row.workflow?.currentStep?.replace('-', ' ') || 'N/A'}
                        size="small"
                        sx={{
                            bgcolor: workflowColor,
                            color: theme.palette.getContrastText(workflowColor),
                            fontWeight: 600,
                            textTransform: 'capitalize'
                        }}
                    />
                );
            },
        },
        {
            id: 'status',
            label: 'Status',
            align: 'center',
            render: (row) => {
                const statusColor = getStatusColor(row.status);
                return (
                    <Chip
                        label={row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        size="small"
                        sx={{
                            bgcolor: statusColor,
                            color: theme.palette.getContrastText(statusColor),
                            fontWeight: 600
                        }}
                    />
                );
            },
        },
        {
            id: 'medicalDoc',
            label: 'Medical Doc',
            align: 'center',
            render: (row) => (
                <Chip
                    label={row.medicalDocumentation?.provided ? 'Provided' : 'Not Provided'}
                    size="small"
                    variant="outlined"
                    sx={{
                        borderColor: row.medicalDocumentation?.provided ? theme.palette.success.main : theme.palette.grey[500],
                        color: row.medicalDocumentation?.provided ? theme.palette.success.main : theme.palette.text.secondary,
                        fontWeight: 600
                    }}
                />
            ),
        },
        {
            id: 'actions',
            label: 'Actions',
            align: 'center',
            render: (row) => {
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
                            onClick={() => navigate(getCompanyRoute(`/sick-leaves/${row._id}`))}
                            color="info"
                            title="View Details"
                        >
                            <ViewIcon fontSize="small" />
                        </IconButton>
                        {canEdit && (
                            <IconButton
                                size="small"
                                onClick={() => navigate(getCompanyRoute(`/sick-leaves/${row._id}/edit`))}
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
                            onClick={() => navigate(getCompanyRoute('/sick-leaves/doctor-queue'))}
                        >
                            Doctor Review Queue
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate(getCompanyRoute('/sick-leaves/create'))}
                    >
                        New Sick Leave
                    </Button>
                </Box>
            </Box>

            {/* Filters */}
            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 3 }}>
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
                    <Grid size={{ xs: 12, sm: 3 }}>
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
                    <Grid size={{ xs: 12, sm: 3 }}>
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
                    <Grid size={{ xs: 12, sm: 3 }}>
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

            {/* Tabs */}
            <Paper sx={{ mb: 2 }}>
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {
                            minHeight: 48,
                            textTransform: 'none',
                        },
                    }}
                >
                    <Tab
                        icon={<PersonIcon fontSize="small" />}
                        iconPosition="start"
                        label="My Sick Leaves"
                    />
                    {(canManage || isDoctor) && (
                        <Tab
                            icon={<GroupIcon fontSize="small" />}
                            iconPosition="start"
                            label="All Users Sick Leaves"
                        />
                    )}
                </Tabs>
            </Paper>

            {/* Tab Content */}
            <Box>
                {currentTab === 0 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            🏥 My Sick Leave Requests ({filteredData.length})
                        </Typography>
                        <DataTable
                            data={filteredData}
                            columns={columns}
                            emptyMessage="No sick leaves found. Click 'New Sick Leave' to create one."
                        />
                    </Box>
                )}

                {currentTab === 1 && (canManage || isDoctor) && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            👥 All Users Sick Leave Requests ({filteredData.length})
                        </Typography>
                        <DataTable
                            data={filteredData}
                            columns={columns}
                            emptyMessage="No sick leave requests found from any employees."
                        />
                    </Box>
                )}

                {currentTab === 1 && !(canManage || isDoctor) && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="h6" color="error.main">
                            Access Denied
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            You don't have permission to view all users' sick leave requests.
                        </Typography>
                    </Box>
                )}
            </Box>

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
