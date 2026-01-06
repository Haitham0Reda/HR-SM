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
    MenuItem,
    Grid,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    Alert
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import payrollService from '../../services/payroll.service';
import salaryService from '../../services/salary.service';
import userService from '../../services/user.service';

const PayrollPage = () => {
    const [payrolls, setPayrolls] = useState([]);
    const [users, setUsers] = useState([]);
    const [employeeSalaries, setEmployeeSalaries] = useState({});
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openViewDialog, setOpenViewDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState(null);
    const [userPermissions, setUserPermissions] = useState({
        canCreate: false,
        canViewAll: false,
        role: 'employee'
    });
    const [formData, setFormData] = useState({
        employee: '',
        period: '',
        deductions: [],
        totalDeductions: 0
    });
    const { showNotification } = useNotification();
    const { user } = useAuth();

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
        fetchEmployeeSalaries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPayrolls = async () => {
        try {
            setLoading(true);
            const response = await payrollService.getAll();
            console.log('Fetched payroll response:', response); // Debug log
            
            // Handle new response format: { success: true, payrolls: [...], userPermissions: {...} }
            const payrollsData = response.payrolls || response.data || response || [];
            const permissions = response.userPermissions || { canCreate: false, canViewAll: false, role: 'employee' };
            
            console.log('Payrolls data:', payrollsData); // Debug log
            console.log('User permissions:', permissions); // Debug log
            
            setPayrolls(payrollsData);
            setUserPermissions(permissions);
            
            // Show info message based on role
            if (permissions.role === 'finance-manager') {
                showNotification('You can create payroll records and see only the ones you created.', 'info');
            } else if (permissions.role === 'finance') {
                showNotification('You have read-only access to all payroll records.', 'info');
            } else if (['hr', 'admin'].includes(permissions.role)) {
                showNotification('You have full access to view all payroll records.', 'info');
            }
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

    const fetchEmployeeSalaries = async () => {
        try {
            const response = await salaryService.getAll();
            const salariesData = response.salaries || response.data || response || [];
            
            // Create a map of employee ID to current salary
            const salaryMap = {};
            salariesData.forEach(salary => {
                if (salary.status === 'active' && salary.employee?._id) {
                    salaryMap[salary.employee._id] = salary.grossSalary || 0;
                }
            });
            
            setEmployeeSalaries(salaryMap);
        } catch (error) {
            console.error('Error fetching employee salaries:', error);
            setEmployeeSalaries({});
        }
    };

    const getBaseSalaryByRole = (role) => {
        // Egyptian Pound (EGP) salaries - realistic amounts
        const salaries = {
            'admin': 15000,      // 15,000 EGP (~$485 USD)
            'hr': 12000,         // 12,000 EGP (~$388 USD)
            'manager': 18000,    // 18,000 EGP (~$582 USD)
            'employee': 8000     // 8,000 EGP (~$259 USD)
        };
        return salaries[role] || 8000; // Default 8,000 EGP
    };

    const getEmployeeSalary = (employeeId, role) => {
        // First try to get actual salary from salary management system
        const actualSalary = employeeSalaries[employeeId];
        if (actualSalary && actualSalary > 0) {
            return actualSalary;
        }
        
        // Fallback to role-based salary if no salary record exists
        return getBaseSalaryByRole(role);
    };

    // Helper function to format Egyptian currency with English numbers
    const formatEGP = (amount) => {
        const num = parseFloat(amount) || 0;
        return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
    };

    const calculateTotalDeductions = (deductions) => {
        console.log('🔍 CALC - Calculating total for deductions:', deductions);
        
        const total = deductions.reduce((sum, deduction, index) => {
            const amount = parseFloat(deduction.amount) || 0;
            console.log(`🔍 CALC - Deduction ${index}: type=${deduction.type}, amount=${deduction.amount}, parsed=${amount}`);
            return sum + amount;
        }, 0);
        
        console.log('🔍 CALC - Raw total:', total);
        
        // Ensure the result is a reasonable number for Egyptian currency
        const finalTotal = Math.max(0, Math.min(total, 50000)); // Cap at 50,000 EGP
        console.log('🔍 CALC - Final total after cap:', finalTotal);
        
        return finalTotal;
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
        
        // Validate and parse amount field
        if (field === 'amount') {
            // Parse the value and ensure it's a reasonable number
            const numValue = parseFloat(value) || 0;
            // Cap amount at reasonable maximum for Egyptian currency (10,000 EGP per deduction)
            const validAmount = Math.max(0, Math.min(numValue, 10000));
            updatedDeductions[index] = { ...updatedDeductions[index], [field]: validAmount };
            
            console.log('🔍 DEDUCTION - Amount changed:', value, 'parsed:', numValue, 'valid:', validAmount);
        } else {
            updatedDeductions[index] = { ...updatedDeductions[index], [field]: value };
        }
        
        // Update Arabic name when type changes
        if (field === 'type') {
            const deductionType = deductionTypes.find(dt => dt.value === value);
            updatedDeductions[index].arabicName = deductionType?.arabicName || '';
        }
        
        const newTotal = calculateTotalDeductions(updatedDeductions);
        console.log('🔍 DEDUCTION - New total calculated:', newTotal);
        
        setFormData(prev => ({
            ...prev,
            deductions: updatedDeductions,
            totalDeductions: newTotal
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

            console.log('Submitting payroll data:', submitData); // Debug log

            if (selectedPayroll) {
                const response = await payrollService.update(selectedPayroll._id, submitData);
                console.log('Update response:', response); // Debug log
                showNotification('Payroll updated successfully', 'success');
            } else {
                const response = await payrollService.create(submitData);
                console.log('Create response:', response); // Debug log
                showNotification('Payroll created successfully', 'success');
            }
            handleCloseDialog();
            fetchPayrolls();
        } catch (error) {
            console.error('Submit error:', error); // Debug log
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Operation failed';
            showNotification(errorMessage, 'error');
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
            id: 'createdBy',
            label: 'Created By',
            render: (row) => {
                if (row.createdBy) {
                    return `${row.createdBy.firstName || ''} ${row.createdBy.lastName || ''}`.trim() || row.createdBy.email;
                }
                return 'N/A';
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
            render: (row) => {
                const total = parseFloat(row.totalDeductions) || 0;
                return formatEGP(total);
            }
        },
        {
            id: 'netSalary',
            label: 'Net Salary',
            render: (row) => {
                const employeeId = row.employee?._id;
                const role = row.employee?.role;
                const baseSalary = getEmployeeSalary(employeeId, role);
                const totalDeductions = parseFloat(row.totalDeductions) || 0;
                const netSalary = baseSalary - totalDeductions;
                
                return (
                    <Typography fontWeight="bold" color="primary">
                        {formatEGP(netSalary)}
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
                    {row._permissions?.canEdit && (
                        <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(row)}
                            color="primary"
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    )}
                    {row._permissions?.canDelete && (
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
                    )}
                </Box>
            )
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Payroll Management</Typography>
                {userPermissions.canCreate && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        New Payroll Record
                    </Button>
                )}
            </Box>

            {/* Role-based information alerts */}
            {userPermissions.role === 'finance-manager' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    As a Finance Manager, you can create payroll records and see only the ones you created.
                </Alert>
            )}
            {userPermissions.role === 'finance' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    You have read-only access to all payroll records.
                </Alert>
            )}
            {userPermissions.role === 'admin' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Admin access: You can view payroll records for debugging purposes only.
                </Alert>
            )}

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
                                            <Grid size={{ xs: 12, sm: 3 }}>
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
                                            <Grid size={{ xs: 12, sm: 3 }}>
                                                <TextField
                                                    label="Arabic Name"
                                                    value={deduction.arabicName}
                                                    onChange={(e) => handleDeductionChange(index, 'arabicName', e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 3 }}>
                                                <TextField
                                                    type="number"
                                                    label="Amount (EGP)"
                                                    value={deduction.amount || ''}
                                                    onChange={(e) => handleDeductionChange(index, 'amount', e.target.value)}
                                                    inputProps={{ 
                                                        min: 0, 
                                                        max: 10000,
                                                        step: 0.01
                                                    }}
                                                    fullWidth
                                                    size="small"
                                                    helperText="Max 10,000 EGP"
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 3 }}>
                                                <Button
                                                    onClick={() => handleRemoveDeduction(index)}
                                                    color="error"
                                                    size="small"
                                                    fullWidth
                                                >
                                                    Remove
                                                </Button>
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
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
                            value={formatEGP(formData.totalDeductions)}
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
                                Total Deductions: {formatEGP(selectedPayroll.totalDeductions)}
                            </Typography>
                            
                            <Typography variant="h6" sx={{ mt: 1 }}>
                                Net Salary: {formatEGP(getEmployeeSalary(selectedPayroll.employee?._id, selectedPayroll.employee?.role) - parseFloat(selectedPayroll.totalDeductions || 0))}
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
