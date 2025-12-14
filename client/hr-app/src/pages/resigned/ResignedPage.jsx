import { useState, useEffect } from 'react';
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
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import resignedService from '../../services/resigned.service';
import userService from '../../services/user.service';
import api from '../../services/api';

const ResignedPage = () => {
    const [resignedEmployees, setResignedEmployees] = useState([]);
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [formData, setFormData] = useState({
        employee: '',
        department: '',
        position: '',
        resignationDate: new Date().toISOString().split('T')[0],
        lastWorkingDay: '',
        resignationReason: '',
        exitInterview: { conducted: false },
        notes: ''
    });
    const { showNotification } = useNotification();


    const resignationReasons = [
        { value: 'better-opportunity', label: 'Better Opportunity' },
        { value: 'personal-reasons', label: 'Personal Reasons' },
        { value: 'relocation', label: 'Relocation' },
        { value: 'career-change', label: 'Career Change' },
        { value: 'health-issues', label: 'Health Issues' },
        { value: 'family-reasons', label: 'Family Reasons' },
        { value: 'retirement', label: 'Retirement' },
        { value: 'termination', label: 'Termination' },
        { value: 'other', label: 'Other' }
    ];

    useEffect(() => {
        fetchResignedEmployees();
        fetchUsers();
        fetchDepartments();
        fetchPositions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchResignedEmployees = async () => {
        try {
            setLoading(true);
            const data = await resignedService.getAll();
            console.log('Fetched resigned employees data:', data); // Debug log
            
            // Handle different response formats
            let employees = [];
            if (Array.isArray(data)) {
                employees = data;
            } else if (data && Array.isArray(data.data)) {
                employees = data.data;
            } else if (data && Array.isArray(data.resignedEmployees)) {
                employees = data.resignedEmployees;
            }
            
            setResignedEmployees(employees);
        } catch (error) {
            console.error('Error fetching resigned employees:', error); // Debug log
            showNotification('Failed to fetch resigned employees', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await userService.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchDepartments = async () => {
        try {
            const data = await api.get('/departments');
            setDepartments(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchPositions = async () => {
        try {
            const data = await api.get('/positions');
            setPositions(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            console.error('Error fetching positions:', error);
        }
    };

    const handleOpenDialog = (employee = null) => {
        if (employee) {
            setSelectedEmployee(employee);
            setFormData({
                employee: employee.employee?._id || employee.employee || employee.user?._id || employee.user || '',
                department: employee.department?._id || employee.department || '',
                position: employee.position?._id || employee.position || '',
                resignationDate: employee.resignationDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                lastWorkingDay: employee.lastWorkingDay?.split('T')[0] || '',
                resignationReason: employee.resignationReason || employee.reason || '',
                exitInterview: employee.exitInterview || { conducted: false },
                notes: employee.notes || ''
            });
        } else {
            setSelectedEmployee(null);
            setFormData({
                employee: '',
                department: '',
                position: '',
                resignationDate: new Date().toISOString().split('T')[0],
                lastWorkingDay: '',
                resignationReason: '',
                exitInterview: { conducted: false },
                notes: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedEmployee(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (selectedEmployee) {
                await resignedService.update(selectedEmployee._id, formData);
                showNotification('Record updated successfully', 'success');
            } else {
                await resignedService.create(formData);
                showNotification('Resignation record created successfully', 'success');
            }
            handleCloseDialog();
            fetchResignedEmployees();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await resignedService.delete(selectedEmployee._id);
            showNotification('Record deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedEmployee(null);
            fetchResignedEmployees();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const getClearanceColor = (status) => {
        const colors = {
            pending: 'warning',
            'in-progress': 'info',
            completed: 'success'
        };
        return colors[status] || 'default';
    };

    const columns = [
        {
            id: 'employee',
            label: 'Employee Name',
            render: (row) => row.employee?.personalInfo?.fullName || row.employee?.username || row.user?.name || 'N/A'
        },
        {
            id: 'email',
            label: 'Email',
            render: (row) => row.employee?.email || row.user?.email || 'N/A'
        },
        {
            id: 'department',
            label: 'Department',
            render: (row) => row.department?.name || row.user?.department?.name || 'N/A'
        },
        {
            id: 'resignationDate',
            label: 'Resignation Date',
            render: (row) => row.resignationDate ? new Date(row.resignationDate).toLocaleDateString() : 'N/A'
        },
        {
            id: 'lastWorkingDay',
            label: 'Last Working Day',
            render: (row) => row.lastWorkingDay ? new Date(row.lastWorkingDay).toLocaleDateString() : 'N/A'
        },
        {
            id: 'reason',
            label: 'Reason',
            render: (row) => row.resignationReason || row.reason || 'N/A'
        },
        {
            id: 'exitInterview',
            label: 'Exit Interview',
            render: (row) => (
                <Chip
                    label={row.exitInterview?.conducted ? 'Completed' : 'Pending'}
                    color={row.exitInterview?.conducted ? 'success' : 'default'}
                    size="small"
                />
            )
        },
        {
            id: 'clearanceStatus',
            label: 'Clearance',
            render: (row) => {
                const clearance = row.clearance || {};
                const hrCleared = clearance.hr?.cleared || false;
                const financeCleared = clearance.finance?.cleared || false;
                const itCleared = clearance.it?.cleared || false;
                
                const totalCleared = [hrCleared, financeCleared, itCleared].filter(Boolean).length;
                const status = totalCleared === 3 ? 'completed' : totalCleared > 0 ? 'in-progress' : 'pending';
                
                return (
                    <Chip
                        label={`${totalCleared}/3 Cleared`}
                        color={getClearanceColor(status)}
                        size="small"
                    />
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
                        onClick={() => handleOpenDialog(row)}
                        color="primary"
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => {
                            setSelectedEmployee(row);
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
                <Typography variant="h4">Resigned Employees</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add Resignation Record
                </Button>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="h4" color="primary.contrastText">{resignedEmployees.length}</Typography>
                        <Typography variant="body2" color="primary.contrastText">Total Resigned</Typography>
                    </Box>
                </Grid>
                <Grid xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.contrastText">
                            {resignedEmployees.filter(e => {
                                const clearance = e.clearance || {};
                                const hrCleared = clearance.hr?.cleared || false;
                                const financeCleared = clearance.finance?.cleared || false;
                                const itCleared = clearance.it?.cleared || false;
                                const totalCleared = [hrCleared, financeCleared, itCleared].filter(Boolean).length;
                                return totalCleared === 0;
                            }).length}
                        </Typography>
                        <Typography variant="body2" color="warning.contrastText">Pending Clearance</Typography>
                    </Box>
                </Grid>
                <Grid xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="h4" color="info.contrastText">
                            {resignedEmployees.filter(e => !e.exitInterview?.conducted).length}
                        </Typography>
                        <Typography variant="body2" color="info.contrastText">Exit Interview Pending</Typography>
                    </Box>
                </Grid>
                <Grid xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="h4" color="success.contrastText">
                            {resignedEmployees.filter(e => {
                                const clearance = e.clearance || {};
                                const hrCleared = clearance.hr?.cleared || false;
                                const financeCleared = clearance.finance?.cleared || false;
                                const itCleared = clearance.it?.cleared || false;
                                const totalCleared = [hrCleared, financeCleared, itCleared].filter(Boolean).length;
                                return totalCleared === 3;
                            }).length}
                        </Typography>
                        <Typography variant="body2" color="success.contrastText">Clearance Completed</Typography>
                    </Box>
                </Grid>
            </Grid>

            <DataTable
                data={resignedEmployees}
                columns={columns}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedEmployee ? 'Edit Resignation Record' : 'Add Resignation Record'}
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
                            {users.map((user) => (
                                <MenuItem key={user._id} value={user._id}>
                                    {user.name || user.username} - {user.email}
                                </MenuItem>
                            ))}
                        </TextField>
                        
                        <Grid container spacing={2}>
                            <Grid xs={6}>
                                <TextField
                                    select
                                    label="Department"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                >
                                    {departments.map((dept) => (
                                        <MenuItem key={dept._id} value={dept._id}>
                                            {dept.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid xs={6}>
                                <TextField
                                    select
                                    label="Position"
                                    name="position"
                                    value={formData.position}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                >
                                    {positions.map((pos) => (
                                        <MenuItem key={pos._id} value={pos._id}>
                                            {pos.title || pos.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid xs={6}>
                                <TextField
                                    type="date"
                                    label="Resignation Date"
                                    name="resignationDate"
                                    value={formData.resignationDate}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                            </Grid>
                            <Grid xs={6}>
                                <TextField
                                    type="date"
                                    label="Last Working Day"
                                    name="lastWorkingDay"
                                    value={formData.lastWorkingDay}
                                    onChange={handleChange}
                                    fullWidth
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                            </Grid>
                        </Grid>
                        <TextField
                            select
                            label="Reason for Resignation"
                            name="resignationReason"
                            value={formData.resignationReason}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {resignationReasons.map((reason) => (
                                <MenuItem key={reason.value} value={reason.value}>
                                    {reason.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Exit Interview"
                            name="exitInterview"
                            value={formData.exitInterview.conducted}
                            onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                exitInterview: { 
                                    ...prev.exitInterview, 
                                    conducted: e.target.value === 'true' 
                                } 
                            }))}
                            fullWidth
                        >
                            <MenuItem value="true">Completed</MenuItem>
                            <MenuItem value="false">Pending</MenuItem>
                        </TextField>

                        <TextField
                            label="Notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            multiline
                            rows={4}
                            fullWidth
                            placeholder="Additional information about the resignation..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedEmployee ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Resignation Record"
                message="Are you sure you want to delete this resignation record?"
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedEmployee(null);
                }}
            />
        </Box>
    );
};

export default ResignedPage;
