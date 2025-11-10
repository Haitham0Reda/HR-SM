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
    ExitToApp,
    Schedule,
    Home,
    Computer,
    MoreHoriz,
    CalendarToday,
    AccessTime
} from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import permissionService from '../../services/permission.service';
import userService from '../../services/user.service';

const PermissionsPage = () => {
    const { user, isHR, isAdmin } = useAuth();
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
        { value: 'early-departure', label: 'Early Departure', icon: <ExitToApp />, color: '#FF6B6B' },
        { value: 'overtime', label: 'Overtime', icon: <AccessTime />, color: '#667eea' }
    ];
    const statuses = ['pending', 'approved', 'rejected', 'cancelled'];

    useEffect(() => {
        fetchPermissions();
        fetchUsers();
    }, []);

    const fetchPermissions = async () => {
        try {
            setLoading(true);
            const data = await permissionService.getAll();
            console.log('Fetched permissions:', data);
            setPermissions(Array.isArray(data) ? data : []);
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
        } else {
            setSelectedPermission(null);
            setFormData({
                user: user?._id || '', // Automatically set to logged-in user
                type: 'late-arrival',
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
            renderCell: (params) => params.row.time?.requested || params.row.endTime || 'N/A'
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
            width: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {params.row.status === 'pending' && (
                        <>
                            <IconButton
                                size="small"
                                onClick={() => handleApprove(params.row._id)}
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
                                onClick={() => handleReject(params.row._id)}
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
                        onClick={() => handleOpenDialog(params.row)}
                        color="primary"
                        title="Edit"
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
                    rows={permissions}
                    columns={columns}
                    getRowId={(row) => row._id}
                />
            </Box>

            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
                TransitionProps={{
                    timeout: 400
                }}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxHeight: '90vh',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                        overflow: 'hidden',
                        animation: 'slideUp 0.4s ease-out',
                        '@keyframes slideUp': {
                            '0%': {
                                opacity: 0,
                                transform: 'translateY(30px) scale(0.95)'
                            },
                            '100%': {
                                opacity: 1,
                                transform: 'translateY(0) scale(1)'
                            }
                        }
                    }
                }}
            >
                <DialogTitle sx={{
                    pb: 2.5,
                    pt: 3,
                    px: 3,
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderBottom: 'none',
                    position: 'relative',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.3) 100%)',
                        animation: 'shimmer 2s infinite',
                        '@keyframes shimmer': {
                            '0%': { transform: 'translateX(-100%)' },
                            '100%': { transform: 'translateX(100%)' }
                        }
                    }
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {selectedPermission ? (
                            <>
                                <EditIcon sx={{ fontSize: '1.8rem' }} />
                                <span>Edit Permission Request</span>
                            </>
                        ) : (
                            <>
                                <AddIcon sx={{ fontSize: '1.8rem' }} />
                                <span>New Permission Request</span>
                            </>
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 4, pb: 3, px: 3 }}>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        '& .MuiTextField-root': {
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                                },
                                '&.Mui-focused': {
                                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
                                }
                            },
                            '& .MuiInputLabel-root': {
                                fontWeight: 500
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
                        <Box sx={{ mt: canManage && selectedPermission ? 0 : 2 }}>
                            <Typography variant="caption" sx={{
                                display: 'block',
                                mb: 1.5,
                                color: 'text.secondary',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                fontSize: '0.7rem'

                            }}>
                                📋 Request Details
                            </Typography>
                            <TextField
                                select
                                label="Permission Type"
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                required
                                fullWidth
                                helperText="Select the type of permission you need"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: 'background.paper',
                                        fontWeight: 500
                                    }
                                }}
                            >
                                {permissionTypes.map((type) => (
                                    <MenuItem
                                        key={type.value}
                                        value={type.value}
                                        sx={{
                                            display: 'flex',
                                            gap: 1.5,
                                            py: 1.5,
                                            '&:hover': {
                                                bgcolor: `${type.color}15`
                                            }
                                        }}
                                    >
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            color: type.color
                                        }}>
                                            {type.icon}
                                            <span style={{ color: 'inherit' }}>{type.label}</span>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{
                                display: 'block',
                                mb: 1.5,
                                color: 'text.secondary',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                fontSize: '0.7rem'
                            }}>
                                📅 Schedule
                            </Typography>
                            <TextField
                                type="date"
                                label="Date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                required
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                InputProps={{
                                    startAdornment: (
                                        <CalendarToday sx={{ mr: 1, color: 'primary.main', fontSize: '1.2rem' }} />
                                    )
                                }}
                                helperText="Select the date for this permission"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: 'background.paper',
                                        fontWeight: 500
                                    }
                                }}
                            />
                        </Box>
                        <Box sx={{
                            p: 3,
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                            borderRadius: 2.5,
                            border: '2px solid',
                            borderColor: 'primary.light',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '4px',
                                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                            }
                        }}>
                            <Typography variant="subtitle2" sx={{
                                mb: 2,
                                fontWeight: 700,
                                color: 'primary.main',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                fontSize: '0.95rem'
                            }}>
                                <AccessTime sx={{ fontSize: '1.3rem' }} />
                                Time Period
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        type="time"
                                        label="Start Time"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'white'
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        type="time"
                                        label="End Time"
                                        name="endTime"
                                        value={formData.endTime}
                                        onChange={handleChange}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'white'
                                            }
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{
                                display: 'block',
                                mb: 1.5,
                                color: 'text.secondary',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                fontSize: '0.7rem'
                            }}>
                                💬 Justification
                            </Typography>
                            <TextField
                                label="Reason"
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                multiline
                                rows={4}
                                required
                                fullWidth
                                placeholder="Please provide a detailed reason for your permission request..."
                                helperText={`${formData.reason.length} characters - Explain why you need this permission`}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        alignItems: 'flex-start',
                                        bgcolor: 'background.paper',
                                        '& textarea': {
                                            lineHeight: 1.6,
                                            fontSize: '0.95rem'
                                        }
                                    },
                                    '& .MuiFormHelperText-root': {
                                        color: formData.reason.length < 10 ? 'error.main' : 'text.secondary'
                                    }
                                }}
                            />
                        </Box>
                        {/* Only show status selector for HR/Admin */}
                        {canManage && (
                            <Box sx={{
                                p: 2.5,
                                bgcolor: 'warning.lighter',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'warning.light'
                            }}>
                                <Typography variant="caption" sx={{
                                    display: 'block',
                                    mb: 1.5,
                                    color: 'warning.dark',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    fontSize: '0.7rem'
                                }}>
                                    ⚙️ Admin Controls
                                </Typography>
                                <TextField
                                    select
                                    label="Status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    fullWidth
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: 'white'
                                        }
                                    }}
                                >
                                    {statuses.map((status) => (
                                        <MenuItem key={status} value={status}>
                                            <Chip
                                                label={status.charAt(0).toUpperCase() + status.slice(1)}
                                                color={getStatusColor(status)}
                                                size="small"
                                            />
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{
                    px: 3,
                    py: 3,
                    gap: 2,
                    borderTop: '2px solid',
                    borderColor: 'divider',
                    bgcolor: 'grey.50',
                    justifyContent: 'flex-end'
                }}>
                    <Button
                        onClick={handleCloseDialog}
                        variant="outlined"
                        sx={{
                            minWidth: 140,
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 2,
                            py: 1.2,
                            borderWidth: 2,
                            '&:hover': {
                                borderWidth: 2,
                                bgcolor: 'action.hover'
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        sx={{
                            minWidth: 140,
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: 2,
                            py: 1.2,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                                boxShadow: '0 6px 16px rgba(102, 126, 234, 0.5)',
                                transform: 'translateY(-1px)'
                            },
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {selectedPermission ? '✓ Update Request' : '✓ Submit Request'}
                    </Button>
                </DialogActions>
            </Dialog >

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
