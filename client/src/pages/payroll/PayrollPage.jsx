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
    Grid
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import payrollService from '../../services/payroll.service';
import userService from '../../services/user.service';

const PayrollPage = () => {
    const [payrolls, setPayrolls] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState(null);
    const [formData, setFormData] = useState({
        user: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        basicSalary: 0,
        allowances: 0,
        deductions: 0,
        bonus: 0,
        overtime: 0,
        tax: 0,
        status: 'pending'
    });
    const { showNotification } = useNotification();

    const statuses = ['pending', 'approved', 'paid', 'cancelled'];
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        fetchPayrolls();
        fetchUsers();
    }, []);

    const fetchPayrolls = async () => {
        try {
            setLoading(true);
            const data = await payrollService.getAll();
            setPayrolls(data);
        } catch (error) {
            showNotification('Failed to fetch payroll records', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await userService.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const calculateNetSalary = (data) => {
        const gross = parseFloat(data.basicSalary || 0) +
            parseFloat(data.allowances || 0) +
            parseFloat(data.bonus || 0) +
            parseFloat(data.overtime || 0);
        const net = gross - parseFloat(data.deductions || 0) - parseFloat(data.tax || 0);
        return net.toFixed(2);
    };

    const handleOpenDialog = (payroll = null) => {
        if (payroll) {
            setSelectedPayroll(payroll);
            setFormData({
                user: payroll.user?._id || payroll.user || '',
                month: payroll.month || new Date().getMonth() + 1,
                year: payroll.year || new Date().getFullYear(),
                basicSalary: payroll.basicSalary || 0,
                allowances: payroll.allowances || 0,
                deductions: payroll.deductions || 0,
                bonus: payroll.bonus || 0,
                overtime: payroll.overtime || 0,
                tax: payroll.tax || 0,
                status: payroll.status || 'pending'
            });
        } else {
            setSelectedPayroll(null);
            setFormData({
                user: '',
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                basicSalary: 0,
                allowances: 0,
                deductions: 0,
                bonus: 0,
                overtime: 0,
                tax: 0,
                status: 'pending'
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedPayroll(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            const submitData = {
                ...formData,
                netSalary: calculateNetSalary(formData)
            };

            if (selectedPayroll) {
                await payrollService.update(selectedPayroll._id, submitData);
                showNotification('Payroll updated successfully', 'success');
            } else {
                await payrollService.create(submitData);
                showNotification('Payroll created successfully', 'success');
            }
            handleCloseDialog();
            fetchPayrolls();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await payrollService.delete(selectedPayroll._id);
            showNotification('Payroll record deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedPayroll(null);
            fetchPayrolls();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'warning',
            approved: 'info',
            paid: 'success',
            cancelled: 'error'
        };
        return colors[status] || 'default';
    };

    const columns = [
        {
            field: 'user',
            headerName: 'Employee',
            width: 180,
            renderCell: (params) => params.row.user?.name || 'N/A'
        },
        {
            field: 'period',
            headerName: 'Period',
            width: 150,
            renderCell: (params) => `${months[params.row.month - 1]} ${params.row.year}`
        },
        {
            field: 'basicSalary',
            headerName: 'Basic Salary',
            width: 120,
            renderCell: (params) => `$${parseFloat(params.row.basicSalary || 0).toFixed(2)}`
        },
        {
            field: 'allowances',
            headerName: 'Allowances',
            width: 110,
            renderCell: (params) => `$${parseFloat(params.row.allowances || 0).toFixed(2)}`
        },
        {
            field: 'deductions',
            headerName: 'Deductions',
            width: 110,
            renderCell: (params) => `$${parseFloat(params.row.deductions || 0).toFixed(2)}`
        },
        {
            field: 'netSalary',
            headerName: 'Net Salary',
            width: 120,
            renderCell: (params) => (
                <Typography fontWeight="bold" color="primary">
                    ${parseFloat(params.row.netSalary || 0).toFixed(2)}
                </Typography>
            )
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.row.status}
                    color={getStatusColor(params.row.status)}
                    size="small"
                />
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            renderCell: (params) => (
                <Box>
                    <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(params.row)}
                        color="primary"
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => {
                            setSelectedPayroll(params.row);
                            setOpenConfirm(true);
                        }}
                        color="error"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            )
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Payroll</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    New Payroll
                </Button>
            </Box>

            <DataTable
                rows={payrolls}
                columns={columns}
                getRowId={(row) => row._id}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedPayroll ? 'Edit Payroll' : 'New Payroll'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            select
                            label="Employee"
                            name="user"
                            value={formData.user}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {users.map((user) => (
                                <MenuItem key={user._id} value={user._id}>
                                    {user.name} - {user.email}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    select
                                    label="Month"
                                    name="month"
                                    value={formData.month}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                >
                                    {months.map((month, index) => (
                                        <MenuItem key={index} value={index + 1}>
                                            {month}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    type="number"
                                    label="Year"
                                    name="year"
                                    value={formData.year}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    type="number"
                                    label="Basic Salary"
                                    name="basicSalary"
                                    value={formData.basicSalary}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    inputProps={{ step: '0.01', min: '0' }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    type="number"
                                    label="Allowances"
                                    name="allowances"
                                    value={formData.allowances}
                                    onChange={handleChange}
                                    fullWidth
                                    inputProps={{ step: '0.01', min: '0' }}
                                />
                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    type="number"
                                    label="Bonus"
                                    name="bonus"
                                    value={formData.bonus}
                                    onChange={handleChange}
                                    fullWidth
                                    inputProps={{ step: '0.01', min: '0' }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    type="number"
                                    label="Overtime"
                                    name="overtime"
                                    value={formData.overtime}
                                    onChange={handleChange}
                                    fullWidth
                                    inputProps={{ step: '0.01', min: '0' }}
                                />
                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    type="number"
                                    label="Deductions"
                                    name="deductions"
                                    value={formData.deductions}
                                    onChange={handleChange}
                                    fullWidth
                                    inputProps={{ step: '0.01', min: '0' }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    type="number"
                                    label="Tax"
                                    name="tax"
                                    value={formData.tax}
                                    onChange={handleChange}
                                    fullWidth
                                    inputProps={{ step: '0.01', min: '0' }}
                                />
                            </Grid>
                        </Grid>
                        <TextField
                            label="Net Salary"
                            value={`$${calculateNetSalary(formData)}`}
                            disabled
                            fullWidth
                            sx={{ bgcolor: 'action.hover' }}
                        />
                        <TextField
                            select
                            label="Status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            fullWidth
                        >
                            {statuses.map((status) => (
                                <MenuItem key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedPayroll ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Payroll Record"
                message="Are you sure you want to delete this payroll record?"
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedPayroll(null);
                }}
            />
        </Box>
    );
};

export default PayrollPage;
