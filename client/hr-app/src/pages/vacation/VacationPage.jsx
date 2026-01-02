import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    TextField,
    Typography,
    Chip,
    Divider,
    Tabs,
    Tab,
    MenuItem,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    BeachAccess as BeachAccessIcon,
    Send as SendIcon,
    History as HistoryIcon,
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import vacationService from '../../services/vacation.service';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';

const VacationPage = () => {
    console.log('🏖️ VacationPage component rendering...');
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();

    // HR/Admin default to history tab, regular users default to request tab
    const [activeTab, setActiveTab] = useState((isHR || isAdmin) ? 1 : 0);
    const [loading, setLoading] = useState(false);
    const [vacationHistory, setVacationHistory] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        type: 'annual',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: ''
    });

    const fetchVacationHistory = useRef(null);

    fetchVacationHistory.current = async () => {
        try {
            setLoading(true);
            console.log('🚀 fetchVacationHistory called!');

            const response = await vacationService.getAll();
            
            // Debug logging
            console.log('🔍 VacationPage Debug:');
            console.log('Raw response:', response);
            console.log('Response type:', typeof response);
            console.log('Response keys:', response ? Object.keys(response) : 'null');
            console.log('Response.data:', response?.data);
            console.log('Response.data type:', typeof response?.data);
            console.log('Response.data length:', response?.data?.length);

            // API service already extracts data, so response is the actual data object
            const leavesArray = response?.data || [];
            console.log('Extracted leavesArray:', leavesArray);
            console.log('leavesArray length:', leavesArray.length);
            
            if (leavesArray.length > 0) {
                console.log('First vacation record:', leavesArray[0]);
                console.log('First record keys:', Object.keys(leavesArray[0]));
            }

            // Filter to only show vacation types (annual, casual, sick)
            const vacationTypes = ['annual', 'casual', 'sick'];
            const vacationRequests = leavesArray.filter(leave =>
                vacationTypes.includes(leave.vacationType?.toLowerCase() || leave.leaveType?.toLowerCase())
            );
            console.log('After filtering:', vacationRequests.length);
            console.log('Filtered requests:', vacationRequests);

            // For HR and Admin users, show all vacation requests
            // For regular users, show only their own vacation requests
            let filteredData;
            if (isHR || isAdmin) {
                // HR/Admin see all vacation requests
                filteredData = vacationRequests;
            } else {
                // Regular users see only their own vacation requests
                filteredData = vacationRequests.filter(leave => {
                    const leaveUserId = leave.employee?._id || leave.employee || leave.user?._id || leave.user;
                    const currentUserId = user?._id;
                    return leaveUserId === currentUserId || String(leaveUserId) === String(currentUserId);
                });
            }

            console.log('Final filteredData:', filteredData);
            console.log('Setting vacationHistory to:', filteredData.length, 'items');
            setVacationHistory(filteredData);
        } catch (error) {
            console.error('fetchVacationHistory error:', error);
            showNotification('Failed to fetch vacation history', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log('🔄 VacationPage useEffect triggered');
        if (fetchVacationHistory.current) {
            fetchVacationHistory.current();
        }
    }, [isHR, isAdmin, user, showNotification]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);

            const submitData = {
                user: user._id,
                leaveType: formData.type,
                startDate: formData.startDate,
                endDate: formData.endDate,
                reason: formData.reason.trim()
            };

            await vacationService.create(submitData);
            showNotification('Vacation request submitted successfully', 'success');

            // Reset form
            setFormData({
                type: 'annual',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                reason: ''
            });

            // Refresh history
            fetchVacationHistory.current();
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to submit request';
            showNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const calculateDays = () => {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);

        let workingDays = 0;
        const current = new Date(start);

        // Loop through each day and count only working days (Sunday-Thursday)
        while (current <= end) {
            const dayOfWeek = current.getDay();
            // 0 = Sunday, 1 = Monday, ..., 4 = Thursday (working days)
            // 5 = Friday, 6 = Saturday (official holidays - excluded)
            if (dayOfWeek !== 5 && dayOfWeek !== 6) {
                workingDays++;
            }
            current.setDate(current.getDate() + 1);
        }

        return workingDays > 0 ? workingDays : 0;
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

    const handleApprove = async (leaveId, leaveType) => {
        try {
            if (leaveType === 'sick') {
                showNotification('Sick leave requests can only be approved by doctors', 'warning');
                return;
            }

            await vacationService.approve(leaveId);
            showNotification('Leave request approved successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchVacationHistory.current();
        } catch (error) {
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Approval failed', 'error');
        }
    };

    const handleReject = async (leaveId, leaveType) => {
        if (leaveType === 'sick') {
            showNotification('Sick leave requests can only be rejected by doctors', 'warning');
            return;
        }

        const reason = prompt('Please provide a reason for rejection (minimum 10 characters):');
        if (reason === null) {
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
            await vacationService.reject(leaveId, trimmedReason);
            showNotification('Leave request rejected successfully', 'success');
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchVacationHistory.current();
        } catch (error) {
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Rejection failed', 'error');
        }
    };

    const handleViewRequest = (request) => {
        setSelectedRequest(request);
        setViewDialogOpen(true);
    };

    const handleEditRequest = (request) => {
        setSelectedRequest(request);
        setFormData({
            type: request.vacationType || request.leaveType || 'annual',
            startDate: request.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
            endDate: request.endDate?.split('T')[0] || new Date().toISOString().split('T')[0],
            reason: request.reason || ''
        });
        setEditDialogOpen(true);
    };

    const handleUpdateRequest = async () => {
        try {
            setLoading(true);
            const submitData = {
                leaveType: formData.type,
                startDate: formData.startDate,
                endDate: formData.endDate,
                reason: formData.reason.trim()
            };

            await vacationService.update(selectedRequest._id, submitData);
            showNotification('Request updated successfully', 'success');
            setEditDialogOpen(false);
            setSelectedRequest(null);
            await fetchVacationHistory.current();
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to update request';
            showNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRequest = (request) => {
        setSelectedRequest(request);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            setLoading(true);
            await vacationService.delete(selectedRequest._id);
            showNotification('Request deleted successfully', 'success');
            setDeleteDialogOpen(false);
            setSelectedRequest(null);
            await fetchVacationHistory.current();
        } catch (error) {
            showNotification(error.response?.data?.error || error.response?.data?.message || 'Delete failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const historyColumns = [
        // Show employee name for all users
        {
            field: 'employee',
            headerName: 'Employee',
            renderCell: (row) => {
                const userObj = row.employee || row.user;
                if (!userObj) return 'Unknown User';

                return userObj.personalInfo?.fullName || userObj.username || userObj.email || 'Unknown User';
            }
        },
        {
            field: 'vacationType',
            headerName: 'Type',
            renderCell: (row) => (
                <Chip
                    label={(row.vacationType || row.leaveType)?.charAt(0).toUpperCase() + (row.vacationType || row.leaveType)?.slice(1) || 'N/A'}
                    size="small"
                    variant="outlined"
                    color="primary"
                />
            )
        },
        {
            field: 'startDate',
            headerName: 'Start Date',
            renderCell: (row) => new Date(row.startDate).toLocaleDateString()
        },
        {
            field: 'endDate',
            headerName: 'End Date',
            renderCell: (row) => new Date(row.endDate).toLocaleDateString()
        },
        {
            field: 'duration',
            headerName: 'Days',
            renderCell: (row) => `${row.duration || 0} days`
        },
        {
            field: 'status',
            headerName: 'Status',
            renderCell: (row) => (
                <Chip
                    label={row.status?.toUpperCase() || 'PENDING'}
                    color={getStatusColor(row.status)}
                    size="small"
                />
            )
        },
        {
            field: 'reason',
            headerName: 'Reason',
            renderCell: (row) => row.reason || 'N/A'
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 200,
            renderCell: (row) => {
                const isPending = row.status === 'pending';
                const isSickLeave = (row.vacationType || row.leaveType) === 'sick';
                const isOwnRequest = row.employee?._id === user?._id || row.employee === user?._id;

                return (
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        {/* View button for everyone */}
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewRequest(row)}
                            title="View Details"
                        >
                            <VisibilityIcon fontSize="small" />
                        </IconButton>

                        {/* Edit button - Admin can edit any request, employees only their own pending requests */}
                        {(isAdmin || (isOwnRequest && isPending)) && (
                            <IconButton
                                size="small"
                                color="info"
                                onClick={() => handleEditRequest(row)}
                                title="Edit Request"
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        )}

                        {/* Delete button - Admin can delete any request, employees only their own pending requests */}
                        {(isAdmin || (isOwnRequest && isPending)) && (
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteRequest(row)}
                                title="Delete Request"
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        )}

                        {/* Admin can approve/reject any request, HR only pending non-sick leaves */}
                        {((isAdmin && !isSickLeave) || (isHR && isPending && !isSickLeave)) && (
                            <>
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleApprove(row._id, row.vacationType || row.leaveType)}
                                    sx={{ ml: 1 }}
                                >
                                    Approve
                                </Button>
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="error"
                                    onClick={() => handleReject(row._id, row.vacationType || row.leaveType)}
                                >
                                    Reject
                                </Button>
                            </>
                        )}
                    </Box>
                );
            }
        }
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Vacation Management</Typography>
            </Box>

            <Tabs
                value={activeTab}
                onChange={(e, newValue) => {
                    console.log('🔄 Tab changed to:', newValue);
                    setActiveTab(newValue);
                    if (newValue === 1) { // History tab
                        console.log('📋 Switching to history tab, fetching data...');
                        fetchVacationHistory.current();
                    }
                }}
                sx={{ mb: 3 }}
            >
                <Tab icon={<BeachAccessIcon />} label="Request Vacation" />
                <Tab icon={<HistoryIcon />} label="Vacation History" />
            </Tabs>

            {activeTab === 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Request New Vacation
                        </Typography>
                        <Divider sx={{ mb: 3 }} />

                        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                                        <TextField
                                            id="vacation-type-select"
                                            select
                                            label="Vacation Type"
                                            name="type"
                                            value={formData.type}
                                            onChange={handleChange}
                                            fullWidth
                                            required
                                        >
                                            <MenuItem value="annual">Annual Vacation</MenuItem>
                                            <MenuItem value="casual">Casual Vacation</MenuItem>
                                            <MenuItem value="sick">Sick Vacation</MenuItem>
                                        </TextField>
                                    </Box>

                                    <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                                        <TextField
                                            id="days-requested-display"
                                            label="Days Requested"
                                            value={`${calculateDays()} day(s)`}
                                            InputProps={{
                                                readOnly: true,
                                            }}
                                            fullWidth
                                        />
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                                        <TextField
                                            id="vacation-start-date"
                                            type="date"
                                            label="Start Date"
                                            name="startDate"
                                            value={formData.startDate}
                                            onChange={handleChange}
                                            InputLabelProps={{ shrink: true }}
                                            fullWidth
                                            required
                                        />
                                    </Box>

                                    <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                                        <TextField
                                            id="vacation-end-date"
                                            type="date"
                                            label="End Date"
                                            name="endDate"
                                            value={formData.endDate}
                                            onChange={handleChange}
                                            InputLabelProps={{ shrink: true }}
                                            fullWidth
                                            required
                                        />
                                    </Box>
                                </Box>

                                <TextField
                                    id="vacation-reason"
                                    label="Reason"
                                    name="reason"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    multiline
                                    rows={3}
                                    fullWidth
                                />

                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={<SendIcon />}
                                        disabled={loading}
                                    >
                                        {loading ? 'Submitting...' : 'Submit Request'}
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {activeTab === 1 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Vacation History
                        </Typography>
                        <Divider sx={{ mb: 3 }} />

                        {loading ? (
                            <Loading />
                        ) : (
                            <DataTable
                                data={vacationHistory}
                                columns={historyColumns}
                                emptyMessage="No vacation history found"
                            />
                        )}
                    </CardContent>
                </Card>
            )}

            {/* View Request Dialog */}
            <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Request Details</DialogTitle>
                <DialogContent>
                    {selectedRequest && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                                <Chip
                                    label={(selectedRequest.vacationType || selectedRequest.leaveType)?.charAt(0).toUpperCase() + (selectedRequest.vacationType || selectedRequest.leaveType)?.slice(1)}
                                    size="small"
                                    color="primary"
                                />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Start Date</Typography>
                                <Typography>{new Date(selectedRequest.startDate).toLocaleDateString()}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">End Date</Typography>
                                <Typography>{new Date(selectedRequest.endDate).toLocaleDateString()}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
                                <Typography>{selectedRequest.duration || 0} days</Typography>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                                <Chip
                                    label={selectedRequest.status?.toUpperCase()}
                                    color={getStatusColor(selectedRequest.status)}
                                    size="small"
                                />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Reason</Typography>
                                <Typography>{selectedRequest.reason || 'N/A'}</Typography>
                            </Box>
                            {selectedRequest.rejectionReason && (
                                <Box>
                                    <Typography variant="subtitle2" color="error">Rejection Reason</Typography>
                                    <Typography color="error">{selectedRequest.rejectionReason}</Typography>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Request Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Request</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            id="edit-vacation-type-select"
                            select
                            label="Vacation Type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            fullWidth
                            required
                        >
                            <MenuItem value="annual">Annual Leave</MenuItem>
                            <MenuItem value="casual">Casual Leave</MenuItem>
                            <MenuItem value="sick">Sick Leave</MenuItem>
                        </TextField>
                        <TextField
                            id="edit-vacation-start-date"
                            type="date"
                            label="Start Date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            required
                        />
                        <TextField
                            id="edit-vacation-end-date"
                            type="date"
                            label="End Date"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            required
                        />
                        <TextField
                            id="edit-vacation-reason"
                            label="Reason"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateRequest} variant="contained" disabled={loading}>
                        {loading ? 'Updating...' : 'Update'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Request</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this request? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={loading}>
                        {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default VacationPage;



