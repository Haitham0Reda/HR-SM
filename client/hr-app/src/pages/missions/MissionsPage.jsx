import React, { useState, useEffect } from 'react';
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
import missionService from '../../services/mission.service';

const MissionsPage = () => {
    useDocumentTitle('Missions');
    const theme = useTheme();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedMission, setSelectedMission] = useState(null);
    const [currentTab, setCurrentTab] = useState(0);
    const [filters, setFilters] = useState({
        status: '',
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

    const sortOptions = [
        { value: 'createdAt', label: 'Date Created' },
        { value: 'startDate', label: 'Start Date' },
        { value: 'endDate', label: 'End Date' },
    ];

    useEffect(() => {
        fetchMissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const fetchMissions = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.sortBy) params.sortBy = filters.sortBy;
            if (filters.sortOrder) params.sortOrder = filters.sortOrder;

            console.log('Fetching missions with params:', params);
            const response = await missionService.getAll(params);
            console.log('Missions API response:', response);

            // Handle different response formats
            let missionsArray = [];
            if (Array.isArray(response)) {
                missionsArray = response;
            } else if (response?.data && Array.isArray(response.data)) {
                missionsArray = response.data;
            } else if (response?.missions && Array.isArray(response.missions)) {
                missionsArray = response.missions;
            }

            console.log('Processed missions array:', missionsArray);
            setMissions(missionsArray);
        } catch (error) {
            console.error('Error fetching missions:', error);
            console.error('Error details:', error.response?.data);
            showNotification(error.response?.data?.message || 'Failed to fetch missions', 'error');
            setMissions([]);
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
            await missionService.delete(selectedMission._id);
            showNotification('Mission deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedMission(null);
            fetchMissions();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleApprove = async (missionId) => {
        try {
            await missionService.approve(missionId);
            showNotification('Mission approved successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchMissions();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleReject = async (missionId) => {
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
            await missionService.reject(missionId, trimmedReason);
            showNotification('Mission rejected successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchMissions();
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

    // Filter data based on current tab
    const getFilteredData = () => {
        if (currentTab === 0) {
            // My Missions - show only current user's missions
            return missions.filter(mission => {
                const missionUserId = mission.employee?._id || mission.employee;
                const currentUserId = user?._id;
                return missionUserId === currentUserId || String(missionUserId) === String(currentUserId);
            });
        } else {
            // All Users Missions - show all missions (only for HR/Admin)
            return canManage ? missions : [];
        }
    };

    const filteredData = getFilteredData();

    const columns = [
        // Only show employee column in "All Users" tab (tab 1) and if user can manage
        ...(currentTab === 1 && canManage ? [{
            id: 'employee',
            label: 'Employee',
            align: 'center',
            render: (row) => row.employee?.personalInfo?.fullName || row.employee?.username || 'N/A',
        }] : []),
        {
            id: 'location',
            label: 'Location',
            align: 'center',
            render: (row) => row.location || '-',
        },
        {
            id: 'purpose',
            label: 'Purpose',
            align: 'center',
            render: (row) => (
                <Box sx={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    maxWidth: '200px',
                }}>
                    {row.purpose || '-'}
                </Box>
            ),
        },
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
                            onClick={() => navigate(getCompanyRoute(`/missions/${row._id}`))}
                            color="info"
                            title="View Details"
                        >
                            <ViewIcon fontSize="small" />
                        </IconButton>
                        {canEdit && (
                            <IconButton
                                size="small"
                                onClick={() => navigate(getCompanyRoute(`/missions/${row._id}/edit`))}
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
                                    setSelectedMission(row);
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
                    <Typography variant="h4">Missions</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {canManage ? 'Manage all mission requests' : 'View and manage your mission requests'}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate(getCompanyRoute('/missions/create'))}
                >
                    New Mission
                </Button>
            </Box>

            {/* Filters */}
            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
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
                    <Grid size={{ xs: 12, sm: 4 }}>
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
                    <Grid size={{ xs: 12, sm: 4 }}>
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
                        label="My Missions"
                    />
                    {canManage && (
                        <Tab
                            icon={<GroupIcon fontSize="small" />}
                            iconPosition="start"
                            label="All Users Missions"
                        />
                    )}
                </Tabs>
            </Paper>

            {/* Tab Content */}
            <Box>
                {currentTab === 0 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            🎯 My Mission Requests ({filteredData.length})
                        </Typography>
                        <DataTable
                            data={filteredData}
                            columns={columns}
                            emptyMessage="No missions found. Click 'New Mission' to create one."
                        />
                    </Box>
                )}

                {currentTab === 1 && canManage && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            👥 All Users Mission Requests ({filteredData.length})
                        </Typography>
                        <DataTable
                            data={filteredData}
                            columns={columns}
                            emptyMessage="No mission requests found from any employees."
                        />
                    </Box>
                )}

                {currentTab === 1 && !canManage && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="h6" color="error.main">
                            Access Denied
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            You don't have permission to view all users' mission requests.
                        </Typography>
                    </Box>
                )}
            </Box>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Mission"
                message="Are you sure you want to delete this mission? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedMission(null);
                }}
                confirmColor="error"
            />
        </Box>
    );
};

export default MissionsPage;
