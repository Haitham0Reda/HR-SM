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
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle,
    Cancel,
    Schedule,
    ExitToApp,
    CalendarToday,
    AccessTime
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
            const filteredData = Array.isArray(data)
                ? data.filter(permission =>
                    permission.permissionType !== 'overtime' &&
                    permission.type !== 'overtime'
                )
                : [];

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
            navigate('/permissions/create');
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
            renderCell: (row) => row.employee?.name || 'N/A'
        },
        {
            field: 'type',
            headerName: 'Type',
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
            renderCell: (row) => new Date(row.date).toLocaleDateString()
        },
        {
            field: 'startTime',
            headerName: 'Start Time',
            renderCell: (row) => row.time?.scheduled || row.startTime || 'N/A'
        },
        {
            field: 'endTime',
            headerName: 'End Time',
            width: 100,
            renderCell: (row) => row.time?.requested || row.endTime || 'N/A'
        },
        { field: 'reason', headerName: 'Reason', width: 200 },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
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
                    onClick={() => handleOpenDialog()}
                    sx={{
                        minWidth: { xs: '100%', sm: 'auto' },
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        fontWeight: 600,
                        py: 1.2,
                        px: 3,
                        borderRadius: 2,
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                        textTransform: 'none',
                        fontSize: '1rem',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                            boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
                            transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.3s ease'
                    }}
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
                fullScreen
                PaperProps={{
                    sx: {
                        bgcolor: '#2c3e50',
                        color: 'white',
                    }
                }}
            >
                <Box sx={{ p: 4, minHeight: '100vh' }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
                            {selectedPermission ? 'Edit Permission Request' : 'Create Permission Request'}
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={handleCloseDialog}
                            startIcon={<Cancel />}
                            sx={{
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.3)',
                                textTransform: 'none',
                                '&:hover': {
                                    borderColor: 'white',
                                    bgcolor: 'rgba(255,255,255,0.1)'
                                }
                            }}
                        >
                            Back to Dashboard
                        </Button>
                    </Box>

                    {/* Main Content */}
                    <Grid container spacing={3}>
                        {/* Form Section */}
                        <Grid item xs={12} md={8}>
                            <Box sx={{ bgcolor: '#34495e', borderRadius: 2, p: 3 }}>
                                <Typography variant="h6" sx={{ color: '#5dade2', mb: 3, fontWeight: 600 }}>
                                    Permission Request Form
                                </Typography>
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 3,
                                    '& .MuiTextField-root': {
                                        '& .MuiInputLabel-root': {
                                            color: 'rgba(255,255,255,0.7)',
                                            '&.Mui-focused': {
                                                color: '#5dade2',
                                            }
                                        },
                                        '& .MuiOutlinedInput-root': {
                                            color: 'white',
                                            bgcolor: '#2c3e50',
                                            '& fieldset': {
                                                borderColor: 'rgba(255,255,255,0.2)',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'rgba(255,255,255,0.3)',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#5dade2',
                                            },
                                        },
                                        '& .MuiInputBase-input': {
                                            color: 'white',
                                        },
                                        '& .MuiFormHelperText-root': {
                                            color: 'rgba(255,255,255,0.5)',
                                        },
                                        '& .MuiSelect-icon': {
                                            color: 'rgba(255,255,255,0.7)',
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

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
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
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
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
                                        </Grid>
                                    </Grid>

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

                                    {/* Action Buttons */}
                                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                        <Button
                                            onClick={handleSubmit}
                                            variant="contained"
                                            size="large"
                                            startIcon={<CheckCircle />}
                                            sx={{
                                                bgcolor: '#3498db',
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                px: 4,
                                                '&:hover': {
                                                    bgcolor: '#2980b9'
                                                }
                                            }}
                                        >
                                            Submit Request
                                        </Button>
                                        <Button
                                            onClick={handleCloseDialog}
                                            variant="outlined"
                                            size="large"
                                            sx={{
                                                color: 'white',
                                                borderColor: 'rgba(255,255,255,0.3)',
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    bgcolor: 'rgba(255,255,255,0.1)'
                                                }
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Information Sidebar */}
                        <Grid item xs={12} md={4}>
                            <Box sx={{ bgcolor: '#34495e', borderRadius: 2, p: 3 }}>
                                <Typography variant="h6" sx={{ color: '#5dade2', mb: 3, fontWeight: 600 }}>
                                    Information
                                </Typography>

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                                        Working Hours
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        09:00 - 15:30
                                    </Typography>
                                </Box>

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                                        Late Arrival
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                                        Use this option if you arrived after 09:00. The expected time should be 09:00 and the actual time should be when you actually arrived.
                                    </Typography>
                                </Box>

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                                        Early Departure
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                                        Use this option if you left before 15:30. The expected time should be 15:30 and the actual time should be when you actually left.
                                    </Typography>
                                </Box>

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                                        Permission Limits
                                    </Typography>
                                    <Box component="ul" sx={{ pl: 2, m: 0, color: 'rgba(255,255,255,0.7)' }}>
                                        <li><strong>Daily Limit:</strong> 2 hours</li>
                                        <li><strong>Monthly Limit:</strong> 4 hours</li>
                                    </Box>
                                </Box>

                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 2 }}>
                                    HR Month: Day 20 to Day 19
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
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
        </Box >
    );
};

export default PermissionsPage;
