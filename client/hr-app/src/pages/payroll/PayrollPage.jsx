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
    ListItemText
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import payrollService from '../../services/payroll.service';
import userService from '../../services/user.service';

const PayrollPage = () => {
    const [payrolls, setPayrolls] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openViewDialog, setOpenViewDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState(null);
    const [formData, setFormData] = useState({
        employee: '',
        period: '',
        deductions: [],
        totalDeductions: 0
    });
    const { showNotification } = useNotification();

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const deductionTypes = [
        { value: 'tax', label: 'Tax', arabicName: 'ضريبة الدخل' },
        { value: 'insurance', label: 'Insurance', arabicName: 'التأمين الصحي' },
        { value: 'loan', label: 'Loan', arabicName: 'قرض شخصي' },
        { value: 'absence', label: 'Absence', arabicName: 'غياب' },
        { value: 'medical', label: 'Medical', arabicName: 'مصاريف طبية' },
        { value: 'transportation', label: 'Transportation', arabicName: 'بدل المواصلات' },
        { value: 'mobile-bill', label: 'Mobile Bill', arabicName: 'فاتورة الهاتف' },
        { value: 'disciplinary-sanctions', label: 'Disciplinary Sanctions', arabicName: 'جزاءات تأديبية' },
        { value: 'other', label: 'Other', arabicName: 'أخرى' }
    ];

    useEffect(() => {
        fetchPayrolls();
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPayrolls = async () => {
        try {
            setLoading(true);
            const data = await payrollService.getAll();
            console.log('Fetched payroll data:', data); // Debug log
            setPayrolls(data);
        } catch (error) {
            console.error('Error fetching payrolls:', error); // Debug log
            showNotification('Failed to fetch payroll records', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await userService.getAll();
            // Handle both array response and object with data property
            const usersArray = Array.isArray(data) ? data : (data?.data || []);
            setUsers(usersArray);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]); // Set empty array on error to prevent map error
        }
    };

    const getBaseSalaryByRole = (role) => {
        const salaries = {
            'admin': 8000,
            'hr': 6000,
            'manager': 7000,
            'employee': 4500
        };
        return salaries[role] || 4000;
    };

    const calculateTotalDeductions = (deductions) => {
        return deductions.reduce((sum, deduction) => sum + (parseFloat(deduction.amount) || 0), 0);
    };

    const handleOpenDialog = (payroll = null) => {
        if (payroll) {
            setSelectedPayroll(payroll);
            setFormData({
                employee: payroll.employee?._id || payroll.employee || '',
                period: payroll.period || '',
                deductions: payroll.deductions || [],
                totalDeductions: payroll.totalDeductions || 0
            });
        } else {
            setSelectedPayroll(null);
            const currentDate = new Date();
            const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            setFormData({
                employee: '',
                period: currentPeriod,
                deductions: [],
                totalDeductions: 0
            });
        }
        setOpenDialog(true);
    };

    const handleViewPayroll = (payroll) => {
        setSelectedPayroll(payroll);
        setOpenViewDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setOpenViewDialog(false);
        setSelectedPayroll(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddDeduction = () => {
        const newDeduction = {
            type: 'tax',
            arabicName: 'ضريبة الدخل',
            description: '',
            amount: 0
        };
        const updatedDeductions = [...formData.deductions, newDeduction];
        setFormData(prev => ({
            ...prev,
            deductions: updatedDeductions,
            totalDeductions: calculateTotalDeductions(updatedDeductions)
        }));
    };

    const handleDeductionChange = (index, field, value) => {
        const updatedDeductions = [...formData.deductions];
        updatedDeductions[index] = { ...updatedDeductions[index], [field]: value };
        
        // Update Arabic name when type changes
        if (field === 'type') {
            const deductionType = deductionTypes.find(dt => dt.value === value);
            updatedDeductions[index].arabicName = deductionType?.arabicName || '';
        }
        
        setFormData(prev => ({
            ...prev,
            deductions: updatedDeductions,
            totalDeductions: calculateTotalDeductions(updatedDeductions)
        }));
    };

    const handleRemoveDeduction = (index) => {
        const updatedDeductions = formData.deductions.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev,
            deductions: updatedDeductions,
            totalDeductions: calculateTotalDeductions(updatedDeductions)
        }));
    };

    const handleSubmit = async () => {
        try {
            const submitData = {
                employee: formData.employee,
                period: formData.period,
                deductions: formData.deductions,
                totalDeductions: formData.totalDeductions
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

    const columns = [
        {
            id: 'employee',
            label: 'Employee',
            render: (row) => {
                const employee = row.employee;
                return employee?.name || employee?.email?.split('@')[0] || 'N/A';
            }
        },
        {
            id: 'period',
            label: 'Period',
            render: (row) => {
                const [year, month] = row.period.split('-');
                const monthName = months[parseInt(month) - 1];
                return `${monthName} ${year}`;
            }
        },
        {
            id: 'deductionsCount',
            label: 'Deductions',
            render: (row) => `${row.deductions?.length || 0} items`
        },
        {
            id: 'totalDeductions',
            label: 'Total Deductions',
            render: (row) => `$${row.totalDeductions?.toFixed(2) || '0.00'}`
        },
        {
            id: 'netSalary',
            label: 'Net Salary',
            render: (row) => {
                const role = row.employee?.role;
                const baseSalary = getBaseSalaryByRole(role);
                const netSalary = baseSalary - (row.totalDeductions || 0);
                return (
                    <Typography fontWeight="bold" color="primary">
                        ${netSalary.toFixed(2)}
                    </Typography>
                );
            }
        },
        {
            id: 'actions',
            label: 'Actions',
            sortable: false,
            render: (row) => (
                <Box>
                    <IconButton
                        size="small"
                        onClick={() => handleViewPayroll(row)}
                        color="info"
                    >
                        <ViewIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(row)}
                        color="primary"
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => {
                            setSelectedPayroll(row);
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
                <Typography variant="h4">Payroll Management</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    New Payroll Record
                </Button>
            </Box>

            <DataTable
                data={payrolls}
                columns={columns}
            />

            {/* Create/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedPayroll ? 'Edit Payroll Record' : 'New Payroll Record'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            select
                            label="Employee"
                            name="employee"
                            value={formData.employee}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {Array.isArray(users) && users.map((user) => (
                                <MenuItem key={user._id} value={user._id}>
                                    {user.name || user.email} - {user.role}
                                </MenuItem>
                            ))}
                        </TextField>
                        
                        <TextField
                            type="month"
                            label="Period"
                            name="period"
                            value={formData.period}
                            onChange={handleChange}
                            required
                            fullWidth
                        />

                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">Deductions</Typography>
                                <Button onClick={handleAddDeduction} variant="outlined" size="small">
                                    Add Deduction
                                </Button>
                            </Box>
                            
                            {formData.deductions.map((deduction, index) => (
                                <Card key={index} sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={3}>
                                                <TextField
                                                    select
                                                    label="Type"
                                                    value={deduction.type}
                                                    onChange={(e) => handleDeductionChange(index, 'type', e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                >
                                                    {deductionTypes.map((type) => (
                                                        <MenuItem key={type.value} value={type.value}>
                                                            {type.label}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>
                                            <Grid item xs={12} sm={3}>
                                                <TextField
                                                    label="Arabic Name"
                                                    value={deduction.arabicName}
                                                    onChange={(e) => handleDeductionChange(index, 'arabicName', e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={3}>
                                                <TextField
                                                    type="number"
                                                    label="Amount"
                                                    value={deduction.amount}
                                                    onChange={(e) => handleDeductionChange(index, 'amount', e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                    inputProps={{ step: '0.01', min: '0' }}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={3}>
                                                <Button
                                                    onClick={() => handleRemoveDeduction(index)}
                                                    color="error"
                                                    size="small"
                                                    fullWidth
                                                >
                                                    Remove
                                                </Button>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <TextField
                                                    label="Description"
                                                    value={deduction.description}
                                                    onChange={(e) => handleDeductionChange(index, 'description', e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                    multiline
                                                    rows={2}
                                                />
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>

                        <TextField
                            label="Total Deductions"
                            value={`$${formData.totalDeductions.toFixed(2)}`}
                            disabled
                            fullWidth
                            sx={{ bgcolor: 'action.hover' }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedPayroll ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={openViewDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Payroll Details</DialogTitle>
                <DialogContent>
                    {selectedPayroll && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                {selectedPayroll.employee?.name || selectedPayroll.employee?.email}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Period: {(() => {
                                    const [year, month] = selectedPayroll.period.split('-');
                                    return `${months[parseInt(month) - 1]} ${year}`;
                                })()}
                            </Typography>
                            
                            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                                Deductions:
                            </Typography>
                            <List>
                                {selectedPayroll.deductions?.map((deduction, index) => (
                                    <ListItem key={index}>
                                        <ListItemText
                                            primary={`${deduction.type} - $${deduction.amount}`}
                                            secondary={`${deduction.arabicName} - ${deduction.description}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                            
                            <Typography variant="h6" sx={{ mt: 2 }}>
                                Total Deductions: ${selectedPayroll.totalDeductions?.toFixed(2)}
                            </Typography>
                            
                            <Typography variant="h6" sx={{ mt: 1 }}>
                                Net Salary: ${(getBaseSalaryByRole(selectedPayroll.employee?.role) - selectedPayroll.totalDeductions).toFixed(2)}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Close</Button>
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
