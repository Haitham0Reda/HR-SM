import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Chip,
    Button,
    Tabs,
    Tab
} from '@mui/material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import vacationService from '../../services/vacation.service';
import missionService from '../../services/mission.service';
import sickLeaveService from '../../services/sickLeave.service';
import permissionService from '../../services/permission.service';
import overtimeService from '../../services/overtime.service';
import forgetCheckService from '../../services/forgetCheck.service';

const RequestsPage = () => {
    const navigate = useNavigate();
    const [myRequests, setMyRequests] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTab, setCurrentTab] = useState(0);
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();

    const canViewAll = isHR || isAdmin;

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

            // Fetch vacation requests
            const vacationData = await vacationService.getAll();
            const vacations = Array.isArray(vacationData) ? vacationData : (vacationData.data || []);

            // Transform vacation requests
            const transformedVacations = vacations.map(vacation => ({
                ...vacation,
                requestType: 'vacation',
                displayType: 'Vacation',
                date: vacation.startDate,
                details: `${vacation.duration || 0} day${vacation.duration !== 1 ? 's' : ''}`
            }));

            // Fetch mission requests
            const missionData = await missionService.getAll();
            const missions = Array.isArray(missionData) ? missionData : (missionData.data || []);

            // Transform mission requests
            const transformedMissions = missions.map(mission => ({
                ...mission,
                requestType: 'mission',
                displayType: 'Mission',
                date: mission.startDate,
                details: `${mission.duration || 0} day${mission.duration !== 1 ? 's' : ''}`
            }));

            // Fetch sick leave requests
            const sickLeaveData = await sickLeaveService.getAll();
            const sickLeaves = Array.isArray(sickLeaveData) ? sickLeaveData : (sickLeaveData.data || []);

            // Transform sick leave requests
            const transformedSickLeaves = sickLeaves.map(sickLeave => ({
                ...sickLeave,
                requestType: 'sick-leave',
                displayType: 'Sick Leave',
                date: sickLeave.startDate,
                details: `${sickLeave.duration || 0} day${sickLeave.duration !== 1 ? 's' : ''}`
            }));

            // Fetch permission requests (includes late-arrival, early-departure)
            const permissionData = await permissionService.getAll();
            const permissions = Array.isArray(permissionData) ? permissionData : [];

            // Transform all permission requests
            const transformedPermissions = permissions.map(permission => ({
                ...permission,
                requestType: 'permission',
                displayType: (permission.permissionType || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                date: permission.date,
                details: `${permission.time?.scheduled || 'N/A'} - ${permission.time?.requested || 'N/A'}`,
                employeeName: permission.employee?.personalInfo?.fullName || permission.employee?.username || 'N/A'
            }));

            // Fetch overtime requests
            const overtimeData = await overtimeService.getAll();
            const overtimes = Array.isArray(overtimeData) ? overtimeData : (overtimeData.data || []);

            // Transform overtime requests
            const transformedOvertimes = overtimes.map(overtime => ({
                ...overtime,
                requestType: 'overtime',
                displayType: 'Overtime',
                date: overtime.date,
                details: `${overtime.duration || 0} hour${overtime.duration !== 1 ? 's' : ''} - ${overtime.compensationType || 'N/A'}`,
                employeeName: overtime.employee?.personalInfo?.fullName || overtime.employee?.username || 'N/A'
            }));

            // Fetch forget check requests
            const forgetCheckData = await forgetCheckService.getAll();
            const forgetChecks = Array.isArray(forgetCheckData) ? forgetCheckData : (forgetCheckData.data || []);

            // Transform forget check requests
            const transformedForgetChecks = forgetChecks.map(forgetCheck => ({
                ...forgetCheck,
                requestType: 'forget-check',
                displayType: 'Forget Check',
                date: forgetCheck.date,
                details: forgetCheck.checkType ? `${forgetCheck.checkType.charAt(0).toUpperCase() + forgetCheck.checkType.slice(1)} Check` : 'N/A',
                employeeName: forgetCheck.employee?.personalInfo?.fullName || forgetCheck.employee?.username || 'N/A'
            }));

            // Add employee names to all requests
            transformedVacations.forEach(v => {
                v.employeeName = v.employee?.personalInfo?.fullName || v.employee?.username || 'N/A';
            });
            transformedMissions.forEach(m => {
                m.employeeName = m.employee?.personalInfo?.fullName || m.employee?.username || 'N/A';
            });
            transformedSickLeaves.forEach(s => {
                s.employeeName = s.employee?.personalInfo?.fullName || s.employee?.username || 'N/A';
            });

            // Combine all requests
            const combined = [...transformedVacations, ...transformedMissions, ...transformedSickLeaves, ...transformedPermissions, ...transformedOvertimes, ...transformedForgetChecks];

            // Filter user's own requests
            const userRequests = combined.filter(req => {
                const employeeId = req.employee?._id || req.employee;
                return employeeId === user._id || String(employeeId) === String(user._id);
            });

            // Sort by date (newest first)
            const sortedUserRequests = userRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const sortedAllRequests = combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setMyRequests(sortedUserRequests);
            setAllRequests(sortedAllRequests);
        } catch (error) {

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

    const getColumns = (showEmployee = false) => [
        ...(showEmployee ? [
            {
                id: 'employeeName',
                label: 'Employee Name',
                width: 150,
                align: 'center',
                render: (row) => row.employeeName || 'N/A'
            },
            {
                id: 'employeeId',
                label: 'Employee ID',
                width: 120,
                align: 'center',
                render: (row) => row.employee?.employeeId || 'N/A'
            },
            {
                id: '_id',
                label: 'Request ID',
                width: 100,
                align: 'center',
                render: (row) => `#${(row._id || '').slice(-4)}`
            }
        ] : [
            {
                id: 'employeeName',
                label: 'Name',
                width: 150,
                align: 'center',
                render: (row) => user?.personalInfo?.fullName || user?.username || 'N/A'
            },
            {
                id: 'employeeId',
                label: 'Employee ID',
                width: 120,
                align: 'center',
                render: (row) => user?.employeeId || 'N/A'
            }
        ]),
        {
            id: 'date',
            label: 'Date',
            width: 120,
            align: 'center',
            render: (row) => new Date(row.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            })
        },
        {
            id: 'displayType',
            label: 'Request Type',
            width: 180,
            align: 'center',
            render: (row) => (
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
            id: 'details',
            label: 'Details',
            width: 150,
            align: 'center',
            render: (row) => row.details || 'N/A'
        },
        {
            id: 'reason',
            label: 'Reason',
            width: 200,
            align: 'center',
            render: (row) => row.reason || row.notes || 'N/A'
        },
        {
            id: 'status',
            label: 'Status',
            width: 120,
            align: 'center',
            render: (row) => (
                <Chip
                    label={row.status?.toUpperCase() || 'PENDING'}
                    color={getLeaveStatusColor(row.status)}
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                />
            )
        },
        {
            id: 'createdAt',
            label: 'Submitted On',
            width: 180,
            align: 'center',
            render: (row) => new Date(row.createdAt).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
        },
        {
            id: 'actions',
            label: 'Actions',
            width: 100,
            align: 'center',
            render: (row) => {
                return (
                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => navigate(`/app/requests/${row._id}`)}
                    >
                        View
                    </Button>
                );
            }
        }
    ];

    if (loading) return <Loading />;

    const displayData = currentTab === 0 ? myRequests : allRequests;
    const displayColumns = getColumns(currentTab === 1);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Requests</Typography>
                <Typography variant="body2" color="text.secondary">
                    {displayData.length} request(s)
                </Typography>
            </Box>

            {canViewAll && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
                        <Tab label={`My Requests (${myRequests.length})`} />
                        <Tab label={`All Requests (${allRequests.length})`} />
                    </Tabs>
                </Box>
            )}

            <DataTable
                data={displayData}
                columns={displayColumns}
                emptyMessage="No requests found. Submit a leave, permission, or overtime request to see it here."
            />
        </Box>
    );
};

export default RequestsPage;
