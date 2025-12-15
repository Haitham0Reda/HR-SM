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
    useTheme,
    Tabs,
    Tab,
    Paper
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CheckCircle, Cancel, Info, Person as PersonIcon, Group as GroupIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import forgetCheckService from '../../services/forgetCheck.service';
import userService from '../../services/user.service';

const ForgetCheckPage = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { user, isHR, isAdmin } = useAuth();
    const [forgetChecks, setForgetChecks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [currentTab, setCurrentTab] = useState(0);
    const [formData, setFormData] = useState({
        user: '',
        date: new Date().toISOString().split('T')[0],
        requestType: 'check-in',
        requestedTime: '',
        reason: ''
    });
    const { showNotification } = useNotification();

    const canManage = isHR || isAdmin;

    const requestTypes = [
        { value: 'check-in', label: 'Check In' },
        { value: 'check-out', label: 'Check Out' }
    ];

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    const fetchForgetChecks = async () => {
        try {
            setLoading(true);
            const response = await forgetCheckService.getAll();
            // Handle both direct array and API response format
            const requestsArray = Array.isArray(response) ? response : 
                                 (response?.data && Array.isArray(response.data)) ? response.data : [];
            setForgetChecks(requestsArray);
        } catch (error) {
            console.error('Error fetching forget checks:', error);
            showNotification('Failed to fetch requests', 'error');
            setForgetChecks([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            if (canManage) {
                const data = await userService.getAll();
                setUsers(data);
            }
        } catch (error) {

        }
    };

    useEffect(() => {
        fetchForgetChecks();
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOpenDialog = (request = null) => {
        if (request) {
            setSelectedRequest(request);
            setFormData({
                user: request.employee?._id || request.employee || '',
                date: request.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                requestType: request.requestType || 'check-in',
                requestedTime: request.requestedTime || '',
                reason: request.reason || ''
            });
        } else {
            setSelectedRequest(null);
            setFormData({
                user: canManage ? '' : user?._id || '',
                date: new Date().toISOString().split('T')[0],
                requestType: 'check-in',
                requestedTime: '',
                reason: ''
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
            // Validation
            if (!formData.date) {
                showNotification('Please select a date', 'error');
                return;
            }
            if (!formData.requestedTime) {
                showNotification('Please enter the requested time', 'error');
                return;
            }
            if (!formData.reason || formData.reason.trim().length < 10) {
                showNotification('Reason must be at least 10 characters', 'error');
                return;
            }

            const submitData = {
                employee: formData.user || user?._id,
                date: formData.date,
                requestType: formData.requestType,
                requestedTime: formData.requestedTime,
                reason: formData.reason.trim()
            };

            if (selectedRequest) {
                await forgetCheckService.update(selectedRequest._id, submitData);
                showNotification('Request updated successfully', 'success');
            } else {
                await forgetCheckService.create(submitData);
                showNotification('Request created successfully', 'success');
            }
            handleCloseDialog();
            fetchForgetChecks();
        } catch (error) {

            showNotification(error.response?.data?.message || error.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await forgetCheckService.delete(selectedRequest._id);
            showNotification('Request deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedRequest(null);
            fetchForgetChecks();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleApprove = async (requestId) => {
        try {
            await forgetCheckService.approve(requestId);
            showNotification('Request approved', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchForgetChecks();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleReject = async (requestId) => {
        const reason = prompt('Please provide a reason for rejection (minimum 10 characters):');
        if (reason === null) return;

        const trimmedReason = reason.trim();
        if (!trimmedReason || trimmedReason.length < 10) {
            showNotification('Rejection reason must be at least 10 characters long', 'error');
            return;
        }

        try {
            await forgetCheckService.reject(requestId, trimmedReason);
            showNotification('Request rejected', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchForgetChecks();
        } catch (error) {

            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: theme.palette.warning.main,
            approved: theme.palette.success.main,
            rejected: theme.palette.error.main
        };
        return colors[status] || theme.palette.grey[500];
    };

    const getRequestTypeColor = (type) => {
        return type === 'check-in' ? theme.palette.info.main : theme.palette.secondary.main;
    };

    const columns = [
        // Only show employee column in "All Users" tab (tab 1) and if user can manage
        ...(currentTab === 1 && canManage ? [{
            id: 'employee',
            label: 'Employee',
            align: 'center',
            render: (row) => row.employee?.personalInfo?.fullName || row.employee?.username || 'N/A'
        }] : []),
        {
            id: 'date',
            label: 'Date',
            align: 'center',
            render: (row) => new Date(row.date).toLocaleDateString()
        },
        {
            id: 'requestType',
            label: 'Type',
            align: 'center',
            render: (row) => (
                <Chip
                    label={row.requestType === 'check-in' ? 'Check In' : 'Check Out'}
                    size="small"
                    sx={{
                        bgcolor: row.requestType === 'check-in' ? theme.palette.info.main : theme.palette.secondary.main,
                        color: theme.palette.getContrastText(row.requestType === 'check-in' ? theme.palette.info.main : theme.palette.secondary.main),
                        fontWeight: 600
                    }}
                />
            )
        },
        {
            id: 'requestedTime',
            label: 'Requested Time',
            align: 'center',
            render: (row) => {
                if (!row.requestedTime) return 'N/A';
                const [hours, minutes] = row.requestedTime.split(':');
                const hour = parseInt(hours);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                return `${displayHour}:${minutes} ${ampm}`;
            }
        },
        {
            id: 'reason',
            label: 'Reason',
            align: 'center',
            render: (row) => row.reason || '-'
        },
        {
            id: 'status',
            label: 'Status',
            align: 'center',
            render: (row) => {
                const statusColor = getStatusColor(row.status);
                return (
                    <Chip
                        label={row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        size="small"
                        sx={{
                            bgcolor: statusColor,
                            color: theme.palette.getContrastText(statusColor),
                            fontWeight: 600
                        }}
                    />
                );
            }
        },
        {
            id: 'actions',
            label: 'Actions',
            align: 'center',
            render: (row) => {
                const isPending = row.status === 'pending';
                const showApproveReject = canManage && isPending;

                return (
                    <Box>
                        {showApproveReject && (
                            <>
                                <IconButton
                                    size="small"
                                    onClick={() => handleApprove(row._id)}
                                    color="success"
                                    title="Approve"
                                >
                                    <CheckCircle fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => handleReject(row._id)}
                                    color="error"
                                    title="Reject"
                                >
                                    <Cancel fontSize="small" />
                                </IconButton>
                            </>
                        )}
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
                                setSelectedRequest(row);
                                setOpenConfirm(true);
                            }}
                            color="error"
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                );
            }
        }
    ];

    // Filter data based on current tab
    const getFilteredData = () => {
        if (currentTab === 0) {
            // My Forget Check - show only current user's requests
            return forgetChecks.filter(request => {
                const employeeId = request.employee?._id || request.employee;
                return employeeId === user?._id;
            });
        } else {
            // All Users Forget Check - show all requests (only for HR/Admin)
            return canManage ? forgetChecks : [];
        }
    };

    const filteredData = getFilteredData();

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4">Forget Check Requests</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage forget check requests for missed check-ins and check-outs
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate(getCompanyRoute('/forget-checks/create'))}
                >
                    New Request
                </Button>
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: 2 }}>
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {
                            minHeight: 48,
                            textTransform: 'none',
                        },
                    }}
                >
                    <Tab
                        icon={<PersonIcon fontSize="small" />}
                        iconPosition="start"
                        label="My Forget Check"
                    />
                    {canManage && (
                        <Tab
                            icon={<GroupIcon fontSize="small" />}
                            iconPosition="start"
                            label="All Users Forget Check"
                        />
                    )}
                </Tabs>
            </Paper>

            {/* Tab Content */}
            <Box>
                {currentTab === 0 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            📋 My Forget Check Requests ({filteredData.length})
                        </Typography>
                        <DataTable
                            data={filteredData}
                            columns={columns}
                            emptyMessage="No requests found. Click 'New Request' to create one."
                        />
                    </Box>
                )}

                {currentTab === 1 && canManage && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            👥 All Users Forget Check Requests ({filteredData.length})
                        </Typography>
                        <DataTable
                            data={filteredData}
                            columns={columns}
                            emptyMessage="No forget check requests found from any employees."
                        />
                    </Box>
                )}

                {currentTab === 1 && !canManage && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="h6" color="error.main">
                            Access Denied
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            You don't have permission to view all users' forget check requests.
                        </Typography>
                    </Box>
                )}
            </Box>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedRequest ? 'Edit Request' : 'New Request'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        {canManage && (
                            <TextField
                                select
                                label="Employee"
                                name="user"
                                value={formData.user}
                                onChange={handleChange}
                                required
                                fullWidth
                            >
                                {users.map((u) => (
                                    <MenuItem key={u._id} value={u._id}>
                                        {u.name} - {u.email}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
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
                        <TextField
                            select
                            label="Request Type"
                            name="requestType"
                            value={formData.requestType}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {requestTypes.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Box>
                            <TextField
                                type="time"
                                label="Requested Time *"
                                name="requestedTime"
                                value={formData.requestedTime}
                                onChange={handleChange}
                                required
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                                Enter the time you arrived (for check in) or left (for check out).
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: 'warning.main', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Info sx={{ fontSize: '1rem' }} /> Working hours: 09:00 AM - 03:30 PM
                            </Typography>
                        </Box>
                        <TextField
                            label="Reason"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            required
                            fullWidth
                            placeholder="Provide a detailed reason (minimum 10 characters)"
                            helperText={`${formData.reason.length}/500 characters (minimum 10)`}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedRequest ? 'Update' : 'Create'}
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

export default ForgetCheckPage;
