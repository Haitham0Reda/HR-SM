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

const RequestsPage = () => {
    const navigate = useNavigate();
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { showNotification } = useNotification();

    useEffect(() => {
        if (user && user._id) {
            fetchLeaveRequests();

            // Auto-refresh every 30 seconds
            const interval = setInterval(() => {
                fetchLeaveRequests();
            }, 30000);

            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchLeaveRequests = async () => {
        try {
            setLoading(true);
            const data = await leaveService.getAll({ user: user._id });
            const requests = Array.isArray(data) ? data : (data.data || []);
            setLeaveRequests(requests);
        } catch (error) {
            console.error('Failed to fetch leave requests:', error);
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

    const leaveColumns = [
        {
            field: '_id',
            headerName: 'ID',
            renderCell: (row) => `#${(row._id || '').slice(-4)}`
        },
        {
            field: 'startDate',
            headerName: 'Date',
            renderCell: (row) => new Date(row.startDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            })
        },
        {
            field: 'leaveType',
            headerName: 'Request Type',
            renderCell: (row) => {
                const type = row.leaveType || row.type || '';
                return type.charAt(0).toUpperCase() + type.slice(1) + ' Leave';
            }
        },
        {
            field: 'duration',
            headerName: 'Requested Time',
            renderCell: (row) => `${row.duration || 0} day${row.duration !== 1 ? 's' : ''}`
        },
        {
            field: 'status',
            headerName: 'Status',
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
            renderCell: (row) => (
                <Button
                    variant="contained"
                    size="small"
                    onClick={() => navigate(`/requests/${row._id}`)}
                >
                    👁 View
                </Button>
            )
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">My Requests</Typography>
                <Typography variant="body2" color="text.secondary">
                    {leaveRequests.length} request(s) found
                </Typography>
            </Box>

            <DataTable
                data={leaveRequests}
                columns={leaveColumns}
                emptyMessage="No vacation requests found. Submit a request to see it here."
            />
        </Box>
    );
};

export default RequestsPage;
