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
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle,
    Cancel,
    Schedule,
    ExitToApp
} from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import permissionService from '../../services/permission.service';
import userService from '../../services/user.service';

const PermissionsPage = () => {
    const { user, isHR, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [permissions, setPermissions] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState(null);
    const [formData, setFormData] = useState({
        user: '',
        type: 'late-arrival',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        reason: '',
        status: 'pending'
    });
    const { showNotification } = useNotification();

    // Check if user can manage permissions (HR/Admin)
    const canManage = isHR || isAdmin;

    const permissionTypes = [
        { value: 'late-arrival', label: 'Late Arrival', icon: <Schedule />, color: '#FFA500' },
        { value: 'early-departure', label: 'Early Departure', icon: <ExitToApp />, color: '#FF6B6B' }
    ];
    const statuses = ['pending', 'approved', 'rejected', 'cancelled'];

    useEffect(() => {
        fetchPermissions();
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPermissions = async () => {
        try {
            setLoading(true);
            const data = await permissionService.getAll();
            console.log('Fetched permissions:', data);

            // Filter out overtime requests - only show late-arrival and early-departure
            let filteredData = Array.isArray(data)
                ? data.filter(permission =>
                    permission.permissionType !== 'overtime' &&
                    permission.type !== 'overtime'
                )
                : [];

            // Filter to show only current user's permissions if not HR/Admin
            if (!canManage) {
                filteredData = filteredData.filter(permission => {
                    const permissionUserId = permission.employee?._id || permission.employee;
                    const currentUserId = user?._id;
                    return permissionUserId === currentUserId || String(permissionUserId) === String(currentUserId);
                });
            }

            setPermissions(filteredData);
        } catch (error) {
            console.error('Error fetching permissions:', error);
            showNotification(typeof error === 'string' ? error : 'Failed to fetch permission requests', 'error');
            setPermissions([]);
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
                user: permission.employee?._id || permission.employee || '',
                type: permission.permissionType || permission.type || 'late-arrival',
                date: permission.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                startTime: permission.time?.scheduled || permission.startTime || '',
                endTime: permission.time?.requested || permission.endTime || '',
                reason: permission.reason || '',
                status: permission.status || 'pending'
            });
            setOpenDialog(true);
        } else {
            // Navigate to create page instead of opening dialog
            navigate('/app/permissions/create');
        }
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
            console.log('Submitting form data:', formData);
            if (selectedPermission) {
                await permissionService.update(selectedPermission._id, formData);
                showNotification('Permission request updated successfully', 'success');
            } else {
                await permissionService.create(formData);
                showNotification('Permission request created successfully', 'success');

                // Trigger notification refresh for HR/Admin (with small delay)
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('notificationUpdate'));
                }, 500);
            }
            handleCloseDialog();
            fetchPermissions();
        } catch (error) {
            console.error('Submit error:', error);
            showNotification(typeof error === 'string' ? error : 'Operation failed', 'error');
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
            field: 'employee',
            headerName: 'Employee',
            align: 'center',
            renderCell: (row) => row.employee?.name || 'N/A'
        },
        {
            field: 'type',
            headerName: 'Type',
            align: 'center',
            renderCell: (row) => {
                const type = row.permissionType || row.type || '';
                return (
                    <Chip
                        label={type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        size="small"
                        variant="outlined"
                        color="primary"
                    />
                );
            }
        },
        {
            field: 'date',
            headerName: 'Date',
            align: 'center',
            renderCell: (row) => new Date(row.date).toLocaleDateString()
        },
        {
            field: 'startTime',
            headerName: 'Start Time',
            align: 'center',
            renderCell: (row) => row.time?.scheduled || row.startTime || 'N/A'
        },
        {
            field: 'endTime',
            headerName: 'End Time',
            width: 100,
            align: 'center',
            renderCell: (row) => row.time?.requested || row.endTime || 'N/A'
        },
        { field: 'reason', headerName: 'Reason', width: 200, align: 'center' },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            align: 'center',
            renderCell: (row) => (
                <Chip
                    label={row.status}
                    color={getStatusColor(row.status)}
                    size="small"
                />
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 200,
            align: 'center',
            renderCell: (row) => (
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {row.status === 'pending' && canManage && (
                        <>
                            <IconButton
                                size="small"
                                onClick={() => handleApprove(row._id)}
                                color="success"
                                title="Approve"
                                sx={{
                                    '&:hover': {
                                        backgroundColor: 'success.light',
                                        color: 'success.contrastText'
                                    }
                                }}
                            >
                                <CheckCircle fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => handleReject(row._id)}
                                color="error"
                                title="Reject"
                                sx={{
                                    '&:hover': {
                                        backgroundColor: 'error.light',
                                        color: 'error.contrastText'
                                    }
                                }}
                            >
                                <Cancel fontSize="small" />
                            </IconButton>
                        </>
                    )}
                    <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(row)}
                        color="primary"
                        title="Edit"
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => {
                            setSelectedPermission(row);
                            setOpenConfirm(true);
                        }}
                        color="error"
                        title="Delete"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            )
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{
            p: { xs: 2, sm: 3 },
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    Permission Requests
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/app/permissions/create')}
                >
                    New Permission Request
                </Button>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0 }}>
                <DataTable
                    data={permissions}
                    columns={columns}
                    emptyMessage="No permission requests found. Click 'New Permission Request' to create one."
                />
            </Box>

            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#f5f7fa',
                        color: '#2c3e50',
                        borderRadius: 2
                    }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: 'white',
                    borderBottom: '1px solid #e0e0e0'
                }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                        {selectedPermission ? 'Edit Permission Request' : 'View Permission Request'}
                    </Typography>
                    <IconButton onClick={handleCloseDialog} size="small">
                        <Cancel />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3, bgcolor: '#f5f7fa' }}>
                    <Box sx={{
                        display: 'flex',
                        gap: 3,
                        flexDirection: { xs: 'column', md: 'row' },
                        mt: 0.5
                    }}>
                        {/* Form Section */}
                        <Box sx={{
                            flex: '1 1 58%',
                            minWidth: 0
                        }}>
                            <Box sx={{
                                bgcolor: 'white',
                                borderRadius: 2,
                                p: 3,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: '1px solid #e0e0e0',
                                height: '100%'
                            }}>
                                <Typography variant="h6" sx={{ color: '#3498db', mb: 2.5, fontWeight: 600 }}>
                                    Permission Details
                                </Typography>
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2.5,
                                    '& .MuiTextField-root': {
                                        '& .MuiInputLabel-root': {
                                            color: '#7f8c8d',
                                            '&.Mui-focused': {
                                                color: '#3498db',
                                            }
                                        },
                                        '& .MuiOutlinedInput-root': {
                                            color: '#2c3e50',
                                            bgcolor: 'white',
                                            '& fieldset': {
                                                borderColor: '#d1d8e0',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: '#95a5a6',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#3498db',
                                            },
                                        },
                                        '& .MuiInputBase-input': {
                                            color: '#2c3e50',
                                        },
                                        '& .MuiFormHelperText-root': {
                                            color: '#7f8c8d',
                                        },
                                        '& .MuiSelect-icon': {
                                            color: '#7f8c8d',
                                        }
                                    }
                                }}>
                                    {/* Only show employee selector for HR/Admin when editing */}
                                    {canManage && selectedPermission && (
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
                                    )}
                                    <TextField
                                        type="date"
                                        label="Date *"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        required
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        helperText="Select the date for which you need permission."
                                    />

                                    <TextField
                                        select
                                        label="Permission Type *"
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                        required
                                        fullWidth>
                                        <MenuItem value="">-- Select Type --</MenuItem>
                                        {permissionTypes.map((type) => (
                                            <MenuItem key={type.value} value={type.value}>
                                                {type.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>

                                    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                                        <TextField
                                            type="time"
                                            label="Expected Time *"
                                            name="startTime"
                                            value={formData.startTime}
                                            onChange={handleChange}
                                            fullWidth
                                            InputLabelProps={{ shrink: true }}
                                            helperText="This field is automatically set based on working hours."
                                        />
                                        <TextField
                                            type="time"
                                            label="Actual Time *"
                                            name="endTime"
                                            value={formData.endTime}
                                            onChange={handleChange}
                                            fullWidth
                                            InputLabelProps={{ shrink: true }}
                                            placeholder="--:-- --"
                                        />
                                    </Box>

                                    <TextField
                                        label="Reason *"
                                        name="reason"
                                        value={formData.reason}
                                        onChange={handleChange}
                                        multiline
                                        rows={4}
                                        required
                                        fullWidth
                                        placeholder="Please provide a detailed reason for your request."
                                        helperText="Please provide a detailed reason for your request."
                                    />
                                    {/* Only show status selector for HR/Admin */}
                                    {canManage && (
                                        <TextField
                                            select
                                            label="Status"
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            fullWidth>
                                            {statuses.map((status) => (
                                                <MenuItem key={status} value={status}>
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}


                                </Box>
                            </Box>
                        </Box>

                        {/* Information Sidebar */}
                        <Box sx={{
                            flex: '1 1 42%',
                            minWidth: 0
                        }}>
                            <Box sx={{
                                bgcolor: 'white',
                                borderRadius: 2,
                                p: 3,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: '1px solid #e0e0e0',
                                height: '100%'
                            }}>
                                <Typography variant="h6" sx={{ color: '#3498db', mb: 3, fontWeight: 600 }}>
                                    Information
                                </Typography>

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#2c3e50' }}>
                                        Working Hours
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                                        09:00 - 15:30
                                    </Typography>
                                </Box>

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#2c3e50' }}>
                                        Late Arrival
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#7f8c8d', lineHeight: 1.6 }}>
                                        Use this option if you arrived after 09:00. The expected time should be 09:00 and the actual time should be when you actually arrived.
                                    </Typography>
                                </Box>

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#2c3e50' }}>
                                        Early Departure
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#7f8c8d', lineHeight: 1.6 }}>
                                        Use this option if you left before 15:30. The expected time should be 15:30 and the actual time should be when you actually left.
                                    </Typography>
                                </Box>

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#2c3e50' }}>
                                        Permission Limits
                                    </Typography>
                                    <Box component="ul" sx={{ pl: 2, m: 0, color: '#7f8c8d' }}>
                                        <li><strong>Daily Limit:</strong> 2 hours</li>
                                        <li><strong>Monthly Limit:</strong> 4 hours</li>
                                    </Box>
                                </Box>

                                <Typography variant="caption" sx={{ color: '#95a5a6', display: 'block', mt: 2 }}>
                                    HR Month: Day 20 to Day 19
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions sx={{
                    p: 2.5,
                    bgcolor: 'white',
                    borderTop: '1px solid #e0e0e0',
                    gap: 1.5
                }}>
                    <Button
                        onClick={handleCloseDialog}
                        variant="outlined"
                        sx={{
                            color: '#7f8c8d',
                            borderColor: '#d1d8e0',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            '&:hover': {
                                borderColor: '#95a5a6',
                                bgcolor: 'rgba(127, 140, 141, 0.05)'
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        startIcon={<CheckCircle />}
                        sx={{
                            bgcolor: '#3498db',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            '&:hover': {
                                bgcolor: '#2980b9'
                            }
                        }}
                    >
                        Update Request
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Permission Request"
                message="Are you sure you want to delete this permission request? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                confirmColor="error"
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedPermission(null);
                }}
            />
        </Box >
    );
};

export default PermissionsPage;
