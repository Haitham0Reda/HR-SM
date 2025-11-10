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
    MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CheckCircle, Cancel } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import requestService from '../../services/request.service';
import userService from '../../services/user.service';

const RequestsPage = () => {
    const [requests, setRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [formData, setFormData] = useState({
        user: '',
        type: 'certificate',
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending'
    });
    const { showNotification } = useNotification();

    const requestTypes = ['certificate', 'document', 'salary-advance', 'equipment', 'training', 'transfer', 'other'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const statuses = ['pending', 'in-progress', 'approved', 'rejected', 'completed', 'cancelled'];

    useEffect(() => {
        fetchRequests();
        fetchUsers();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await requestService.getAll();
            setRequests(data);
        } catch (error) {
            showNotification('Failed to fetch requests', 'error');
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

    const handleOpenDialog = (request = null) => {
        if (request) {
            setSelectedRequest(request);
            setFormData({
                user: request.user?._id || request.user || '',
                type: request.type || 'certificate',
                title: request.title || '',
                description: request.description || '',
                priority: request.priority || 'medium',
                status: request.status || 'pending'
            });
        } else {
            setSelectedRequest(null);
            setFormData({
                user: '',
                type: 'certificate',
                title: '',
                description: '',
                priority: 'medium',
                status: 'pending'
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedRequest(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            if (selectedRequest) {
                await requestService.update(selectedRequest._id, formData);
                showNotification('Request updated successfully', 'success');
            } else {
                await requestService.create(formData);
                showNotification('Request created successfully', 'success');
            }
            handleCloseDialog();
            fetchRequests();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await requestService.delete(selectedRequest._id);
            showNotification('Request deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedRequest(null);
            fetchRequests();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleApprove = async (requestId) => {
        try {
            await requestService.approve(requestId);
            showNotification('Request approved', 'success');
            fetchRequests();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleReject = async (requestId) => {
        try {
            await requestService.reject(requestId);
            showNotification('Request rejected', 'success');
            fetchRequests();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'warning',
            'in-progress': 'info',
            approved: 'success',
            rejected: 'error',
            completed: 'success',
            cancelled: 'default'
        };
        return colors[status] || 'default';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            low: 'default',
            medium: 'info',
            high: 'warning',
            urgent: 'error'
        };
        return colors[priority] || 'default';
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
            width: 140,
            renderCell: (params) => (
                <Chip label={params.row.type} size="small" variant="outlined" />
            )
        },
        { field: 'title', headerName: 'Title', width: 200 },
        { field: 'description', headerName: 'Description', width: 250 },
        {
            field: 'priority',
            headerName: 'Priority',
            width: 100,
            renderCell: (params) => (
                <Chip
                    label={params.row.priority}
                    color={getPriorityColor(params.row.priority)}
                    size="small"
                />
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
                            setSelectedRequest(params.row);
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
                <Typography variant="h4">Requests</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    New Request
                </Button>
            </Box>

            <DataTable
                rows={requests}
                columns={columns}
                getRowId={(row) => row._id}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedRequest ? 'Edit Request' : 'New Request'}
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
                            label="Request Type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {requestTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            multiline
                            rows={4}
                            required
                            fullWidth
                        />
                        <TextField
                            select
                            label="Priority"
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            fullWidth
                        >
                            {priorities.map((priority) => (
                                <MenuItem key={priority} value={priority}>
                                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                </MenuItem>
                            ))}
                        </TextField>
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
                                    {status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedRequest ? 'Update' : 'Submit'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Request"
                message="Are you sure you want to delete this request?"
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedRequest(null);
                }}
            />
        </Box>
    );
};

export default RequestsPage;
