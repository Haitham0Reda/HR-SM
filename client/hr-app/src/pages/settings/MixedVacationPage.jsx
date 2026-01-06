import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Card, 
    CardContent, 
    Button, 
    Chip, 
    Grid, 
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Policy as PolicyIcon,
    Add as AddIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    PlayArrow as ActivateIcon,
    Stop as CancelIcon,
    Group as ApplyAllIcon,
    Person as TestIcon
} from '@mui/icons-material';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import mixedVacationService from '../../services/mixedVacation.service';
import Loading from '../../components/common/Loading';
import DataTable from '../../components/common/DataTable';
import useSafeTableData from '../../hooks/useSafeTableData';

function MixedVacationPage() {
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    
    // Use safe table data hook to prevent array errors
    const safeTableData = useSafeTableData(policies);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        totalDays: 1,
        deductionStrategy: 'auto',
        applicableTo: {
            allEmployees: true,
            departments: []
        }
    });

    const canManage = isHR || isAdmin;

    // Add a refresh trigger state
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        if (canManage) {
            fetchPolicies();
        }
    }, [canManage, refreshTrigger]); // Add refreshTrigger as dependency

    const fetchPolicies = async () => {
        try {
            setLoading(true);
            const response = await mixedVacationService.getAll();
            const policiesData = response.policies || [];
            
            // Debug logging
            console.log('MixedVacationPage - API response:', response);
            console.log('MixedVacationPage - policies data:', policiesData);
            console.log('MixedVacationPage - is policies array?', Array.isArray(policiesData));
            
            // Ensure policies is always an array
            setPolicies(Array.isArray(policiesData) ? policiesData : []);
        } catch (error) {
            console.error('Error fetching mixed vacation policies:', error);
            showNotification('Failed to fetch mixed vacation policies', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePolicy = async () => {
        try {
            console.log('🔍 Frontend - Creating policy with data:', formData);
            
            // Validate required fields on frontend
            if (!formData.name || !formData.startDate || !formData.endDate || !formData.totalDays) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }

            // Validate date range
            if (new Date(formData.endDate) < new Date(formData.startDate)) {
                showNotification('End date cannot be before start date', 'error');
                return;
            }

            await mixedVacationService.create(formData);
            showNotification('Mixed vacation policy created successfully', 'success');
            setCreateDialogOpen(false);
            setFormData({
                name: '',
                description: '',
                startDate: '',
                endDate: '',
                totalDays: 1,
                deductionStrategy: 'auto',
                applicableTo: {
                    allEmployees: true,
                    departments: []
                }
            });
            
            // Trigger useEffect to refresh data
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Frontend - Create policy error:', error);
            console.error('Error response:', error.response?.data);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Failed to create policy', 'error');
        }
    };

    const handleActivatePolicy = async (policyId) => {
        try {
            const response = await mixedVacationService.activate(policyId);
            showNotification('Policy activated successfully', 'success');
            
            // Trigger useEffect to refresh data
            setRefreshTrigger(prev => prev + 1);
            
        } catch (error) {
            console.error('Frontend - Activate error:', error);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Failed to activate policy', 'error');
        }
    };

    const handleCancelPolicy = async (policyId) => {
        try {
            const response = await mixedVacationService.cancel(policyId);
            showNotification('Policy cancelled successfully', 'success');
            
            // Trigger useEffect to refresh data
            setRefreshTrigger(prev => prev + 1);
            
        } catch (error) {
            console.error('Frontend - Cancel error:', error);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Failed to cancel policy', 'error');
        }
    };

    const handleDeletePolicy = async (policyId) => {
        if (window.confirm('Are you sure you want to delete this policy?')) {
            try {
                await mixedVacationService.delete(policyId);
                showNotification('Policy deleted successfully', 'success');
                
                // Trigger useEffect to refresh data
                setRefreshTrigger(prev => prev + 1);
            } catch (error) {
                showNotification(error.response?.data?.error || 'Failed to delete policy', 'error');
            }
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            draft: 'default',
            active: 'success',
            completed: 'info',
            cancelled: 'error'
        };
        return colors[status] || 'default';
    };

    const columns = [
        {
            id: 'name',
            label: 'Policy Name',
            render: (row) => (
                <Box>
                    <Typography variant="subtitle2">{row.name}</Typography>
                    {row.description && (
                        <Typography variant="caption" color="text.secondary">
                            {row.description}
                        </Typography>
                    )}
                </Box>
            )
        },
        {
            id: 'dateRange',
            label: 'Date Range',
            render: (row) => (
                <Box>
                    <Typography variant="body2">
                        {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {row.totalDays} total days
                    </Typography>
                </Box>
            )
        },
        {
            id: 'holidays',
            label: 'Breakdown',
            render: (row) => (
                <Box>
                    <Typography variant="body2">
                        Official: {row.officialHolidayCount || 0} days
                    </Typography>
                    <Typography variant="body2">
                        Personal: {row.personalDaysRequired || 0} days
                    </Typography>
                </Box>
            )
        },
        {
            id: 'applications',
            label: 'Applications',
            render: (row) => (
                <Box>
                    <Typography variant="body2">
                        Total: {row.stats?.totalApplicants || 0}
                    </Typography>
                    <Typography variant="body2" color="success.main">
                        Approved: {row.stats?.approvedCount || 0}
                    </Typography>
                </Box>
            )
        },
        {
            id: 'status',
            label: 'Status',
            render: (row) => (
                <Chip
                    label={row.status?.toUpperCase()}
                    color={getStatusColor(row.status)}
                    size="small"
                />
            )
        },
        {
            id: 'actions',
            label: 'Actions',
            render: (row) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="View Details">
                        <IconButton
                            size="small"
                            onClick={() => {
                                setSelectedPolicy(row);
                                setViewDialogOpen(true);
                            }}
                        >
                            <ViewIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    
                    {row.status === 'draft' && (
                        <Tooltip title="Activate Policy">
                            <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleActivatePolicy(row._id)}
                            >
                                <ActivateIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    
                    {row.status === 'active' && (
                        <Tooltip title="Cancel Policy">
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleCancelPolicy(row._id)}
                            >
                                <CancelIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    
                    {row.applications?.length === 0 && (
                        <Tooltip title="Delete Policy">
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeletePolicy(row._id)}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            )
        }
    ];

    if (!canManage) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="error.main">
                    Access Denied
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    You don't have permission to view mixed vacation policies.
                </Typography>
            </Box>
        );
    }

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PolicyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4">Mixed Vacation Policies</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Manage vacation policies that combine official holidays with personal leave days
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                >
                    Create Policy
                </Button>
            </Box>

            {/* Information Panel */}
            <Card sx={{ mb: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PolicyIcon />
                        About Mixed Vacation Policies
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Mixed vacation policies combine <strong>official holidays</strong> with <strong>personal leave days</strong> to create extended vacation periods.
                    </Typography>
                    
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Examples:</Typography>
                    <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                        <li><strong>Single Day:</strong> National Day (1 day) - if it's an official holiday, employees get the day off without using personal leave</li>
                        <li><strong>Extended Break:</strong> Christmas Week (Dec 23-Jan 2) - combines Christmas Day + New Year (official) with personal days for 11 consecutive days off</li>
                        <li><strong>Bridge Days:</strong> Long weekend by adding personal days around official holidays</li>
                    </Box>

                    <Typography variant="subtitle2" sx={{ mb: 1 }}>How it works:</Typography>
                    <Box component="ol" sx={{ pl: 2 }}>
                        <li>System detects official holidays in the date range</li>
                        <li>Calculates personal days needed: Total Days - Official Holidays</li>
                        <li>Applies deduction strategy to employee leave balances</li>
                        <li>Employees get the full period off using minimal personal days</li>
                    </Box>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="primary">
                                {policies.filter(p => p.status === 'active').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Active Policies
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="warning.main">
                                {policies.filter(p => p.status === 'draft').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Draft Policies
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="success.main">
                                {policies.reduce((sum, p) => sum + (p.stats?.totalApplicants || 0), 0)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Applications
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="info.main">
                                {policies.reduce((sum, p) => sum + (p.stats?.approvedCount || 0), 0)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Approved Applications
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Policies Table */}
            <Card>
                <CardContent>
                    {console.log('MixedVacationPage - About to render DataTable:', {
                        policies,
                        safeTableData,
                        policiesType: typeof policies,
                        safeTableDataType: typeof safeTableData,
                        policiesIsArray: Array.isArray(policies),
                        safeTableDataIsArray: Array.isArray(safeTableData)
                    })}
                    <DataTable
                        data={safeTableData}
                        columns={columns}
                        emptyMessage="No mixed vacation policies found. Create one to get started."
                    />
                </CardContent>
            </Card>

            {/* Create Policy Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create Mixed Vacation Policy</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Policy Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            multiline
                            rows={2}
                            fullWidth
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Start Date"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                required
                                fullWidth
                            />
                            <TextField
                                label="End Date"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                required
                                fullWidth
                            />
                        </Box>
                        <TextField
                            label="Total Days"
                            type="number"
                            value={formData.totalDays}
                            onChange={(e) => setFormData({ ...formData, totalDays: parseInt(e.target.value) })}
                            required
                            fullWidth
                            inputProps={{ min: 1 }}
                        />
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                select
                                label="Deduction Strategy"
                                value={formData.deductionStrategy}
                                onChange={(e) => setFormData({ ...formData, deductionStrategy: e.target.value })}
                                fullWidth
                                helperText="How personal leave days will be deducted from employee balances"
                            >
                                <MenuItem value="auto">
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">Auto (Recommended)</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Annual leave first, then casual leave
                                        </Typography>
                                    </Box>
                                </MenuItem>
                                <MenuItem value="annual-first">
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">Annual Leave First</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Deduct from annual leave balance first
                                        </Typography>
                                    </Box>
                                </MenuItem>
                                <MenuItem value="casual-first">
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">Casual Leave First</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Deduct from casual leave balance first
                                        </Typography>
                                    </Box>
                                </MenuItem>
                                <MenuItem value="proportional">
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">Proportional Distribution</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Distribute deduction proportionally across leave types
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            </TextField>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreatePolicy} variant="contained">
                        Create Policy
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Policy Dialog */}
            <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Policy Details</DialogTitle>
                <DialogContent>
                    {selectedPolicy && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <Box>
                                <Typography variant="h6">{selectedPolicy.name}</Typography>
                                {selectedPolicy.description && (
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedPolicy.description}
                                    </Typography>
                                )}
                            </Box>
                            
                            <Box>
                                <Typography variant="subtitle2">Date Range</Typography>
                                <Typography variant="body2">
                                    {new Date(selectedPolicy.startDate).toLocaleDateString()} - {new Date(selectedPolicy.endDate).toLocaleDateString()}
                                </Typography>
                            </Box>
                            
                            <Box>
                                <Typography variant="subtitle2">Breakdown</Typography>
                                <Typography variant="body2">Total Days: {selectedPolicy.totalDays}</Typography>
                                <Typography variant="body2">Official Holidays: {selectedPolicy.officialHolidayCount || 0}</Typography>
                                <Typography variant="body2">Personal Days Required: {selectedPolicy.personalDaysRequired || 0}</Typography>
                            </Box>
                            
                            <Box>
                                <Typography variant="subtitle2">Status</Typography>
                                <Chip
                                    label={selectedPolicy.status?.toUpperCase()}
                                    color={getStatusColor(selectedPolicy.status)}
                                    size="small"
                                />
                            </Box>
                            
                            <Box>
                                <Typography variant="subtitle2">Statistics</Typography>
                                <Typography variant="body2">Total Applications: {selectedPolicy.stats?.totalApplicants || 0}</Typography>
                                <Typography variant="body2">Approved: {selectedPolicy.stats?.approvedCount || 0}</Typography>
                                <Typography variant="body2">Rejected: {selectedPolicy.stats?.rejectedCount || 0}</Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default MixedVacationPage;
