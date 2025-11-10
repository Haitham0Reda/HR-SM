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
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CheckCircle, Cancel } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import leaveService from '../../services/leave.service';
import userService from '../../services/user.service';

const LeavesPage = () => {
    const [leaves, setLeaves] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [formData, setFormData] = useState({
        user: '',
        type: 'annual',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
        status: 'pending'
    });
    const { showNotification } = useNotification();

    const leaveTypes = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid', 'other'];
    const statuses = ['pending', 'approved', 'rejected', 'cancelled'];

    useEffect(() => {
        fetchLeaves();
        fetchUsers();
    }, []);

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            const data = await leaveService.getAll();
            setLeaves(data);
        } catch (error) {
            showNotification('Failed to fetch leave requests', 'error');
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

    const handleOpenDialog = (leave = null) => {
        if (leave) {
            setSelectedLeave(leave);
            setFormData({
                user: leave.user?._id || leave.user || '',
                type: leave.type || 'annual',
                startDate: leave.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                endDate: leave.endDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                reason: leave.reason || '',
                status: leave.status || 'pending'
            });
        } else {
            setSelectedLeave(null);
            setFormData({
                user: '',
                type: 'annual',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                reason: '',
                status: 'pending'
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedLeave(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (selectedLeave) {
                await leaveService.update(selectedLeave._id, formData);
                showNotification('Leave request updated successfully', 'success');
            } else {
                await leaveService.create(formData);
                showNotification('Leave request created successfully', 'success');
            }
            handleCloseDialog();
            fetchLeaves();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await leaveService.delete(selectedLeave._id);
            showNotification('Leave request deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedLeave(null);
            fetchLeaves();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleApprove = async (leaveId) => {
        try {
            await leaveService.approve(leaveId);
            showNotification('Leave request approved', 'success');
            fetchLeaves();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleReject = async (leaveId) => {
        try {
            await leaveService.reject(leaveId);
            showNotification('Leave request rejected', 'success');
            fetchLeaves();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'warning',
            approved: 'success',
            rejected: 'error',
            cancelled: 'default'
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
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params) => (
                <Chip label={params.row.type} size="small" variant="outlined" />
            )
        },
        {
            field: 'startDate',
            headerName: 'Start Date',
            width: 120,
            renderCell: (params) => new Date(params.row.startDate).toLocaleDateString()
        },
        {
            field: 'endDate',
            headerName: 'End Date',
            width: 120,
            renderCell: (params) => new Date(params.row.endDate).toLocaleDateString()
        },
        {
            field: 'days',
            headerName: 'Days',
            width: 80,
            renderCell: (params) => {
                const start = new Date(params.row.startDate);
                const end = new Date(params.row.endDate);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                return days;
            }
        },
        { field: 'reason', headerName: 'Reason', width: 200 },
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
            width: 180,
            renderCell: (params) => (
                <Box>
                    {params.row.status === 'pending' && (
                        <>
                            <IconButton
                                size="small"
                                onClick={() => handleApprove(params.row._id)}
                                color="success"
                                title="Approve"
                            >
                                <CheckCircle fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => handleReject(params.row._id)}
                                color="error"
                                title="Reject"
                            >
                                <Cancel fontSize="small" />
                            </IconButton>
                        </>
                    )}
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
                            setSelectedLeave(params.row);
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
                <Typography variant="h4">Leave Requests</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    New Leave Request
                </Button>
            </Box>

            <DataTable
                rows={leaves}
                columns={columns}
                getRowId={(row) => row._id}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedLeave ? 'Edit Leave Request' : 'New Leave Request'}
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
                        <TextField
                            select
                            label="Leave Type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {leaveTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    type="date"
                                    label="Start Date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    type="date"
                                    label="End Date"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                        <TextField
                            label="Reason"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            required
                            fullWidth
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
                        {selectedLeave ? 'Update' : 'Submit'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Leave Request"
                message="Are you sure you want to delete this leave request?"
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedLeave(null);
                }}
            />
        </Box>
    );
};

export default LeavesPage;
