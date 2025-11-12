import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Chip,
    Button
} from '@mui/material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import leaveService from '../../services/leave.service';
import permissionService from '../../services/permission.service';

const RequestsPage = () => {
    const navigate = useNavigate();
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { showNotification } = useNotification();

    useEffect(() => {
        if (user && user._id) {
            fetchAllRequests();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?._id]);

    const fetchAllRequests = async () => {
        try {
            setLoading(true);

            // Fetch leave requests
            const leaveData = await leaveService.getAll({ user: user._id });
            const leaves = Array.isArray(leaveData) ? leaveData : (leaveData.data || []);

            // Transform leave requests
            const transformedLeaves = leaves.map(leave => {
                const leaveType = leave.leaveType || '';
                let displayType = leaveType.charAt(0).toUpperCase() + leaveType.slice(1);
                let vacationType = null;

                // Replace "Annual" with "Vacation" and store the vacation type
                if (leaveType.toLowerCase() === 'annual') {
                    displayType = 'Vacation';
                    vacationType = 'Annual';
                } else if (leaveType.toLowerCase() === 'casual') {
                    displayType = 'Vacation';
                    vacationType = 'Casual';
                } else if (leaveType.toLowerCase() === 'sick') {
                    displayType = 'Vacation';
                    vacationType = 'Sick';
                } else if (leaveType.toLowerCase() === 'unpaid') {
                    displayType = 'Vacation';
                    vacationType = 'Unpaid';
                } else {
                    displayType = displayType + ' Leave';
                }

                return {
                    ...leave,
                    requestType: 'leave',
                    displayType,
                    vacationType,
                    date: leave.startDate,
                    details: `${leave.duration || 0} day${leave.duration !== 1 ? 's' : ''}`
                };
            });

            // Fetch permission requests (includes late-arrival, early-departure, overtime)
            const permissionData = await permissionService.getAll();
            const permissions = Array.isArray(permissionData) ? permissionData : [];

            // Filter and transform permission requests
            const userPermissions = permissions
                .filter(p => p.employee?._id === user._id || p.employee === user._id)
                .map(permission => ({
                    ...permission,
                    requestType: 'permission',
                    displayType: (permission.permissionType || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    date: permission.date,
                    details: `${permission.time?.scheduled || 'N/A'} - ${permission.time?.requested || 'N/A'}`
                }));

            // Combine and sort by date (newest first)
            const combined = [...transformedLeaves, ...userPermissions].sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );

            setAllRequests(combined);
        } catch (error) {
            console.error('Failed to fetch requests:', error);
            showNotification('Failed to fetch requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getLeaveStatusColor = (status) => {
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
            field: '_id',
            headerName: 'ID',
            width: 100,
            renderCell: (row) => `#${(row._id || '').slice(-4)}`
        },
        {
            field: 'date',
            headerName: 'Date',
            width: 120,
            renderCell: (row) => new Date(row.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            })
        },
        {
            field: 'displayType',
            headerName: 'Request Type',
            width: 180,
            renderCell: (row) => (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                    <Chip
                        label={row.displayType}
                        size="small"
                        variant="outlined"
                        color={row.requestType === 'leave' ? 'primary' : 'secondary'}
                    />
                    {row.vacationType && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textAlign: 'center' }}>
                            ({row.vacationType})
                        </Typography>
                    )}
                </Box>
            )
        },
        {
            field: 'details',
            headerName: 'Details',
            width: 150,
            renderCell: (row) => row.details || 'N/A'
        },
        {
            field: 'reason',
            headerName: 'Reason',
            width: 200,
            renderCell: (row) => row.reason || row.notes || 'N/A'
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (row) => (
                <Chip
                    label={row.status?.toUpperCase() || 'PENDING'}
                    color={getLeaveStatusColor(row.status)}
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                />
            )
        },
        {
            field: 'createdAt',
            headerName: 'Submitted On',
            width: 180,
            renderCell: (row) => new Date(row.createdAt).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 100,
            renderCell: (row) => {
                let route = '/requests';
                if (row.requestType === 'leave') {
                    route = '/leaves';
                } else if (row.permissionType === 'overtime') {
                    route = '/overtime';
                } else {
                    route = '/permissions';
                }
                return (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => navigate(route)}
                    >
                        View
                    </Button>
                );
            }
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">My Requests</Typography>
                <Typography variant="body2" color="text.secondary">
                    {allRequests.length} total request(s)
                </Typography>
            </Box>

            <DataTable
                data={allRequests}
                columns={columns}
                emptyMessage="No requests found. Submit a leave, permission, or overtime request to see it here."
            />
        </Box>
    );
};

export default RequestsPage;
