import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Chip,
    IconButton,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle,
    Cancel,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import permissionService from '../../services/permission.service';

const OvertimePage = () => {
    const { user, isHR, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [overtimeRequests, setOvertimeRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const { showNotification } = useNotification();

    const canManage = isHR || isAdmin;

    useEffect(() => {
        fetchOvertimeRequests();
    }, []);

    const fetchOvertimeRequests = async () => {
        try {
            setLoading(true);
            // Fetch all permission requests
            const data = await permissionService.getAll();

            // Filter only overtime requests
            let overtimeData = data.filter(permission => permission.permissionType === 'overtime');

            // Filter to show only current user's overtime if not HR/Admin
            if (!canManage) {
                overtimeData = overtimeData.filter(permission => {
                    const permissionUserId = permission.employee?._id || permission.employee;
                    const currentUserId = user?._id;
                    return permissionUserId === currentUserId || String(permissionUserId) === String(currentUserId);
                });
            }

            // Transform data to match table structure
            const transformedData = overtimeData.map(item => ({
                _id: item._id,
                employee: item.employee,
                date: item.date,
                startTime: item.time?.scheduled || 'N/A',
                endTime: item.time?.requested || 'N/A',
                hours: item.time?.duration ? (item.time.duration / 60).toFixed(2) : 0,
                reason: item.reason || 'N/A',
                status: item.status,
                createdAt: item.createdAt
            }));

            setOvertimeRequests(transformedData);
        } catch (error) {
            console.error('Error fetching overtime requests:', error);
            showNotification('Failed to fetch overtime requests', 'error');
            setOvertimeRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            if (!selectedRequest) return;

            await permissionService.delete(selectedRequest._id);
            showNotification('Overtime request deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedRequest(null);
            fetchOvertimeRequests();
        } catch (error) {
            console.error('Error deleting overtime request:', error);
            showNotification('Delete failed', 'error');
        }
    };

    const handleApprove = async (requestId) => {
        try {
            await permissionService.approve(requestId, 'Approved by supervisor');
            showNotification('Overtime request approved', 'success');
            fetchOvertimeRequests();
        } catch (error) {
            console.error('Error approving overtime request:', error);
            showNotification('Approval failed', 'error');
        }
    };

    const handleReject = async (requestId) => {
        try {
            await permissionService.reject(requestId, 'Rejected by supervisor');
            showNotification('Overtime request rejected', 'success');
            fetchOvertimeRequests();
        } catch (error) {
            console.error('Error rejecting overtime request:', error);
            showNotification('Rejection failed', 'error');
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
            field: 'date',
            headerName: 'Date',
            renderCell: (row) => new Date(row.date).toLocaleDateString()
        },
        {
            field: 'startTime',
            headerName: 'Start Time',
            renderCell: (row) => row.startTime || 'N/A'
        },
        {
            field: 'endTime',
            headerName: 'End Time',
            renderCell: (row) => row.endTime || 'N/A'
        },
        {
            field: 'hours',
            headerName: 'Hours',
            renderCell: (row) => `${row.hours || 0} hrs`
        },
        {
            field: 'reason',
            headerName: 'Reason',
            width: 200
        },
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
                        onClick={() => navigate(`/overtime/${row._id}`)}
                        color="primary"
                        title="Edit"
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
                    Overtime Requests
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/overtime/create')}
                    sx={{
                        minWidth: { xs: '100%', sm: 'auto' },
                        textTransform: 'none',
                        fontWeight: 600,
                        py: 1.2,
                        px: 3,
                    }}
                >
                    New Overtime Request
                </Button>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0 }}>
                <DataTable
                    data={overtimeRequests}
                    columns={columns}
                    emptyMessage="No overtime requests found. Click 'New Overtime Request' to create one."
                />
            </Box>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Overtime Request"
                message="Are you sure you want to delete this overtime request?"
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedRequest(null);
                }}
            />
        </Box>
    );
};

export default OvertimePage;
