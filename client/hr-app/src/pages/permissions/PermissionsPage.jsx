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
import permissionService from '../../services/permission.service';

const PermissionsPage = () => {
    useDocumentTitle('Permissions');
    const theme = useTheme();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState(null);
    const [currentTab, setCurrentTab] = useState(0);
    const [filters, setFilters] = useState({
        status: '',
        permissionType: '',
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
    ];

    const permissionTypeOptions = [
        { value: '', label: 'All Types' },
        { value: 'late-arrival', label: 'Late Arrival' },
        { value: 'early-departure', label: 'Early Departure' },
    ];

    const sortOptions = [
        { value: 'createdAt', label: 'Date Created' },
        { value: 'date', label: 'Permission Date' },
    ];

    useEffect(() => {
        fetchPermissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const fetchPermissions = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.permissionType) params.permissionType = filters.permissionType;
            if (filters.sortBy) params.sortBy = filters.sortBy;
            if (filters.sortOrder) params.sortOrder = filters.sortOrder;

            const response = await permissionService.getAll(params);

            // Handle response format
            const permissionsArray = response?.data || [];
            setPermissions(permissionsArray);
        } catch (error) {
            console.error('Error fetching permissions:', error);
            showNotification('Failed to fetch permissions', 'error');
            setPermissions([]);
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
            await permissionService.delete(selectedPermission._id);
            showNotification('Permission request deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedPermission(null);
            fetchPermissions();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleApprove = async (permissionId) => {
        try {
            await permissionService.approve(permissionId);
            showNotification('Permission approved successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchPermissions();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleReject = async (permissionId) => {
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
            await permissionService.reject(permissionId, trimmedReason);
            showNotification('Permission rejected successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchPermissions();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: theme.palette.warning.main,
            approved: theme.palette.success.main,
            rejected: theme.palette.error.main,
        };
        return colors[status] || theme.palette.grey[500];
    };

    const getPermissionTypeLabel = (type) => {
        const labels = {
            'late-arrival': 'Late Arrival',
            'early-departure': 'Early Departure',
        };
        return labels[type] || type;
    };

    // Filter data based on current tab
    const getFilteredData = () => {
        if (currentTab === 0) {
            // My Permissions - show only current user's permissions
            return permissions.filter(permission => {
                const permissionUserId = permission.employee?._id || permission.employee;
                const currentUserId = user?._id;
                return permissionUserId === currentUserId || String(permissionUserId) === String(currentUserId);
            });
        } else {
            // All Users Permissions - show all permissions (only for HR/Admin)
            return canManage ? permissions : [];
        }
    };

    const filteredData = getFilteredData();

    const columns = [
        // Only show employee column in "All Users" tab (tab 1) and if user can manage
        ...(currentTab === 1 && canManage ? [{
            id: 'employee',
            label: 'Employee',
            align: 'center',
            render: (row) => {
                // Handle both populated and non-populated employee field
                if (typeof row.employee === 'object' && row.employee !== null) {
                    return row.employee.personalInfo?.fullName || row.employee.username || 'N/A';
                }
                // If employee is just an ID string, show the ID
                return row.employee || 'N/A';
            },
        }] : []),
        {
            id: 'permissionType',
            label: 'Type',
            align: 'center',
            render: (row) => (
                <Chip
                    label={getPermissionTypeLabel(row.permissionType)}
                    size="small"
                    sx={{
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                        fontWeight: 600
                    }}
                    variant="outlined"
                />
            ),
        },
        {
            id: 'date',
            label: 'Date',
            align: 'center',
            render: (row) => new Date(row.date).toLocaleDateString(),
        },
        {
            id: 'time',
            label: 'Time',
            align: 'center',
            render: (row) => {
                if (!row.time) return '-';
                return `${row.time.scheduled || 'N/A'} → ${row.time.requested || 'N/A'}`;
            },
        },
        {
            id: 'duration',
            label: 'Duration',
            align: 'center',
            render: (row) => {
                const duration = row.time?.duration || row.duration;
                return duration ? `${duration}h` : '-';
            },
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
                            onClick={() => navigate(getCompanyRoute(`/permissions/${row._id}`))}
                            color="info"
                            title="View Details"
                        >
                            <ViewIcon fontSize="small" />
                        </IconButton>
                        {canEdit && (
                            <IconButton
                                size="small"
                                onClick={() => navigate(getCompanyRoute(`/permissions/${row._id}/edit`))}
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
                                    setSelectedPermission(row);
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
                    <Typography variant="h4">Permissions</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {canManage ? 'Manage all permission requests' : 'View and manage your permission requests'}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate(getCompanyRoute('/permissions/create'))}
                >
                    New Permission
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
                            label="Permission Type"
                            name="permissionType"
                            value={filters.permissionType}
                            onChange={handleFilterChange}
                            size="small"
                        >
                            {permissionTypeOptions.map((option) => (
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
                        label="My Permissions"
                    />
                    {canManage && (
                        <Tab
                            icon={<GroupIcon fontSize="small" />}
                            iconPosition="start"
                            label="All Users Permissions"
                        />
                    )}
                </Tabs>
            </Paper>

            {/* Tab Content */}
            <Box>
                {currentTab === 0 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            🔐 My Permission Requests ({filteredData.length})
                        </Typography>
                        <DataTable
                            data={filteredData}
                            columns={columns}
                            emptyMessage="No permissions found. Click 'New Permission' to create one."
                        />
                    </Box>
                )}

                {currentTab === 1 && canManage && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            👥 All Users Permission Requests ({filteredData.length})
                        </Typography>
                        <DataTable
                            data={filteredData}
                            columns={columns}
                            emptyMessage="No permission requests found from any employees."
                        />
                    </Box>
                )}

                {currentTab === 1 && !canManage && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="h6" color="error.main">
                            Access Denied
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            You don't have permission to view all users' permission requests.
                        </Typography>
                    </Box>
                )}
            </Box>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Permission"
                message="Are you sure you want to delete this permission? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedPermission(null);
                }}
                confirmColor="error"
            />
        </Box>
    );
};

export default PermissionsPage;
