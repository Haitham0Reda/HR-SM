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
    Paper,
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
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import overtimeService from '../../services/overtime.service';

const OvertimePage = () => {
    useDocumentTitle('Overtime');
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [overtime, setOvertime] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedOvertime, setSelectedOvertime] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        compensationType: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });
    const [monthlySummary, setMonthlySummary] = useState({
        totalHours: 0,
        pendingHours: 0,
        approvedHours: 0,
        compensatedHours: 0,
    });

    const canManage = isHR || isAdmin;

    const statusOptions = [
        { value: '', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
    ];

    const compensationTypeOptions = [
        { value: '', label: 'All Types' },
        { value: 'paid', label: 'Paid' },
        { value: 'time-off', label: 'Time Off' },
        { value: 'none', label: 'None' },
    ];

    const sortOptions = [
        { value: 'createdAt', label: 'Date Created' },
        { value: 'date', label: 'Overtime Date' },
    ];

    useEffect(() => {
        fetchOvertime();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const fetchOvertime = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.compensationType) params.compensationType = filters.compensationType;
            if (filters.sortBy) params.sortBy = filters.sortBy;
            if (filters.sortOrder) params.sortOrder = filters.sortOrder;

            const response = await overtimeService.getAll(params);
            const overtimeArray = response?.data || [];

            // Filter based on role
            let filteredData;
            if (canManage) {
                // Admin/HR see all overtime
                filteredData = overtimeArray;
            } else {
                // Regular employees see only their own overtime
                filteredData = overtimeArray.filter(ot => {
                    const otUserId = ot.employee?._id || ot.employee;
                    const currentUserId = user?._id;
                    return otUserId === currentUserId || String(otUserId) === String(currentUserId);
                });
            }

            setOvertime(filteredData);
            calculateMonthlySummary(filteredData);
        } catch (error) {

            showNotification('Failed to fetch overtime records', 'error');
            setOvertime([]);
        } finally {
            setLoading(false);
        }
    };

    const calculateMonthlySummary = (data) => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyData = data.filter(ot => {
            const otDate = new Date(ot.date);
            return otDate.getMonth() === currentMonth && otDate.getFullYear() === currentYear;
        });

        const summary = {
            totalHours: 0,
            pendingHours: 0,
            approvedHours: 0,
            compensatedHours: 0,
        };

        monthlyData.forEach(ot => {
            const hours = ot.duration || 0;
            summary.totalHours += hours;
            
            if (ot.status === 'pending') {
                summary.pendingHours += hours;
            } else if (ot.status === 'approved') {
                summary.approvedHours += hours;
                if (ot.compensated) {
                    summary.compensatedHours += hours;
                }
            }
        });

        setMonthlySummary(summary);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleDelete = async () => {
        try {
            await overtimeService.delete(selectedOvertime._id);
            showNotification('Overtime record deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedOvertime(null);
            fetchOvertime();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleApprove = async (overtimeId) => {
        try {
            await overtimeService.approve(overtimeId);
            showNotification('Overtime approved successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchOvertime();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleReject = async (overtimeId) => {
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
            await overtimeService.reject(overtimeId, trimmedReason);
            showNotification('Overtime rejected successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchOvertime();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
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

    const columns = [
        ...(canManage ? [{
            id: 'employee',
            label: 'Employee',
            align: 'center',
            render: (row) => row.employee?.personalInfo?.fullName || row.employee?.username || 'N/A',
        }] : []),
        {
            id: 'date',
            label: 'Date',
            align: 'center',
            render: (row) => new Date(row.date).toLocaleDateString(),
        },
        {
            id: 'timeRange',
            label: 'Time Range',
            align: 'center',
            render: (row) => `${row.startTime} - ${row.endTime}`,
        },
        {
            id: 'duration',
            label: 'Duration',
            align: 'center',
            render: (row) => row.duration ? `${row.duration}h` : '-',
        },
        {
            id: 'compensationType',
            label: 'Compensation',
            align: 'center',
            render: (row) => (
                <Chip
                    label={getCompensationTypeLabel(row.compensationType)}
                    size="small"
                    variant="outlined"
                    color={row.compensationType === 'paid' ? 'success' : row.compensationType === 'time-off' ? 'info' : 'default'}
                />
            ),
        },
        {
            id: 'compensated',
            label: 'Compensated',
            align: 'center',
            render: (row) => (
                <Chip
                    label={row.compensated ? 'Yes' : 'No'}
                    size="small"
                    color={row.compensated ? 'success' : 'default'}
                />
            ),
        },
        {
            id: 'reason',
            label: 'Reason',
            align: 'center',
            render: (row) => (
                <Box sx={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    maxWidth: '200px',
                }}>
                    {row.reason || '-'}
                </Box>
            ),
        },
        {
            id: 'status',
            label: 'Status',
            align: 'center',
            render: (row) => (
                <Chip
                    label={row.status}
                    color={getStatusColor(row.status)}
                    size="small"
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

                const canEdit = isOwnRequest && isPending;
                const canDelete = isOwnRequest;
                const canApprove = canManage && isPending;

                return (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {canApprove && (
                            <>
                                <IconButton
                                    size="small"
                                    onClick={() => handleApprove(row._id)}
                                    color="success"
                                    title="Approve"
                                >
                                    <CheckCircle fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => handleReject(row._id)}
                                    color="error"
                                    title="Reject"
                                >
                                    <Cancel fontSize="small" />
                                </IconButton>
                            </>
                        )}
                        <IconButton
                            size="small"
                            onClick={() => navigate(getCompanyRoute(`/overtime/${row._id}`))}
                            color="info"
                            title="View Details"
                        >
                            <ViewIcon fontSize="small" />
                        </IconButton>
                        {canEdit && (
                            <IconButton
                                size="small"
                                onClick={() => navigate(getCompanyRoute(`/overtime/${row._id}/edit`))}
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
                                    setSelectedOvertime(row);
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
                    <Typography variant="h4">Overtime</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {canManage ? 'Manage all overtime records' : 'View and manage your overtime records'}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate(getCompanyRoute('/overtime/create'))}
                >
                    New Overtime
                </Button>
            </Box>

            {/* Monthly Summary */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Monthly Summary ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
                </Typography>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="primary">
                                {monthlySummary.totalHours.toFixed(1)}h
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Hours
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="warning.main">
                                {monthlySummary.pendingHours.toFixed(1)}h
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Pending
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="success.main">
                                {monthlySummary.approvedHours.toFixed(1)}h
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Approved
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="info.main">
                                {monthlySummary.compensatedHours.toFixed(1)}h
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Compensated
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

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
                            label="Compensation Type"
                            name="compensationType"
                            value={filters.compensationType}
                            onChange={handleFilterChange}
                            size="small"
                        >
                            {compensationTypeOptions.map((option) => (
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

            <DataTable
                data={overtime}
                columns={columns}
                emptyMessage="No overtime records found. Click 'New Overtime' to create one."
            />

            <ConfirmDialog
                open={openConfirm}
                title="Delete Overtime"
                message="Are you sure you want to delete this overtime record? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedOvertime(null);
                }}
                confirmColor="error"
            />
        </Box>
    );
};

export default OvertimePage;
