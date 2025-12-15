import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Schedule as ScheduleIcon,
    ExitToApp as ExitToAppIcon
} from '@mui/icons-material';
import attendanceDeviceService from '../../services/attendanceDevice.service';
import PageContainer from '../../components/PageContainer';

const AttendanceDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [todayData, setTodayData] = useState(null);

    useEffect(() => {
        fetchTodayAttendance();
    }, []);

    const fetchTodayAttendance = async () => {
        try {
            setLoading(true);
            const response = await attendanceDeviceService.getTodayAttendance();
            setTodayData(response);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch attendance data');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'on-time': 'success',
            'late': 'warning',
            'present': 'info',
            'absent': 'error',
            'work-from-home': 'primary'
        };
        return colors[status] || 'default';
    };

    const formatTime = (time) => {
        if (!time) return '-';
        return new Date(time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <PageContainer title="Attendance Dashboard">
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </PageContainer>
        );
    }

    if (error) {
        return (
            <PageContainer title="Attendance Dashboard">
                <Alert severity="error">{error}</Alert>
            </PageContainer>
        );
    }

    const { summary, data } = todayData || {};

    return (
        <PageContainer title="Attendance Dashboard">
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                    Today's Attendance - {new Date().toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                    })}
                </Typography>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography color="textSecondary" gutterBottom>
                                        Total Employees
                                    </Typography>
                                    <Typography variant="h4">{summary?.total || 0}</Typography>
                                </Box>
                                <ScheduleIcon color="primary" sx={{ fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography color="textSecondary" gutterBottom>
                                        Present
                                    </Typography>
                                    <Typography variant="h4" color="success.main">
                                        {summary?.present || 0}
                                    </Typography>
                                </Box>
                                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography color="textSecondary" gutterBottom>
                                        Absent
                                    </Typography>
                                    <Typography variant="h4" color="error.main">
                                        {summary?.absent || 0}
                                    </Typography>
                                </Box>
                                <CancelIcon color="error" sx={{ fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography color="textSecondary" gutterBottom>
                                        Late Arrivals
                                    </Typography>
                                    <Typography variant="h4" color="warning.main">
                                        {summary?.late || 0}
                                    </Typography>
                                </Box>
                                <ScheduleIcon color="warning" sx={{ fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography color="textSecondary" gutterBottom>
                                        Early Leave
                                    </Typography>
                                    <Typography variant="h4" color="info.main">
                                        {summary?.earlyLeave || 0}
                                    </Typography>
                                </Box>
                                <ExitToAppIcon color="info" sx={{ fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography color="textSecondary" gutterBottom>
                                        On Time
                                    </Typography>
                                    <Typography variant="h4" color="success.main">
                                        {summary?.onTime || 0}
                                    </Typography>
                                </Box>
                                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Attendance Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Attendance Details
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Employee ID</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Department</TableCell>
                                    <TableCell>Check In</TableCell>
                                    <TableCell>Check Out</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Source</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data && data.length > 0 ? (
                                    data.map((record) => (
                                        <TableRow key={record._id}>
                                            <TableCell>{record.employee?.employeeId}</TableCell>
                                            <TableCell>
                                                {record.employee?.firstName}{' '}
                                                {record.employee?.lastName}
                                            </TableCell>
                                            <TableCell>{record.department?.name || '-'}</TableCell>
                                            <TableCell>{formatTime(record.checkIn?.time)}</TableCell>
                                            <TableCell>{formatTime(record.checkOut?.time)}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={record.status}
                                                    color={getStatusColor(record.status)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={record.source || 'manual'} size="small" variant="outlined" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            No attendance records found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </PageContainer>
    );
};

export default AttendanceDashboard;
