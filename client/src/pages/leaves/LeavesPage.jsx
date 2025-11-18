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
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import leaveService from '../../services/leave.service';
import userService from '../../services/user.service';

const LeavesPage = () => {
<<<<<<< HEAD
    const navigate = useNavigate();
=======
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
    const { user, isHR, isAdmin } = useAuth();
    const [leaves, setLeaves] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [formData, setFormData] = useState({
        user: '',
        type: 'mission',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
        status: 'pending',
        missionLocation: '',
        missionPurpose: ''
    });
    const { showNotification } = useNotification();

<<<<<<< HEAD
    const canManage = isHR || isAdmin;
    const isDoctor = user?.role === 'doctor';

=======
    // Only show mission and sick leave types
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
    const leaveTypes = ['mission', 'sick'];
    const statuses = ['pending', 'approved', 'rejected', 'cancelled'];

    useEffect(() => {
    }, []);

    const fetchLeaves = async () => {
        try {
            setLoading(true);
<<<<<<< HEAD
            const data = await leaveService.getAll();

            // Ensure data is an array
            const leavesArray = Array.isArray(data) ? data : [];

            console.log('Fetched leaves:', leavesArray);
            console.log('Current user ID:', user?._id);
            console.log('Can manage:', canManage);
            console.log('Is doctor:', isDoctor);

            // Filter to show only mission and sick leaves
            const missionAndSickLeaves = leavesArray.filter(leave => {
                const leaveType = leave.leaveType || leave.type;
                return leaveType === 'mission' || leaveType === 'sick';
            });

            // Apply role-based filtering
            let filteredData;
            if (canManage) {
                // HR/Admin see all mission and sick leaves (including pending ones to approve/reject)
                filteredData = missionAndSickLeaves;
            } else if (isDoctor) {
                // Doctors see only sick leaves that are pending doctor review
                filteredData = missionAndSickLeaves.filter(leave => {
                    const leaveType = leave.leaveType || leave.type;
                    return leaveType === 'sick' &&
                        leave.workflow?.currentStep === 'doctor-review';
                });
            } else {
                // Regular users see only their own leaves
                filteredData = missionAndSickLeaves.filter(leave => {
                    const leaveUserId = leave.employee?._id || leave.employee || leave.user?._id || leave.user;
                    const currentUserId = user?._id;
                    console.log('Comparing leave user:', leaveUserId, 'with current user:', currentUserId);
                    return leaveUserId === currentUserId || String(leaveUserId) === String(currentUserId);
                });
            }

            console.log('Filtered leaves count:', filteredData.length);
            console.log('Filtered leaves:', filteredData);
=======
            // If HR/Admin, fetch all leaves. Otherwise, fetch only user's leaves
            const params = (isHR || isAdmin) ? {} : { user: user?._id };
            const data = await leaveService.getAll(params);
            // Map backend 'employee' field to frontend 'user' field and 'leaveType' to 'type'
            // Filter to show only mission and sick leaves
            const filteredData = Array.isArray(data) ? data.filter(leave => 
                ['mission', 'sick'].includes(leave.leaveType || leave.type)
            ).map(leave => ({
                ...leave,
                user: leave.employee || leave.user,
                type: leave.leaveType || leave.type
            })) : [];
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
            setLeaves(filteredData);
        } catch (error) {
            console.error('Error fetching leaves:', error);
            showNotification('Failed to fetch leave requests', 'error');
            setLeaves([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
<<<<<<< HEAD
            // Only fetch users if HR/Admin
            if (canManage) {
                const data = await userService.getAll();
                setUsers(data);
=======
            // Only fetch all users if HR/Admin, otherwise just use current user
            if (isHR || isAdmin) {
                const data = await userService.getAll();
                setUsers(data);
            } else {
                setUsers([user]);
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    useEffect(() => {
        fetchLeaves();
        fetchUsers();
    }, []);

    const handleOpenDialog = (leave = null) => {
        if (leave) {
            setSelectedLeave(leave);
            setFormData({
<<<<<<< HEAD
                user: leave.employee?._id || leave.employee || leave.user?._id || leave.user || '',
                type: leave.leaveType || leave.type || 'annual',
=======
                user: leave.user?._id || leave.user || '',
                type: leave.type || 'mission',
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
                startDate: leave.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                endDate: leave.endDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                reason: leave.reason || '',
                status: leave.status || 'pending',
                missionLocation: leave.mission?.location || '',
                missionPurpose: leave.mission?.purpose || ''
            });
        } else {
            setSelectedLeave(null);
            setFormData({
<<<<<<< HEAD
                user: canManage ? '' : user?._id || '',
=======
                user: (isHR || isAdmin) ? '' : user?._id || '',
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
                type: 'mission',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                reason: '',
                status: 'pending',
                missionLocation: '',
                missionPurpose: ''
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
        console.log('Form field changed:', name, '=', value);
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            console.log('Updated formData:', updated);
            return updated;
        });
    };

    const handleSubmit = async () => {
        try {
            console.log('=== SUBMIT STARTED ===');
            console.log('Current formData:', formData);
            console.log('Leave type:', formData.type);
            console.log('Mission location:', formData.missionLocation);
            console.log('Mission purpose:', formData.missionPurpose);

            // Prepare data for submission
            const submitData = { ...formData };

            // If mission type, add mission object (only if fields are provided)
            if (formData.type === 'mission') {
                if (formData.missionLocation || formData.missionPurpose) {
                    submitData.mission = {
                        location: formData.missionLocation?.trim() || '',
                        purpose: formData.missionPurpose?.trim() || ''
                    };
                }
                // Remove the flat fields
                delete submitData.missionLocation;
                delete submitData.missionPurpose;
            }

            console.log('Submitting leave data:', submitData);

            if (selectedLeave) {
                await leaveService.update(selectedLeave._id, submitData);
                showNotification('Leave request updated successfully', 'success');
            } else {
                await leaveService.create(submitData);
                showNotification('Leave request created successfully', 'success');
            }
            handleCloseDialog();
            fetchLeaves();
        } catch (error) {
            console.error('Submit error:', error);
            showNotification(error.response?.data?.message || error.message || 'Operation failed', 'error');
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

    const handleApprove = async (leaveId, leaveType) => {
        try {
            if (isDoctor && leaveType === 'sick') {
                // Doctor approving sick leave
                await leaveService.approveSickLeaveByDoctor(leaveId);
                showNotification('Sick leave approved by doctor', 'success');
            } else {
                // Supervisor/HR/Admin approving
                await leaveService.approve(leaveId);
                showNotification('Leave request approved', 'success');
            }
            // Add small delay to ensure backend has processed the update
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchLeaves();
        } catch (error) {
            console.error('Approve error:', error);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleReject = async (leaveId, leaveType) => {
        const reason = prompt('Please provide a reason for rejection (minimum 10 characters):');
        if (reason === null) {
            // User cancelled the prompt
            return;
        }

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            showNotification('Rejection reason is required', 'error');
            return;
        }

        if (trimmedReason.length < 10) {
            showNotification('Rejection reason must be at least 10 characters long', 'error');
            return;
        }

        try {
            if (isDoctor && leaveType === 'sick') {
                // Doctor rejecting sick leave
                await leaveService.rejectSickLeaveByDoctor(leaveId, trimmedReason);
                showNotification('Sick leave rejected by doctor', 'success');
            } else {
                // Supervisor/HR/Admin rejecting
                await leaveService.reject(leaveId, trimmedReason);
                showNotification('Leave request rejected', 'success');
            }
            // Add small delay to ensure backend has processed the update
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchLeaves();
        } catch (error) {
            console.error('Reject error:', error);
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
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
            width: 180,
<<<<<<< HEAD
            align: 'center',
            renderCell: (row) => row.employee?.name || row.user?.name || 'N/A'
=======
            renderCell: (row) => row.user?.name || 'N/A'
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
        },
        {
            field: 'leaveType',
            headerName: 'Type',
            width: 120,
<<<<<<< HEAD
            align: 'center',
            renderCell: (row) => {
                const type = row.leaveType || row.type;
                const label = type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
                return (
                    <Chip label={label} size="small" variant="outlined" />
                );
            }
=======
            renderCell: (row) => (
                <Chip label={row.type} size="small" variant="outlined" />
            )
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
        },
        {
            field: 'startDate',
            headerName: 'Start Date',
            width: 120,
<<<<<<< HEAD
            align: 'center',
=======
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
            renderCell: (row) => new Date(row.startDate).toLocaleDateString()
        },
        {
            field: 'endDate',
            headerName: 'End Date',
            width: 120,
<<<<<<< HEAD
            align: 'center',
=======
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
            renderCell: (row) => new Date(row.endDate).toLocaleDateString()
        },
        {
            field: 'days',
            headerName: 'Days',
            width: 80,
<<<<<<< HEAD
            align: 'center',
            renderCell: (row) => {
                // Use duration from backend if available
                if (row.duration) return row.duration;

                const start = new Date(row.startDate);
                const end = new Date(row.endDate);
                let workingDays = 0;
                const current = new Date(start);

                while (current <= end) {
                    const dayOfWeek = current.getDay();
                    // Exclude Friday (5) and Saturday (6)
                    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
                        workingDays++;
                    }
                    current.setDate(current.getDate() + 1);
                }

                return workingDays;
=======
            renderCell: (row) => {
                const start = new Date(row.startDate);
                const end = new Date(row.endDate);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                return days;
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
            }
        },
        { field: 'reason', headerName: 'Reason', width: 200, align: 'center' },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
<<<<<<< HEAD
            align: 'center',
=======
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
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
            width: 180,
<<<<<<< HEAD
            align: 'center',
            renderCell: (row) => {
                const isSickLeave = row.leaveType === 'sick' || row.type === 'sick';
                const isPending = row.status === 'pending';

                // IMPORTANT: Only doctors can approve/reject sick leave
                // HR/Admin can only approve/reject non-sick leaves
                const showApproveReject = isPending && (
                    (canManage && !isSickLeave) || // HR/Admin can ONLY approve non-sick leaves
                    (isDoctor && isSickLeave) // Doctor can ONLY approve sick leaves
                );

                return (
                    <Box>
                        {showApproveReject && (
                            <>
                                <IconButton
                                    size="small"
                                    onClick={() => handleApprove(row._id, row.leaveType || row.type)}
                                    color="success"
                                    title={isDoctor ? "Approve (Doctor)" : "Approve"}
                                >
                                    <CheckCircle fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => handleReject(row._id, row.leaveType || row.type)}
                                    color="error"
                                    title={isDoctor ? "Reject (Doctor)" : "Reject"}
                                >
                                    <Cancel fontSize="small" />
                                </IconButton>
                            </>
                        )}
                        {!isDoctor && (
                            <>
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
                                        setSelectedLeave(row);
                                        setOpenConfirm(true);
                                    }}
                                    color="error"
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </>
                        )}
                    </Box>
                );
            }
=======
            renderCell: (row) => (
                <Box>
                    {(isHR || isAdmin) && row.status === 'pending' && (
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
                            setSelectedLeave(row);
                            setOpenConfirm(true);
                        }}
                        color="error"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            )
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
        }
    ];

    if (loading) return <Loading />;

    console.log('Rendering LeavesPage with leaves:', leaves);
    console.log('Leaves count:', leaves.length);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4">Mission & Sick Requests</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {(isHR || isAdmin) ? 'Manage all mission and sick requests' : 'View and manage your mission and sick requests'}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/app/leaves/create')}
                >
                    New Request
                </Button>
            </Box>

            <DataTable
                data={leaves}
                columns={columns}
<<<<<<< HEAD
                emptyMessage="No leave requests found. Click 'New Leave Request' to create one."
=======
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedLeave ? 'Edit Request' : 'New Request'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
<<<<<<< HEAD
                        {canManage && (
=======
                        {(isHR || isAdmin) ? (
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
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
<<<<<<< HEAD
                                        {u.name} - {u.email}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                        <TextField
                            select
                            label="Leave Type"
=======
                                        {u.name || u.username} - {u.email}
                                    </MenuItem>
                                ))}
                            </TextField>
                        ) : (
                            <TextField
                                label="Employee"
                                value={user?.name || user?.username || ''}
                                disabled
                                fullWidth
                            />
                        )}
                        <TextField
                            select
                            label="Request Type"
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
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
                        {formData.type === 'mission' && (
                            <>
                                <TextField
                                    label="Mission Location (Optional)"
                                    name="missionLocation"
                                    value={formData.missionLocation}
                                    onChange={handleChange}
                                    fullWidth
                                    placeholder="Enter the mission location"
                                    helperText="Optional: Specify where the mission will take place"
                                />
                                <TextField
                                    label="Mission Purpose (Optional)"
                                    name="missionPurpose"
                                    value={formData.missionPurpose}
                                    onChange={handleChange}
                                    multiline
                                    rows={3}
                                    fullWidth
                                    placeholder="Describe the purpose of the mission"
                                    helperText="Optional: Provide details about the mission"
                                />
                            </>
                        )}
                        <TextField
                            label="Reason (Optional)"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            fullWidth
                            placeholder="Optional: Provide additional details"
                            helperText="Optional: Provide additional context if needed"
                        />
<<<<<<< HEAD
                        {canManage && (
=======
                        {(isHR || isAdmin) && (
>>>>>>> d93211611f4a47689b466866f76db5ab2a5fe742
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
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedLeave ? 'Update' : 'Create'}
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
                    setSelectedLeave(null);
                }}
            />
        </Box>
    );
};

export default LeavesPage;