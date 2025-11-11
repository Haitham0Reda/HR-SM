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
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import resignedService from '../../services/resigned.service';
import userService from '../../services/user.service';

const ResignedPage = () => {
    const [resignedEmployees, setResignedEmployees] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [formData, setFormData] = useState({
        user: '',
        resignationDate: new Date().toISOString().split('T')[0],
        lastWorkingDay: '',
        reason: '',
        exitInterview: false,
        clearanceStatus: 'pending',
        notes: ''
    });
    const { showNotification } = useNotification();

    const clearanceStatuses = ['pending', 'in-progress', 'completed'];
    const resignationReasons = [
        'Better Opportunity',
        'Personal Reasons',
        'Relocation',
        'Career Change',
        'Health Issues',
        'Retirement',
        'Other'
    ];

    useEffect(() => {
        fetchResignedEmployees();
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchResignedEmployees = async () => {
        try {
            setLoading(true);
            const data = await resignedService.getAll();
            setResignedEmployees(data);
        } catch (error) {
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
            console.error('Failed to fetch users:', error);
        }
    };

    const handleOpenDialog = (employee = null) => {
        if (employee) {
            setSelectedEmployee(employee);
            setFormData({
                user: employee.user?._id || employee.user || '',
                resignationDate: employee.resignationDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                lastWorkingDay: employee.lastWorkingDay?.split('T')[0] || '',
                reason: employee.reason || '',
                exitInterview: employee.exitInterview || false,
                clearanceStatus: employee.clearanceStatus || 'pending',
                notes: employee.notes || ''
            });
        } else {
            setSelectedEmployee(null);
            setFormData({
                user: '',
                resignationDate: new Date().toISOString().split('T')[0],
                lastWorkingDay: '',
                reason: '',
                exitInterview: false,
                clearanceStatus: 'pending',
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
            field: 'user',
            headerName: 'Employee Name',
            width: 200,
            renderCell: (params) => params.row.user?.name || 'N/A'
        },
        {
            field: 'email',
            headerName: 'Email',
            width: 200,
            renderCell: (params) => params.row.user?.email || 'N/A'
        },
        {
            field: 'department',
            headerName: 'Department',
            renderCell: (row) => row.user?.department?.name || 'N/A'
        },
        {
            field: 'resignationDate',
            headerName: 'Resignation Date',
            renderCell: (row) => new Date(row.resignationDate).toLocaleDateString()
        },
        {
            field: 'lastWorkingDay',
            headerName: 'Last Working Day',
            renderCell: (row) => row.lastWorkingDay ? new Date(row.lastWorkingDay).toLocaleDateString() : 'N/A'
        },
        {
            field: 'reason',
            headerName: 'Reason',
            renderCell: (row) => row.reason || 'N/A'
        },
        {
            field: 'exitInterview',
            headerName: 'Exit Interview',
            renderCell: (row) => (
                <Chip
                    label={row.exitInterview ? 'Completed' : 'Pending'}
                    color={row.exitInterview ? 'success' : 'default'}
                    size="small"
                />
            )
        },
        {
            field: 'clearanceStatus',
            headerName: 'Clearance',
            width: 130,
            renderCell: (params) => (
                <Chip
                    label={params.row.clearanceStatus}
                    color={getClearanceColor(params.row.clearanceStatus)}
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
                            setSelectedEmployee(params.row);
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
                <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="h4" color="primary.contrastText">{resignedEmployees.length}</Typography>
                        <Typography variant="body2" color="primary.contrastText">Total Resigned</Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.contrastText">
                            {resignedEmployees.filter(e => e.clearanceStatus === 'pending').length}
                        </Typography>
                        <Typography variant="body2" color="warning.contrastText">Pending Clearance</Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="h4" color="info.contrastText">
                            {resignedEmployees.filter(e => !e.exitInterview).length}
                        </Typography>
                        <Typography variant="body2" color="info.contrastText">Exit Interview Pending</Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="h4" color="success.contrastText">
                            {resignedEmployees.filter(e => e.clearanceStatus === 'completed').length}
                        </Typography>
                        <Typography variant="body2" color="success.contrastText">Clearance Completed</Typography>
                    </Box>
                </Grid>
            </Grid>

            <DataTable
                rows={resignedEmployees}
                columns={columns}
                getRowId={(row) => row._id}
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
                                    type="date"
                                    label="Resignation Date"
                                    name="resignationDate"
                                    value={formData.resignationDate}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    type="date"
                                    label="Last Working Day"
                                    name="lastWorkingDay"
                                    value={formData.lastWorkingDay}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                        <TextField
                            select
                            label="Reason for Resignation"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {resignationReasons.map((reason) => (
                                <MenuItem key={reason} value={reason}>
                                    {reason}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Exit Interview"
                            name="exitInterview"
                            value={formData.exitInterview}
                            onChange={(e) => setFormData(prev => ({ ...prev, exitInterview: e.target.value === 'true' }))}
                            fullWidth
                        >
                            <MenuItem value="true">Completed</MenuItem>
                            <MenuItem value="false">Pending</MenuItem>
                        </TextField>
                        <TextField
                            select
                            label="Clearance Status"
                            name="clearanceStatus"
                            value={formData.clearanceStatus}
                            onChange={handleChange}
                            fullWidth
                        >
                            {clearanceStatuses.map((status) => (
                                <MenuItem key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </MenuItem>
                            ))}
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
