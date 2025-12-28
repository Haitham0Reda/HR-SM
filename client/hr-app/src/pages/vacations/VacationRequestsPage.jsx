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
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import vacationService from '../../services/vacation.service';

const VacationRequestsPage = () => {
    useDocumentTitle('Vacation Requests');
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [vacations, setVacations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedVacation, setSelectedVacation] = useState(null);
    const [currentTab, setCurrentTab] = useState(0);
    const [filters, setFilters] = useState({
        status: '',
        vacationType: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });

    const canManage = isHR || isAdmin;

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

    const vacationTypeOptions = [
        { value: '', label: 'All Types' },
        { value: 'annual', label: 'Annual' },
        { value: 'casual', label: 'Casual' },
        { value: 'sick', label: 'Sick' },
        { value: 'unpaid', label: 'Unpaid' },
    ];

    const sortOptions = [
        { value: 'createdAt', label: 'Date Created' },
        { value: 'startDate', label: 'Start Date' },
        { value: 'endDate', label: 'End Date' },
    ];

    useEffect(() => {
        fetchVacations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const fetchVacations = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.vacationType) params.vacationType = filters.vacationType;
            if (filters.sortBy) params.sortBy = filters.sortBy;
            if (filters.sortOrder) params.sortOrder = filters.sortOrder;

            const response = await vacationService.getAll(params);
            console.log('🏖️ VacationRequestsPage Debug:', response);
            const vacationsArray = response?.data || [];
            setVacations(vacationsArray);
        } catch (error) {

            showNotification('Failed to fetch vacations', 'error');
            setVacations([]);
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
            await vacationService.delete(selectedVacation._id);
            showNotification('Vacation deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedVacation(null);
            fetchVacations();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleApprove = async (vacationId) => {
        try {
            await vacationService.approve(vacationId);
            showNotification('Vacation approved successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchVacations();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleReject = async (vacationId) => {
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
            await vacationService.reject(vacationId, trimmedReason);
            showNotification('Vacation rejected successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchVacations();
        } catch (error) {

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

    const getVacationTypeColor = (type) => {
        const colors = {
            annual: 'primary',
            casual: 'info',
            sick: 'warning',
            unpaid: 'default',
        };
        return colors[type] || 'default';
    };

    // Filter data based on current tab
    const getFilteredData = () => {
        if (currentTab === 0) {
            // My Vacations - show only current user's vacations
            return vacations.filter(vacation => {
                const vacationUserId = vacation.employee?._id || vacation.employee;
                const currentUserId = user?._id;
                return vacationUserId === currentUserId || String(vacationUserId) === String(currentUserId);
            });
        } else {
            // All Users Vacations - show all vacations (only for HR/Admin)
            return canManage ? vacations : [];
        }
    };

    const filteredData = getFilteredData();

    const columns = [
        // Only show employee column in "All Users" tab (tab 1) and if user can manage
        ...(currentTab === 1 && canManage ? [{
            id: 'employee',
            label: 'Employee',
            width: 180,
            align: 'center',
            render: (row) => row.employee?.personalInfo?.fullName || row.employee?.username || 'N/A',
        }] : []),
        {
            id: 'vacationType',
            label: 'Type',
            width: 100,
            align: 'center',
            render: (row) => (
                <Chip
                    label={row.vacationType}
                    color={getVacationTypeColor(row.vacationType)}
                    size="small"
                />
            ),
        },
        {
            id: 'startDate',
            label: 'Start Date',
            width: 120,
            align: 'center',
            render: (row) => new Date(row.startDate).toLocaleDateString(),
        },
        {
            id: 'endDate',
            label: 'End Date',
            width: 120,
            align: 'center',
            render: (row) => new Date(row.endDate).toLocaleDateString(),
        },
        {
            id: 'duration',
            label: 'Days',
            width: 80,
            align: 'center',
        },
        {
            id: 'reason',
            label: 'Reason',
            width: 200,
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
            width: 120,
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
            width: 220,
            align: 'center',
            render: (row) => {
                const isPending = row.status === 'pending';
                const isOwnRequest = row.employee?._id === user?._id || String(row.employee?._id) === String(user?._id);

                const canEdit = isAdmin || (isOwnRequest && isPending);
                const canDelete = isAdmin || isOwnRequest;
                const canApprove = canManage && (isAdmin || isPending);

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
                            onClick={() => navigate(getCompanyRoute(`/vacation-requests/${row._id}`))}
                            color="info"
                            title="View Details"
                        >
                            <ViewIcon fontSize="small" />
                        </IconButton>
                        {canEdit && (
                            <IconButton
                                size="small"
                                onClick={() => navigate(getCompanyRoute(`/vacation-requests/${row._id}/edit`))}
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
                                    setSelectedVacation(row);
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
                    <Typography variant="h4">Vacation Requests</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {canManage ? 'Manage all vacation requests' : 'View and manage your vacation requests'}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate(getCompanyRoute('/vacation-requests/create'))}
                >
                    New Vacation Request
                </Button>
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
                            label="Vacation Type"
                            name="vacationType"
                            value={filters.vacationType}
                            onChange={handleFilterChange}
                            size="small"
                        >
                            {vacationTypeOptions.map((option) => (
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
                        label="My Vacations"
                    />
                    {canManage && (
                        <Tab
                            icon={<GroupIcon fontSize="small" />}
                            iconPosition="start"
                            label="All Users Vacations"
                        />
                    )}
                </Tabs>
            </Paper>

            {/* Tab Content */}
            <Box>
                {currentTab === 0 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            🏖️ My Vacation Requests ({filteredData.length})
                        </Typography>
                        <DataTable
                            data={filteredData}
                            columns={columns}
                            emptyMessage="No vacation requests found. Click 'New Vacation Request' to create one."
                        />
                    </Box>
                )}

                {currentTab === 1 && canManage && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            👥 All Users Vacation Requests ({filteredData.length})
                        </Typography>
                        <DataTable
                            data={filteredData}
                            columns={columns}
                            emptyMessage="No vacation requests found from any employees."
                        />
                    </Box>
                )}

                {currentTab === 1 && !canManage && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="h6" color="error.main">
                            Access Denied
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            You don't have permission to view all users' vacation requests.
                        </Typography>
                    </Box>
                )}
            </Box>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Vacation Request"
                message="Are you sure you want to delete this vacation request? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedVacation(null);
                }}
                confirmColor="error"
            />
        </Box>
    );
};

export default VacationRequestsPage;

