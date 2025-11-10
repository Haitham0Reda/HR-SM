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
import permissionService from '../../services/permission.service';
import userService from '../../services/user.service';

const PermissionsPage = () => {
    const [permissions, setPermissions] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState(null);
    const [formData, setFormData] = useState({
        user: '',
        type: 'early-leave',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        reason: '',
        status: 'pending'
    });
    const { showNotification } = useNotification();

    const permissionTypes = ['early-leave', 'late-arrival', 'work-from-home', 'remote-work', 'other'];
    const statuses = ['pending', 'approved', 'rejected', 'cancelled'];

    useEffect(() => {
        fetchPermissions();
        fetchUsers();
    }, []);

    const fetchPermissions = async () => {
        try {
            setLoading(true);
            const data = await permissionService.getAll();
            setPermissions(data);
        } catch (error) {
            showNotification('Failed to fetch permission requests', 'error');
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

    const handleOpenDialog = (permission = null) => {
        if (permission) {
            setSelectedPermission(permission);
            setFormData({
                user: permission.user?._id || permission.user || '',
                type: permission.type || 'early-leave',
                date: permission.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                startTime: permission.startTime || '',
                endTime: permission.endTime || '',
                reason: permission.reason || '',
                status: permission.status || 'pending'
            });
        } else {
            setSelectedPermission(null);
            setFormData({
                user: '',
                type: 'early-leave',
                date: new Date().toISOString().split('T')[0],
                startTime: '',
                endTime: '',
                reason: '',
                status: 'pending'
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedPermission(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (selectedPermission) {
                await permissionService.update(selectedPermission._id, formData);
                showNotification('Permission request updated successfully', 'success');
            } else {
                await permissionService.create(formData);
                showNotification('Permission request created successfully', 'success');
            }
            handleCloseDialog();
            fetchPermissions();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await permissionService.delete(selectedPermission._id);
            showNotification('Permission request deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedPermission(null);
            fetchPermissions();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleApprove = async (permissionId) => {
        try {
            await permissionService.approve(permissionId);
            showNotification('Permission request approved', 'success');
            fetchPermissions();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleReject = async (permissionId) => {
        try {
            await permissionService.reject(permissionId);
            showNotification('Permission request rejected', 'success');
            fetchPermissions();
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
            width: 150,
            renderCell: (params) => (
                <Chip label={params.row.type} size="small" variant="outlined" />
            )
        },
        {
            field: 'date',
            headerName: 'Date',
            width: 120,
            renderCell: (params) => new Date(params.row.date).toLocaleDateString()
        },
        { field: 'startTime', headerName: 'Start Time', width: 100 },
        { field: 'endTime', headerName: 'End Time', width: 100 },
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
                            setSelectedPermission(params.row);
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
                <Typography variant="h4">Permission Requests</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    New Permission Request
                </Button>
            </Box>

            <DataTable
                rows={permissions}
                columns={columns}
                getRowId={(row) => row._id}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedPermission ? 'Edit Permission Request' : 'New Permission Request'}
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
                            label="Permission Type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {permissionTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
                                    label="Start Time"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    type="time"
                                    label="End Time"
                                    name="endTime"
                                    value={formData.endTime}
                                    onChange={handleChange}
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
                        {selectedPermission ? 'Update' : 'Submit'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Permission Request"
                message="Are you sure you want to delete this permission request?"
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedPermission(null);
                }}
            />
        </Box>
    );
};

export default PermissionsPage;
