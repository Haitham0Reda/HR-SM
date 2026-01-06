import React, { useState, useEffect, useRef } from 'react';
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
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import useSafeTableData from '../../hooks/useSafeTableData';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import missionService from '../../services/mission.service';

const MissionsPage = () => {
    useDocumentTitle('Missions');
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { getCompanyRoute } = useCompanyRouting();
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    
    // Debug user data
    useEffect(() => {
        console.log('🔍 MissionsPage - User data:', user);
        console.log('🔍 MissionsPage - User ID:', user?._id);
        console.log('🔍 MissionsPage - User ID type:', typeof user?._id);
        console.log('🔍 MissionsPage - isHR:', isHR);
        console.log('🔍 MissionsPage - isAdmin:', isAdmin);
        console.log('🔍 MissionsPage - Token in localStorage:', localStorage.getItem('token') ? 'Present' : 'Missing');
        console.log('🔍 MissionsPage - Tenant token in localStorage:', localStorage.getItem('tenant_token') ? 'Present' : 'Missing');
    }, [user, isHR, isAdmin]);
    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0); // Add refresh key for forcing re-renders
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedMission, setSelectedMission] = useState(null);
    const [currentTab, setCurrentTab] = useState(0);
    const needsRefreshRef = useRef(false); // Track if we need to refresh
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

    // Refresh data when navigating back to this page
    useEffect(() => {
        // Only refresh if we're exactly on the missions list page (not create/edit pages)
        const isOnMissionsListPage = location.pathname.includes('/missions') && 
                                   !location.pathname.includes('/create') && 
                                   !location.pathname.includes('/edit') &&
                                   !location.pathname.match(/\/missions\/[^\/]+$/); // Not on detail page
        
        if (isOnMissionsListPage) {
            console.log('🔄 MissionsPage - Location changed to missions list, refreshing data');
            console.log('🔄 Current pathname:', location.pathname);
            
            // Always refresh when coming back to the list page
            needsRefreshRef.current = true;
            setRefreshKey(prev => prev + 1);
            
            // Use setTimeout to ensure the page is fully loaded
            setTimeout(() => {
                fetchMissions();
            }, 50);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // Listen for custom events (like from create/edit page)
    useEffect(() => {
        const handleRefresh = () => {
            console.log('🔄 MissionsPage - Custom refresh event received');
            needsRefreshRef.current = true;
            setRefreshKey(prev => prev + 1); // Force re-render
            
            // Use setTimeout to ensure proper timing
            setTimeout(() => {
                fetchMissions();
            }, 100);
        };

        const handleVisibilityChange = () => {
            // Refresh data when user comes back to the tab
            if (!document.hidden && location.pathname.includes('/missions')) {
                console.log('🔄 MissionsPage - Tab became visible, refreshing data');
                needsRefreshRef.current = true;
                setRefreshKey(prev => prev + 1); // Force re-render
                fetchMissions();
            }
        };

        console.log('🔄 MissionsPage - Setting up event listeners');
        window.addEventListener('missionCreated', handleRefresh);
        window.addEventListener('missionUpdated', handleRefresh);
        window.addEventListener('notificationUpdate', handleRefresh);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            console.log('🔄 MissionsPage - Cleaning up event listeners');
            window.removeEventListener('missionCreated', handleRefresh);
            window.removeEventListener('missionUpdated', handleRefresh);
            window.removeEventListener('notificationUpdate', handleRefresh);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchMissions = async () => {
        try {
            console.log('🔄 MissionsPage - fetchMissions called');
            console.log('🔄 Current user when fetching:', user);
            setLoading(true);
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.sortBy) params.sortBy = filters.sortBy;
            if (filters.sortOrder) params.sortOrder = filters.sortOrder;

            console.log('🔍 Fetching missions with params:', params);
            const response = await missionService.getAll(params);
            console.log('🔍 Missions API response:', response);

            // Handle different response formats
            let missionsArray = [];
            if (Array.isArray(response)) {
                console.log('📊 Response is array format');
                missionsArray = response;
            } else if (response?.data && Array.isArray(response.data)) {
                console.log('📊 Response has data array');
                missionsArray = response.data;
            } else if (response?.missions && Array.isArray(response.missions)) {
                console.log('📊 Response has missions array');
                missionsArray = response.missions;
            } else {
                console.log('⚠️ Unexpected response format:', typeof response, response);
            }

            console.log('✅ MissionsPage - Fetched', missionsArray.length, 'missions');
            console.log('🔍 Raw missions data:', missionsArray);
            
            // Log each mission's employee field
            if (missionsArray.length > 0) {
                missionsArray.forEach((mission, index) => {
                    console.log(`🔍 Mission ${index + 1}:`, {
                        id: mission._id,
                        location: mission.location,
                        employee: mission.employee,
                        employeeType: typeof mission.employee
                    });
                });
            } else {
                console.log('⚠️ No missions found in response');
            }
            
            setMissions(missionsArray);
        } catch (error) {
            console.error('❌ MissionsPage - Error fetching missions:', error);
            console.error('❌ Error details:', error.response?.data);
            console.error('❌ Error status:', error.response?.status);
            console.error('❌ Error message:', error.message);
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
        console.log('🔍 MissionsPage - getFilteredData called');
        console.log('🔍 Current tab:', currentTab);
        console.log('🔍 Total missions:', missions.length);
        console.log('🔍 Current user:', user);
        
        if (currentTab === 0) {
            // My Missions - show only current user's missions
            const filtered = missions.filter(mission => {
                const missionUserId = mission.employee?._id || mission.employee;
                const currentUserId = user?._id;
                
                console.log('🔍 Filtering mission:', {
                    missionId: mission._id,
                    missionLocation: mission.location,
                    missionEmployee: mission.employee,
                    missionUserId: missionUserId,
                    missionUserIdType: typeof missionUserId,
                    currentUserId: currentUserId,
                    currentUserIdType: typeof currentUserId,
                    strictMatch: missionUserId === currentUserId,
                    stringMatch: String(missionUserId) === String(currentUserId),
                    willShow: missionUserId === currentUserId || String(missionUserId) === String(currentUserId)
                });
                
                return missionUserId === currentUserId || String(missionUserId) === String(currentUserId);
            });
            
            console.log('🔍 Filtered missions for current user:', filtered.length);
            console.log('🔍 Filtered missions data:', filtered);
            
            // Enhanced debugging when no missions found
            if (filtered.length === 0 && missions.length > 0) {
                console.log('⚠️ No missions found for current user. Detailed analysis:');
                console.log('📊 Total missions available:', missions.length);
                console.log('👤 Current user ID:', user?._id);
                console.log('👤 Current user ID type:', typeof user?._id);
                
                missions.forEach((mission, index) => {
                    const missionUserId = mission.employee?._id || mission.employee;
                    console.log(`Mission ${index + 1} analysis:`, {
                        missionId: mission._id,
                        location: mission.location,
                        employeeField: mission.employee,
                        employeeId: missionUserId,
                        employeeIdType: typeof missionUserId,
                        currentUserId: user?._id,
                        currentUserIdType: typeof user?._id,
                        strictMatch: missionUserId === user?._id,
                        stringMatch: String(missionUserId) === String(user?._id),
                        wouldMatch: missionUserId === user?._id || String(missionUserId) === String(user?._id)
                    });
                });
                
                console.log('💡 Possible reasons:');
                console.log('  1. No missions created by this user yet');
                console.log('  2. User ID format mismatch (ObjectId vs String)');
                console.log('  3. Missions created with different user ID');
                console.log('  4. Database/tenant isolation issue');
            }
            
            return filtered;
        } else {
            // All Users Missions - show all missions (only for HR/Admin)
            console.log('🔍 Showing all missions (HR/Admin view)');
            console.log('🔍 All missions data:', missions);
            return canManage ? missions : [];
        }
    };

    const filteredData = getFilteredData();
    
    // Use safe table data hook to prevent array errors
    const safeTableData = useSafeTableData(filteredData);

    const columns = [
        // Only show employee column in "All Users Missions" tab and if user can manage
        ...(currentTab === 1 && canManage ? [{
            id: 'employee',
            label: 'Employee Name',
            align: 'center',
            render: (row) => {
                // Handle both populated and non-populated employee field
                if (typeof row.employee === 'object' && row.employee !== null) {
                    return row.employee.personalInfo?.fullName || 
                           row.employee.username || 
                           row.employee.email || 
                           'N/A';
                }
                // If employee is just an ID string, we can't show the name
                return 'N/A';
            },
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
            render: (row) => row.purpose || '-',
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
                const canDelete = isOwnRequest || (canManage && currentTab === 1);
                const canApprove = canManage && isPending;

                return (
                    <Box>
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
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => {
                            console.log('🔄 Manual refresh button clicked');
                            setRefreshKey(prev => prev + 1); // Force re-render
                            fetchMissions();
                        }}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate(getCompanyRoute('/missions/create'))}
                    >
                        New Mission
                    </Button>
                </Box>
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
                            id="missions-status-filter"
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
                            id="missions-sortby-filter"
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
                            id="missions-sortorder-filter"
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
                            🎯 My Mission Requests ({safeTableData.length})
                        </Typography>
                        {console.log('🔍 About to render My Missions DataTable:', { 
                            filteredDataLength: filteredData.length, 
                            safeTableDataLength: safeTableData.length,
                            columnsLength: columns.length,
                            filteredData: filteredData,
                            safeTableData: safeTableData,
                            columns: columns.map(c => ({ id: c.id, label: c.label }))
                        })}
                        {safeTableData.length === 0 ? (
                            <Box sx={{ textAlign: 'center', p: 4, border: '1px solid #ddd', borderRadius: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    No missions found. Click 'New Mission' to create one.
                                </Typography>
                            </Box>
                        ) : (
                            <DataTable
                                key={`my-missions-${refreshKey}`}
                                data={safeTableData}
                                columns={columns}
                                emptyMessage="No missions found. Click 'New Mission' to create one."
                            />
                        )}
                    </Box>
                )}

                {currentTab === 1 && canManage && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            👥 All Users Mission Requests ({safeTableData.length})
                        </Typography>
                        <DataTable
                            key={`all-missions-${refreshKey}`}
                            data={safeTableData}
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
                message={
                    selectedMission && user ? (
                        (selectedMission.employee?._id === user._id || String(selectedMission.employee?._id) === String(user._id))
                            ? "Are you sure you want to delete this mission? This action cannot be undone."
                            : `Are you sure you want to delete this mission by ${selectedMission.employee?.username || 'Unknown User'}? This action cannot be undone.`
                    ) : "Are you sure you want to delete this mission? This action cannot be undone."
                }
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


