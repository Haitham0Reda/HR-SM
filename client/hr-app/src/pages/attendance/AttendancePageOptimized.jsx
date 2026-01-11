import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Typography,
    Chip,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    MenuItem,
    Grid,
    Card,
    CardContent,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Add as AddIcon,
    FilterList as FilterIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import attendanceService from '../../services/attendance.service';
import userService from '../../services/user.service';
import departmentService from '../../services/department.service';

const AttendancePageOptimized = ({ viewMode = 'my' }) => {
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    
    // State management
    const [attendances, setAttendances] = useState([]);
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    
    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    
    // Filter state
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        employee: '',
        status: '',
        department: ''
    });
    
    const canManage = isHR || isAdmin;
    
    // Debounced fetch function
    const fetchAttendances = useCallback(async () => {
        if (!user?._id && !user?.id) {
            console.log('User not loaded yet');
            return;
        }
        
        try {
            setLoading(true);
            
            const params = {
                page: page + 1, // API expects 1-based pagination
                limit: rowsPerPage,
                sortBy: 'date',
                sortOrder: 'desc',
                ...filters
            };
            
            // Add employee filter for 'my' view mode
            if (viewMode === 'my') {
                params.employee = user._id || user.id;
            }
            
            console.log('Fetching attendance with params:', params);
            
            const response = await attendanceService.getAll(params);
            
            // Handle different response formats
            let attendanceData = [];
            let total = 0;
            
            if (response?.data && Array.isArray(response.data)) {
                attendanceData = response.data;
                total = response.totalCount || response.total || attendanceData.length;
            } else if (Array.isArray(response)) {
                attendanceData = response;
                total = attendanceData.length;
            } else if (response?.attendances) {
                attendanceData = response.attendances;
                total = response.totalCount || response.total || attendanceData.length;
            }
            
            setAttendances(attendanceData);
            setTotalCount(total);
            
            console.log(`Loaded ${attendanceData.length} records, total: ${total}`);
            
        } catch (error) {
            console.error('Error fetching attendance:', error);
            showNotification(
                error.response?.data?.message || 'Failed to fetch attendance records', 
                'error'
            );
            setAttendances([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [user, page, rowsPerPage, filters, viewMode, showNotification]);
    
    // Fetch supporting data
    const fetchSupportingData = useCallback(async () => {
        if (!canManage) return;
        
        try {
            const [usersResponse, departmentsResponse] = await Promise.all([
                userService.getAll({ limit: 100 }), // Limit users for performance
                departmentService.getAll()
            ]);
            
            setUsers(Array.isArray(usersResponse) ? usersResponse : usersResponse?.data || []);
            setDepartments(Array.isArray(departmentsResponse) ? departmentsResponse : departmentsResponse?.data || []);
        } catch (error) {
            console.error('Error fetching supporting data:', error);
        }
    }, [canManage]);
    
    // Initial load
    useEffect(() => {
        if (user?._id || user?.id) {
            fetchAttendances();
            fetchSupportingData();
        }
    }, [fetchAttendances, fetchSupportingData]);
    
    // Handle filter changes
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPage(0); // Reset to first page when filters change
    };
    
    // Handle pagination
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };
    
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    
    // Apply filters
    const handleApplyFilters = () => {
        setPage(0);
        fetchAttendances();
    };
    
    // Reset filters
    const handleResetFilters = () => {
        setFilters({
            startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            employee: '',
            status: '',
            department: ''
        });
        setPage(0);
    };
    
    // Status color helper
    const getStatusColor = (status) => {
        const colors = {
            'on-time': 'success',
            'present': 'success',
            'late': 'warning',
            'absent': 'error',
            'work-from-home': 'info',
            'vacation': 'primary',
            'sick-leave': 'secondary'
        };
        return colors[status] || 'default';
    };
    
    // Format time helper
    const formatTime = (timeObj) => {
        if (!timeObj?.time) return 'N/A';
        return new Date(timeObj.time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    // Format date helper
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };
    
    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {viewMode === 'my' ? 'My Attendance' : 'Attendance Management'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchAttendances}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                    {canManage && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => {/* Handle add attendance */}}
                        >
                            Add Record
                        </Button>
                    )}
                </Box>
            </Box>
            
            {/* Filters */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Filters</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            label="Start Date"
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            label="End Date"
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    {canManage && (
                        <>
                            <Grid item xs={12} sm={6} md={2}>
                                <TextField
                                    select
                                    label="Employee"
                                    value={filters.employee}
                                    onChange={(e) => handleFilterChange('employee', e.target.value)}
                                    fullWidth
                                    size="small"
                                >
                                    <MenuItem value="">All Employees</MenuItem>
                                    {users.map((user) => (
                                        <MenuItem key={user._id} value={user._id}>
                                            {user.personalInfo?.firstName && user.personalInfo?.lastName
                                                ? `${user.personalInfo.firstName} ${user.personalInfo.lastName}`
                                                : user.username || user.email}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <TextField
                                    select
                                    label="Department"
                                    value={filters.department}
                                    onChange={(e) => handleFilterChange('department', e.target.value)}
                                    fullWidth
                                    size="small"
                                >
                                    <MenuItem value="">All Departments</MenuItem>
                                    {departments.map((dept) => (
                                        <MenuItem key={dept._id} value={dept._id}>
                                            {dept.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        </>
                    )}
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            select
                            label="Status"
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            fullWidth
                            size="small"
                        >
                            <MenuItem value="">All Status</MenuItem>
                            <MenuItem value="on-time">On Time</MenuItem>
                            <MenuItem value="late">Late</MenuItem>
                            <MenuItem value="absent">Absent</MenuItem>
                            <MenuItem value="work-from-home">Work From Home</MenuItem>
                            <MenuItem value="vacation">Vacation</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="contained"
                                startIcon={<FilterIcon />}
                                onClick={handleApplyFilters}
                                disabled={loading}
                                size="small"
                            >
                                Apply
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleResetFilters}
                                disabled={loading}
                                size="small"
                            >
                                Reset
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
            
            {/* Summary Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Summary</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" color="primary">{totalCount}</Typography>
                                <Typography variant="body2" color="text.secondary">Total Records</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" color="success.main">
                                    {attendances.filter(a => ['on-time', 'present'].includes(a.status)).length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">On Time</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" color="warning.main">
                                    {attendances.filter(a => a.status === 'late').length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Late</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" color="error.main">
                                    {attendances.filter(a => a.status === 'absent').length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Absent</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
            
            {/* Data Table */}
            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {canManage && <TableCell>Employee</TableCell>}
                                <TableCell>Date</TableCell>
                                <TableCell>Check In</TableCell>
                                <TableCell>Check Out</TableCell>
                                <TableCell>Hours</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Notes</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={canManage ? 7 : 6} align="center" sx={{ py: 4 }}>
                                        <CircularProgress />
                                        <Typography variant="body2" sx={{ mt: 1 }}>Loading attendance records...</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : attendances.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={canManage ? 7 : 6} align="center" sx={{ py: 4 }}>
                                        <Alert severity="info">
                                            No attendance records found for the selected criteria.
                                        </Alert>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                attendances.map((attendance) => (
                                    <TableRow key={attendance._id} hover>
                                        {canManage && (
                                            <TableCell>
                                                {attendance.employee?.personalInfo?.firstName && attendance.employee?.personalInfo?.lastName
                                                    ? `${attendance.employee.personalInfo.firstName} ${attendance.employee.personalInfo.lastName}`
                                                    : attendance.employee?.username || attendance.employee?.email || 'N/A'}
                                            </TableCell>
                                        )}
                                        <TableCell>{formatDate(attendance.date)}</TableCell>
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                color={attendance.checkIn?.isLate ? 'warning.main' : 'text.primary'}
                                            >
                                                {formatTime(attendance.checkIn)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                color={attendance.checkOut?.isEarly ? 'warning.main' : 'text.primary'}
                                            >
                                                {formatTime(attendance.checkOut)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {attendance.hours?.actual ? `${attendance.hours.actual}h` : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={attendance.status}
                                                color={getStatusColor(attendance.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" noWrap>
                                                {attendance.notes || '-'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                
                {/* Pagination */}
                <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    showFirstButton
                    showLastButton
                />
            </Paper>
        </Box>
    );
};

export default AttendancePageOptimized;