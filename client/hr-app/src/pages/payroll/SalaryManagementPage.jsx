import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Typography,
    Chip,
    MenuItem,
    Grid,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    Divider,
    Alert,
    Tooltip
} from '@mui/material';
import { 
    Add as AddIcon, 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    History as HistoryIcon,
    Security as SecurityIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import salaryService from '../../services/salary.service';
import userService from '../../services/user.service';

const SalaryManagementPage = () => {
    const [salaries, setSalaries] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedSalary, setSelectedSalary] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [salaryHistory, setSalaryHistory] = useState([]);
    const [userPermissions, setUserPermissions] = useState({
        canView: false,
        canManage: false,
        role: 'employee'
    });
    const [formData, setFormData] = useState({
        employee: '',
        baseSalary: '',
        allowances: {
            housing: '',
            transportation: '',
            medical: '',
            food: '',
            other: ''
        },
        currency: 'EGP',
        effectiveDate: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const { showNotification } = useNotification();
    const { user } = useAuth();

    useEffect(() => {
        fetchSalaries();
        fetchUsers();
    }, []);

    const fetchSalaries = async () => {
        try {
            setLoading(true);
            const response = await salaryService.getAll();
            console.log('Fetched salary response:', response);
            
            const salariesData = response.salaries || response.data || response || [];
            const permissions = response.userPermissions || { canView: false, canManage: false, role: 'employee' };
            
            setSalaries(salariesData);
            setUserPermissions(permissions);
            
            // Show security notice for admin users
            if (permissions.role === 'admin' && !permissions.canView) {
                showNotification('You are viewing salary data in debug mode. Actual salary values are encrypted and hidden.', 'info');
            }
        } catch (error) {
            console.error('Error fetching salaries:', error);
            showNotification('Failed to fetch salary records', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await userService.getAll();
            const usersArray = Array.isArray(data) ? data : (data?.data || []);
            setUsers(usersArray);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        }
    };

    const fetchSalaryHistory = async (employeeId) => {
        try {
            const response = await salaryService.getSalaryHistory(employeeId);
            setSalaryHistory(response.salaries || []);
        } catch (error) {
            console.error('Error fetching salary history:', error);
            showNotification('Failed to fetch salary history', 'error');
        }
    };

    // Helper function to format Egyptian currency or show masked value
    const formatEGP = (amount) => {
        if (typeof amount === 'string' && amount.includes('*')) {
            return `${amount} EGP`;
        }
        const num = parseFloat(amount) || 0;
        return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
    };

    // Helper function to check if value is masked
    const isMaskedValue = (value) => {
        return typeof value === 'string' && value.includes('*');
    };

    const handleOpenDialog = (salary = null) => {
        // Check if user can manage salary data
        if (!userPermissions.canManage) {
            showNotification('You do not have permission to create or edit salary records', 'error');
            return;
        }

        if (salary) {
            // Don't allow editing if salary data is masked
            if (isMaskedValue(salary.baseSalary)) {
                showNotification('Cannot edit salary record - insufficient permissions to view salary data', 'error');
                return;
            }

            setSelectedSalary(salary);
            setFormData({
                employee: salary.employee._id,
                baseSalary: salary.baseSalary,
                allowances: {
                    housing: salary.allowances?.housing || '',
                    transportation: salary.allowances?.transportation || '',
                    medical: salary.allowances?.medical || '',
                    food: salary.allowances?.food || '',
                    other: salary.allowances?.other || ''
                },
                currency: salary.currency || 'EGP',
                effectiveDate: salary.effectiveDate ? new Date(salary.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                notes: salary.notes || ''
            });
        } else {
            setSelectedSalary(null);
            setFormData({
                employee: '',
                baseSalary: '',
                allowances: {
                    housing: '',
                    transportation: '',
                    medical: '',
                    food: '',
                    other: ''
                },
                currency: 'EGP',
                effectiveDate: new Date().toISOString().split('T')[0],
                notes: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedSalary(null);
    };

    const handleOpenHistory = async (employee) => {
        setSelectedEmployee(employee);
        await fetchSalaryHistory(employee._id);
        setOpenHistoryDialog(true);
    };

    const handleSubmit = async () => {
        try {
            const submitData = {
                ...formData,
                baseSalary: parseFloat(formData.baseSalary) || 0,
                allowances: {
                    housing: parseFloat(formData.allowances.housing) || 0,
                    transportation: parseFloat(formData.allowances.transportation) || 0,
                    medical: parseFloat(formData.allowances.medical) || 0,
                    food: parseFloat(formData.allowances.food) || 0,
                    other: parseFloat(formData.allowances.other) || 0
                }
            };

            // Calculate gross salary on frontend as backup
            const totalAllowances = submitData.allowances.housing + 
                                  submitData.allowances.transportation + 
                                  submitData.allowances.medical + 
                                  submitData.allowances.food + 
                                  submitData.allowances.other;
            
            submitData.grossSalary = submitData.baseSalary + totalAllowances;

            console.log('Submitting salary data:', submitData);

            if (selectedSalary) {
                const response = await salaryService.update(selectedSalary._id, submitData);
                console.log('Update response:', response);
                showNotification('Salary updated successfully', 'success');
            } else {
                const response = await salaryService.create(submitData);
                console.log('Create response:', response);
                showNotification('Salary created successfully', 'success');
            }
            handleCloseDialog();
            fetchSalaries();
        } catch (error) {
            console.error('Submit error:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Operation failed';
            showNotification(errorMessage, 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await salaryService.delete(selectedSalary._id);
            showNotification('Salary record deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedSalary(null);
            fetchSalaries();
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Delete failed';
            showNotification(errorMessage, 'error');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            active: 'success',
            inactive: 'default',
            pending: 'warning'
        };
        return colors[status] || 'default';
    };

    const calculateGrossSalary = () => {
        if (!userPermissions.canView) {
            return '***';
        }
        
        const base = parseFloat(formData.baseSalary) || 0;
        const housing = parseFloat(formData.allowances.housing) || 0;
        const transportation = parseFloat(formData.allowances.transportation) || 0;
        const medical = parseFloat(formData.allowances.medical) || 0;
        const food = parseFloat(formData.allowances.food) || 0;
        const other = parseFloat(formData.allowances.other) || 0;
        
        return base + housing + transportation + medical + food + other;
    };

    const columns = [
        {
            id: 'employee',
            label: 'Employee',
            render: (row) => (
                <Box>
                    <Typography variant="body2" fontWeight="bold">
                        {row.employee?.firstName} {row.employee?.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        ID: {row.employee?.employeeId} | {row.employee?.role}
                    </Typography>
                </Box>
            )
        },
        {
            id: 'baseSalary',
            label: 'Base Salary',
            render: (row) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                        {formatEGP(row.baseSalary)}
                    </Typography>
                    {isMaskedValue(row.baseSalary) && (
                        <Tooltip title="Salary data is encrypted and hidden for security">
                            <SecurityIcon fontSize="small" color="warning" />
                        </Tooltip>
                    )}
                </Box>
            )
        },
        {
            id: 'grossSalary',
            label: 'Gross Salary',
            render: (row) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontWeight="bold" color={isMaskedValue(row.grossSalary) ? "text.secondary" : "primary"}>
                        {formatEGP(row.grossSalary)}
                    </Typography>
                    {isMaskedValue(row.grossSalary) && (
                        <Tooltip title="Salary data is encrypted and hidden for security">
                            <SecurityIcon fontSize="small" color="warning" />
                        </Tooltip>
                    )}
                </Box>
            )
        },
        {
            id: 'effectiveDate',
            label: 'Effective Date',
            render: (row) => new Date(row.effectiveDate).toLocaleDateString()
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
                <Box>
                    <IconButton onClick={() => handleOpenHistory(row.employee)} size="small">
                        <HistoryIcon />
                    </IconButton>
                    {userPermissions.canManage && (
                        <IconButton 
                            onClick={() => handleOpenDialog(row)} 
                            size="small"
                            disabled={isMaskedValue(row.baseSalary)}
                        >
                            <EditIcon />
                        </IconButton>
                    )}
                    {userPermissions.canManage && (
                        <IconButton 
                            onClick={() => {
                                setSelectedSalary(row);
                                setOpenConfirm(true);
                            }} 
                            size="small"
                            color="error"
                            disabled={isMaskedValue(row.baseSalary)}
                        >
                            <DeleteIcon />
                        </IconButton>
                    )}
                    {row._debugInfo && (
                        <Tooltip title={`Debug Info: ${JSON.stringify(row._debugInfo)}`}>
                            <IconButton size="small" color="info">
                                <VisibilityIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            )
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    Salary Management
                </Typography>
                {userPermissions.canManage && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        New Salary Record
                    </Button>
                )}
            </Box>

            {/* Security and Permission Alerts */}
            {userPermissions.role === 'admin' && !userPermissions.canView && (
                <Alert 
                    severity="info" 
                    icon={<SecurityIcon />}
                    sx={{ mb: 3 }}
                >
                    <Typography variant="body2">
                        <strong>Admin Debug Mode:</strong> You are viewing salary records for debugging purposes only. 
                        All salary values are encrypted and displayed as masked values (***) for security. 
                        Only HR and Finance Manager roles can view actual salary amounts.
                    </Typography>
                </Alert>
            )}

            {!userPermissions.canView && !userPermissions.canManage && userPermissions.role !== 'admin' && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                        You do not have permission to access salary data. Contact your administrator if you need access.
                    </Typography>
                </Alert>
            )}

            {userPermissions.canView && (
                <Alert 
                    severity="success" 
                    icon={<VisibilityIcon />}
                    sx={{ mb: 3 }}
                >
                    <Typography variant="body2">
                        <strong>Secure Access:</strong> Salary data is encrypted in the database and decrypted only for authorized users. 
                        {userPermissions.canManage ? ' You have full access to view and manage salary records.' : ' You have read-only access to salary data.'}
                    </Typography>
                </Alert>
            )}

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="primary">
                                {salaries.filter(s => s.status === 'active').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Active Salaries
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="warning.main">
                                {salaries.filter(s => s.status === 'pending').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Pending Approval
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="info.main">
                                {userPermissions.canView 
                                    ? formatEGP(salaries.reduce((sum, s) => sum + (parseFloat(s.grossSalary) || 0), 0))
                                    : '*** EGP'
                                }
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Payroll
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="success.main">
                                {userPermissions.canView && salaries.length > 0 
                                    ? formatEGP(salaries.reduce((sum, s) => sum + (parseFloat(s.grossSalary) || 0), 0) / salaries.length)
                                    : '*** EGP'
                                }
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Average Salary
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <DataTable
                columns={columns}
                data={salaries}
                loading={loading}
            />

            {/* Create/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedSalary ? 'Edit Salary' : 'Create New Salary'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    select
                                    label="Employee"
                                    value={formData.employee}
                                    onChange={(e) => setFormData(prev => ({ ...prev, employee: e.target.value }))}
                                    fullWidth
                                    required
                                >
                                    {users.map((user) => (
                                        <MenuItem key={user._id} value={user._id}>
                                            {user.firstName} {user.lastName} ({user.employeeId}) - {user.role}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="number"
                                    label="Base Salary (EGP)"
                                    value={formData.baseSalary}
                                    onChange={(e) => setFormData(prev => ({ ...prev, baseSalary: e.target.value }))}
                                    fullWidth
                                    required
                                    inputProps={{ min: 0, step: 0.01 }}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="date"
                                    label="Effective Date"
                                    value={formData.effectiveDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                                    fullWidth
                                    required
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="h6" sx={{ mb: 2 }}>Allowances</Typography>
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="number"
                                    label="Housing Allowance (EGP)"
                                    value={formData.allowances.housing}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        allowances: { ...prev.allowances, housing: e.target.value }
                                    }))}
                                    fullWidth
                                    inputProps={{ min: 0, step: 0.01 }}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="number"
                                    label="Transportation Allowance (EGP)"
                                    value={formData.allowances.transportation}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        allowances: { ...prev.allowances, transportation: e.target.value }
                                    }))}
                                    fullWidth
                                    inputProps={{ min: 0, step: 0.01 }}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="number"
                                    label="Medical Allowance (EGP)"
                                    value={formData.allowances.medical}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        allowances: { ...prev.allowances, medical: e.target.value }
                                    }))}
                                    fullWidth
                                    inputProps={{ min: 0, step: 0.01 }}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="number"
                                    label="Food Allowance (EGP)"
                                    value={formData.allowances.food}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        allowances: { ...prev.allowances, food: e.target.value }
                                    }))}
                                    fullWidth
                                    inputProps={{ min: 0, step: 0.01 }}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="number"
                                    label="Other Allowance (EGP)"
                                    value={formData.allowances.other}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        allowances: { ...prev.allowances, other: e.target.value }
                                    }))}
                                    fullWidth
                                    inputProps={{ min: 0, step: 0.01 }}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Gross Salary (Calculated)"
                                    value={formatEGP(calculateGrossSalary())}
                                    disabled
                                    fullWidth
                                    sx={{ bgcolor: 'action.hover' }}
                                />
                            </Grid>
                            
                            <Grid item xs={12}>
                                <TextField
                                    label="Notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    fullWidth
                                    multiline
                                    rows={3}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedSalary ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Salary History Dialog */}
            <Dialog open={openHistoryDialog} onClose={() => setOpenHistoryDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Salary History - {selectedEmployee?.firstName} {selectedEmployee?.lastName}
                </DialogTitle>
                <DialogContent>
                    <List>
                        {salaryHistory.map((salary, index) => (
                            <React.Fragment key={salary._id}>
                                <ListItem>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body1" fontWeight="bold" component="span">
                                                    {formatEGP(salary.grossSalary)}
                                                </Typography>
                                                <Chip
                                                    label={salary.status?.toUpperCase()}
                                                    color={getStatusColor(salary.status)}
                                                    size="small"
                                                />
                                            </Box>
                                        }
                                        secondary={
                                            <Box component="span">
                                                <Typography variant="body2" component="span" display="block">
                                                    Base: {formatEGP(salary.baseSalary)} | Effective: {new Date(salary.effectiveDate).toLocaleDateString()}
                                                </Typography>
                                                {salary.notes && (
                                                    <Typography variant="caption" color="text.secondary" component="span" display="block">
                                                        Notes: {salary.notes}
                                                    </Typography>
                                                )}
                                            </Box>
                                        }
                                        primaryTypographyProps={{ component: 'div' }}
                                        secondaryTypographyProps={{ component: 'div' }}
                                    />
                                </ListItem>
                                {index < salaryHistory.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenHistoryDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={openConfirm}
                onClose={() => setOpenConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Salary Record"
                message="Are you sure you want to delete this salary record? This action cannot be undone."
            />
        </Box>
    );
};

export default SalaryManagementPage;