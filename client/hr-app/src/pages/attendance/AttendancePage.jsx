import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Card,
    CardContent,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    FilterList as FilterIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import DateInput from '../../components/common/DateInput';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import attendanceService from '../../services/attendance.service';
import userService from '../../services/user.service';
import departmentService from '../../services/department.service';

const AttendancePage = ({ viewMode = 'my' }) => {
    const { user, isHR, isAdmin } = useAuth();
    const { showNotification } = useNotification();
    
    // State management
    const [attendances, setAttendances] = useState([]);
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    
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
    
    // Form data for dialog
    const [formData, setFormData] = useState({
        employee: '',
        date: new Date().toISOString().split('T')[0],
        checkIn: '',
        checkOut: '',
        status: 'present',
        notes: ''
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
                total = response.pagination?.totalRecords || response.totalCount || response.total || attendanceData.length;
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
    
    // Handle filter changes with debouncing to prevent rapid updates
    const handleFilterChange = useCallback((field, value) => {
        // Use functional update to prevent unnecessary re-renders
        setFilters(prev => {
            // Only update if value actually changed
            if (prev[field] === value) return prev;
            return { ...prev, [field]: value };
        });
        setPage(0); // Reset to first page when filters change
    }, []);
    
    // Debounced filter application to prevent rapid API calls
    const debouncedApplyFilters = useCallback(() => {
        // Use requestAnimationFrame to defer execution to next frame
        requestAnimationFrame(() => {
            fetchAttendances();
        });
    }, [fetchAttendances]);
    
    // Handle pagination with optimized updates
    const handleChangePage = useCallback((event, newPage) => {
        setPage(newPage);
    }, []);
    
    const handleChangeRowsPerPage = useCallback((event) => {
        const newRowsPerPage = parseInt(event.target.value, 10);
        setRowsPerPage(newRowsPerPage);
        setPage(0);
    }, []);
    
    // Apply filters with debouncing to prevent rapid API calls
    const handleApplyFilters = useCallback(async () => {
        setPage(0);
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
            debouncedApplyFilters();
        });
    }, [debouncedApplyFilters]);
    
    // Reset filters with optimized state update
    const handleResetFilters = useCallback(() => {
        const defaultFilters = {
            startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            employee: '',
            status: '',
            department: ''
        };
        
        // Batch state updates to prevent multiple re-renders
        setFilters(defaultFilters);
        setPage(0);
        
        // Defer the API call to prevent blocking
        setTimeout(() => {
            fetchAttendances();
        }, 0);
    }, [fetchAttendances]);
    
    // Dialog handlers with optimized performance
    const handleOpenDialog = useCallback((attendance = null) => {
        if (attendance) {
            setSelectedAttendance(attendance);

            // Extract time from checkIn/checkOut objects if they exist
            let checkInTime = '';
            let checkOutTime = '';

            if (attendance.checkIn?.time) {
                const checkInDate = new Date(attendance.checkIn.time);
                checkInTime = checkInDate.toTimeString().slice(0, 5); // HH:MM format
            } else if (typeof attendance.checkIn === 'string') {
                checkInTime = attendance.checkIn;
            }

            if (attendance.checkOut?.time) {
                const checkOutDate = new Date(attendance.checkOut.time);
                checkOutTime = checkOutDate.toTimeString().slice(0, 5); // HH:MM format
            } else if (typeof attendance.checkOut === 'string') {
                checkOutTime = attendance.checkOut;
            }

            setFormData({
                employee: attendance.employee?._id || attendance.employee || '',
                date: attendance.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                checkIn: checkInTime,
                checkOut: checkOutTime,
                status: attendance.status || 'present',
                notes: attendance.notes || ''
            });
        } else {
            setSelectedAttendance(null);
            setFormData({
                employee: '',
                date: new Date().toISOString().split('T')[0],
                checkIn: '',
                checkOut: '',
                status: 'present',
                notes: ''
            });
        }
        setOpenDialog(true);
    }, []);

    const handleCloseDialog = useCallback(() => {
        setOpenDialog(false);
        setSelectedAttendance(null);
    }, []);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = useCallback(async () => {
        try {
            // Prepare data with proper structure for the backend
            const submitData = {
                employee: formData.employee,
                date: formData.date,
                status: formData.status,
                notes: formData.notes
            };

            // Add checkIn/checkOut as nested objects if provided
            if (formData.checkIn) {
                const checkInDateTime = new Date(`${formData.date}T${formData.checkIn}`);
                submitData.checkIn = {
                    time: checkInDateTime,
                    method: 'manual',
                    location: 'office'
                };
            }

            if (formData.checkOut) {
                const checkOutDateTime = new Date(`${formData.date}T${formData.checkOut}`);
                submitData.checkOut = {
                    time: checkOutDateTime,
                    method: 'manual',
                    location: 'office'
                };
            }

            if (selectedAttendance) {
                await attendanceService.update(selectedAttendance._id, submitData);
                showNotification('Attendance updated successfully', 'success');
            } else {
                await attendanceService.create(submitData);
                showNotification('Attendance recorded successfully', 'success');
            }
            handleCloseDialog();
            
            // Defer the refresh to prevent blocking
            setTimeout(() => {
                fetchAttendances();
            }, 0);
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    }, [formData, selectedAttendance, handleCloseDialog, fetchAttendances, showNotification]);

    const handleDelete = useCallback(async () => {
        try {
            await attendanceService.delete(selectedAttendance._id);
            showNotification('Attendance record deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedAttendance(null);
            
            // Defer the refresh to prevent blocking
            setTimeout(() => {
                fetchAttendances();
            }, 0);
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    }, [selectedAttendance, fetchAttendances, showNotification]);
    
    // Memoized helper functions for better performance
    const getStatusColor = useCallback((status) => {
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
    }, []);
    
    const formatTime = useCallback((timeObj) => {
        if (!timeObj?.time) return 'N/A';
        return new Date(timeObj.time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);
    
    const formatDate = useCallback((dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }, []);
    
    // Memoized summary calculations to prevent expensive re-calculations on every render
    const summaryStats = useMemo(() => {
        return {
            totalCount,
            onTime: attendances.filter(a => ['on-time', 'present'].includes(a.status)).length,
            late: attendances.filter(a => a.status === 'late').length,
            absent: attendances.filter(a => a.status === 'absent').length
        };
    }, [attendances, totalCount]);
    
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
                            onClick={() => handleOpenDialog()}
                        >
                            Add Record
                        </Button>
                    )}
                </Box>
            </Box>
            
            {/* Filters */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>Filters</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Date Range Row */}
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: '200px' }}>
                            <DateInput label="Start Date" value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                fullWidth
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: '200px' }}>
                            <DateInput label="End Date" value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                fullWidth
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                        </Box>
                    </Box>

                    {/* Employee & Department Row (HR/Admin only) */}
                    {canManage && (
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: 1, minWidth: '200px' }}>
                                <TextField
                                    select
                                    label="Employee"
                                    value={filters.employee}
                                    onChange={(e) => handleFilterChange('employee', e.target.value)}
                                    fullWidth
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
                            </Box>
                            <Box sx={{ flex: 1, minWidth: '200px' }}>
                                <TextField
                                    select
                                    label="Department"
                                    value={filters.department}
                                    onChange={(e) => handleFilterChange('department', e.target.value)}
                                    fullWidth
                                >
                                    <MenuItem value="">All Departments</MenuItem>
                                    {departments.map((dept) => (
                                        <MenuItem key={dept._id} value={dept._id}>
                                            {dept.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>
                        </Box>
                    )}

                    {/* Status & Actions Row */}
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'end' }}>
                        <Box sx={{ flex: 1, minWidth: '200px' }}>
                            <TextField
                                select
                                label="Status"
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                fullWidth
                            >
                                <MenuItem value="">All Status</MenuItem>
                                <MenuItem value="on-time">On Time</MenuItem>
                                <MenuItem value="late">Late</MenuItem>
                                <MenuItem value="absent">Absent</MenuItem>
                                <MenuItem value="work-from-home">Work From Home</MenuItem>
                                <MenuItem value="vacation">Vacation</MenuItem>
                            </TextField>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, minWidth: '200px' }}>
                            <Button
                                variant="contained"
                                startIcon={<FilterIcon />}
                                onClick={handleApplyFilters}
                                disabled={loading}
                                sx={{ flex: 1, height: '56px' }}
                            >
                                Apply
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleResetFilters}
                                disabled={loading}
                                sx={{ flex: 1, height: '56px' }}
                            >
                                Reset
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Paper>
            
            {/* Summary Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 3 }}>Summary</Typography>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: '150px', textAlign: 'center' }}>
                            <Typography variant="h4" color="primary">{summaryStats.totalCount}</Typography>
                            <Typography variant="body2" color="text.secondary">Total Records</Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: '150px', textAlign: 'center' }}>
                            <Typography variant="h4" color="success.main">
                                {summaryStats.onTime}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">On Time</Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: '150px', textAlign: 'center' }}>
                            <Typography variant="h4" color="warning.main">
                                {summaryStats.late}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Late</Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: '150px', textAlign: 'center' }}>
                            <Typography variant="h4" color="error.main">
                                {summaryStats.absent}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Absent</Typography>
                        </Box>
                    </Box>
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
                                {canManage && <TableCell>Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={canManage ? 8 : 6} align="center" sx={{ py: 4 }}>
                                        <CircularProgress />
                                        <Typography variant="body2" sx={{ mt: 1 }}>Loading attendance records...</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : attendances.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={canManage ? 8 : 6} align="center" sx={{ py: 4 }}>
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
                                        {canManage && (
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenDialog(attendance)}
                                                        color="primary"
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                            setSelectedAttendance(attendance);
                                                            setOpenConfirm(true);
                                                        }}
                                                        color="error"
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            </TableCell>
                                        )}
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

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedAttendance ? 'Edit Attendance' : 'Add Attendance Record'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {canManage && (
                            <Grid item xs={12}>
                                <TextField
                                    select
                                    name="employee"
                                    label="Employee"
                                    value={formData.employee}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                >
                                    {users.map((user) => (
                                        <MenuItem key={user._id} value={user._id}>
                                            {user.personalInfo?.firstName && user.personalInfo?.lastName
                                                ? `${user.personalInfo.firstName} ${user.personalInfo.lastName}`
                                                : user.username || user.email}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        )}
                        <Grid item xs={12}>
                            <DateInput name="date"
                                label="Date" value={formData.date}
                                onChange={handleChange}
                                fullWidth
                                required
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                name="checkIn"
                                label="Check In Time"
                                type="time"
                                value={formData.checkIn}
                                onChange={handleChange}
                                fullWidth
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                name="checkOut"
                                label="Check Out Time"
                                type="time"
                                value={formData.checkOut}
                                onChange={handleChange}
                                fullWidth
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                select
                                name="status"
                                label="Status"
                                value={formData.status}
                                onChange={handleChange}
                                fullWidth
                                required
                            >
                                <MenuItem value="on-time">On Time</MenuItem>
                                <MenuItem value="late">Late</MenuItem>
                                <MenuItem value="absent">Absent</MenuItem>
                                <MenuItem value="work-from-home">Work From Home</MenuItem>
                                <MenuItem value="vacation">Vacation</MenuItem>
                                <MenuItem value="sick-leave">Sick Leave</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                name="notes"
                                label="Notes"
                                value={formData.notes}
                                onChange={handleChange}
                                fullWidth
                                multiline
                                rows={3}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedAttendance ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={openConfirm}
                onClose={() => setOpenConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Attendance Record"
                message="Are you sure you want to delete this attendance record? This action cannot be undone."
            />
        </Box>
    );
};

export default AttendancePage;