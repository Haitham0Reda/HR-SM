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
import { useAuth } from '../../context/AuthContext';
import attendanceService from '../../services/attendance.service';
import userService from '../../services/user.service';

const AttendancePage = () => {
    const { user, isHR, isAdmin } = useAuth();
    const [attendances, setAttendances] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [formData, setFormData] = useState({
        employee: '',
        date: new Date().toISOString().split('T')[0],
        checkIn: '',
        checkOut: '',
        status: 'present',
        notes: ''
    });
    const { showNotification } = useNotification();

    // Check if user can manage attendance (HR/Admin)
    const canManage = isHR || isAdmin;

    const statuses = ['present', 'absent', 'late', 'half-day', 'work-from-home'];

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchAttendances();
        fetchUsers();
    }, []);

    const fetchAttendances = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.getAll();

            // Filter to show only current user's attendance if not HR/Admin
            const filteredData = canManage
                ? data
                : data.filter(att => att.employee?._id === user?._id || att.employee === user?._id);

            setAttendances(filteredData);
        } catch (error) {
            showNotification('Failed to fetch attendance records', 'error');
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

    const handleOpenDialog = (attendance = null) => {
        if (attendance) {
            setSelectedAttendance(attendance);
            setFormData({
                employee: attendance.employee?._id || attendance.employee || '',
                date: attendance.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                checkIn: attendance.checkIn || '',
                checkOut: attendance.checkOut || '',
                status: attendance.status || 'present',
                notes: attendance.notes || ''
            });
        } else {
            setSelectedAttendance(null);
            setFormData({
                employee: '',
                date: new Date().toISOString().split('T')[0],
                checkIn: '',
                checkOut: '',
                status: 'present',
                notes: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedAttendance(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (selectedAttendance) {
                await attendanceService.update(selectedAttendance._id, formData);
                showNotification('Attendance updated successfully', 'success');
            } else {
                await attendanceService.create(formData);
                showNotification('Attendance recorded successfully', 'success');
            }
            handleCloseDialog();
            fetchAttendances();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await attendanceService.delete(selectedAttendance._id);
            showNotification('Attendance record deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedAttendance(null);
            fetchAttendances();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            present: 'success',
            absent: 'error',
            late: 'warning',
            'half-day': 'info',
            'work-from-home': 'primary'
        };
        return colors[status] || 'default';
    };

    const columns = [
        // Only show employee column if user can manage (HR/Admin)
        ...(canManage ? [{
            field: 'employee',
            headerName: 'Employee',
            renderCell: (row) => row.employee?.name || 'N/A'
        }] : []),
        {
            field: 'date',
            headerName: 'Date',
            renderCell: (row) => new Date(row.date).toLocaleDateString()
        },
        { field: 'checkIn', headerName: 'Check In' },
        { field: 'checkOut', headerName: 'Check Out' },
        {
            field: 'status',
            headerName: 'Status',
            renderCell: (row) => (
                <Chip
                    label={row.status}
                    color={getStatusColor(row.status)}
                    size="small"
                />
            )
        },
        { field: 'notes', headerName: 'Notes', width: 200 },
        // Only show actions if user can manage (HR/Admin)
        ...(canManage ? [{
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
                            setSelectedAttendance(params.row);
                            setOpenConfirm(true);
                        }}
                        color="error"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            )
        }] : [])
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">
                    {canManage ? 'Attendance Management' : 'My Attendance'}
                </Typography>
                {canManage && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Record Attendance
                    </Button>
                )}
            </Box>

            <DataTable
                rows={attendances}
                columns={columns}
                getRowId={(row) => row._id}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedAttendance ? 'Edit Attendance' : 'Record Attendance'}
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
                                    {user.name} - {user.email}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            type="date"
                            label="Date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    type="time"
                                    label="Check In"
                                    name="checkIn"
                                    value={formData.checkIn}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    type="time"
                                    label="Check Out"
                                    name="checkOut"
                                    value={formData.checkOut}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                        <TextField
                            select
                            label="Status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {statuses.map((status) => (
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
                            rows={3}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedAttendance ? 'Update' : 'Record'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Attendance Record"
                message="Are you sure you want to delete this attendance record?"
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedAttendance(null);
                }}
            />
        </Box>
    );
};

export default AttendancePage;
