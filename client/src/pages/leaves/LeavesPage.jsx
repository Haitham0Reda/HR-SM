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
    const navigate = useNavigate();
    const { user, isHR, isAdmin } = useAuth();
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

    const canManage = isHR || isAdmin;
    const isDoctor = user?.role === 'doctor';

    const leaveTypes = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid', 'other'];
    const statuses = ['pending', 'approved', 'rejected', 'cancelled'];

    useEffect(() => {
        fetchLeaves();
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            const data = await leaveService.getAll();

            // Ensure data is an array
            const leavesArray = Array.isArray(data) ? data : [];

            console.log('Fetched leaves:', leavesArray);
            console.log('Current user ID:', user?._id);
            console.log('Can manage:', canManage);

            // Filter to show only current user's leaves if not HR/Admin
            // Note: API returns 'employee' field, not 'user'
            const filteredData = canManage
                ? leavesArray
                : leavesArray.filter(leave => {
                    const leaveUserId = leave.employee?._id || leave.employee || leave.user?._id || leave.user;
                    const currentUserId = user?._id;
                    console.log('Comparing leave user:', leaveUserId, 'with current user:', currentUserId);
                    return leaveUserId === currentUserId || String(leaveUserId) === String(currentUserId);
                });

            console.log('Filtered leaves count:', filteredData.length);
            console.log('Filtered leaves:', filteredData);
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
            // Only fetch users if HR/Admin
            if (canManage) {
                const data = await userService.getAll();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const handleOpenDialog = (leave = null) => {
        if (leave) {
            setSelectedLeave(leave);
            setFormData({
                user: leave.employee?._id || leave.employee || leave.user?._id || leave.user || '',
                type: leave.leaveType || leave.type || 'annual',
                startDate: leave.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                endDate: leave.endDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                reason: leave.reason || '',
                status: leave.status || 'pending'
            });
        } else {
            setSelectedLeave(null);
            setFormData({
                user: canManage ? '' : user?._id || '',
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
            fetchLeaves();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleReject = async (leaveId, leaveType) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) {
            showNotification('Rejection reason is required', 'error');
            return;
        }

        try {
            if (isDoctor && leaveType === 'sick') {
                // Doctor rejecting sick leave
                await leaveService.rejectSickLeaveByDoctor(leaveId, reason);
                showNotification('Sick leave rejected by doctor', 'success');
            } else {
                // Supervisor/HR/Admin rejecting
                await leaveService.reject(leaveId, reason);
                showNotification('Leave request rejected', 'success');
            }
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
            field: 'employee',
            headerName: 'Employee',
            width: 180,
            renderCell: (row) => row.employee?.name || row.user?.name || 'N/A'
        },
        {
            field: 'leaveType',
            headerName: 'Type',
            width: 120,
            renderCell: (row) => (
                <Chip label={row.leaveType || row.type} size="small" variant="outlined" />
            )
        },
        {
            field: 'startDate',
            headerName: 'Start Date',
            width: 120,
            renderCell: (row) => new Date(row.startDate).toLocaleDateString()
        },
        {
            field: 'endDate',
            headerName: 'End Date',
            width: 120,
            renderCell: (row) => new Date(row.endDate).toLocaleDateString()
        },
        {
            field: 'days',
            headerName: 'Days',
            width: 80,
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
            }
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
            width: 180,
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
        }
    ];

    if (loading) return <Loading />;

    console.log('Rendering LeavesPage with leaves:', leaves);
    console.log('Leaves count:', leaves.length);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Leave Requests</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/app/leaves/create')}
                >
                    New Leave Request
                </Button>
            </Box>

            <DataTable
                data={leaves}
                columns={columns}
                emptyMessage="No leave requests found. Click 'New Leave Request' to create one."
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedLeave ? 'Edit Leave Request' : 'New Leave Request'}
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
                        {canManage && (
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
