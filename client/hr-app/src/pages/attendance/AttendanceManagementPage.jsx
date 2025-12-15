import React, { useState, useEffect } from 'react';
import {
    Box,
    Tabs,
    Tab,
    Paper,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Devices as DevicesIcon,
    CloudUpload as CloudUploadIcon,
    Person as PersonIcon,
    Group as GroupIcon,
    Warning as WarningIcon,
    Schedule as ScheduleIcon,
} from '@mui/icons-material';
import AttendanceDashboard from './AttendanceDashboard';
import DeviceManagement from './DeviceManagement';
import AttendanceImport from './AttendanceImport';
import AttendancePage from './AttendancePage';
import { useAuth } from '../../contexts/AuthContext';
import attendanceService from '../../services/attendance.service';
import userService from '../../services/user.service';
import { useNotification } from '../../context/NotificationContext';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`attendance-tabpanel-${index}`}
            aria-labelledby={`attendance-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

// Absence Alerts Tab Component
const AbsenceAlertsTab = () => {
    const [loading, setLoading] = useState(true);
    const [attendances, setAttendances] = useState([]);
    const [users, setUsers] = useState([]);
    const [absenceAlerts, setAbsenceAlerts] = useState([]);
    const { showNotification } = useNotification();

    // Fetch all attendance data and users
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Fetch attendance data for the last 30 days
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                const startDateStr = startDate.toISOString().split('T')[0];
                
                const [attendanceResponse, usersResponse] = await Promise.all([
                    attendanceService.getAll({ startDate: startDateStr, endDate }),
                    userService.getAll()
                ]);
                
                const attendanceArray = Array.isArray(attendanceResponse) 
                    ? attendanceResponse 
                    : (attendanceResponse?.data || []);
                    
                const usersArray = Array.isArray(usersResponse) 
                    ? usersResponse 
                    : (usersResponse?.data || []);
                
                setAttendances(attendanceArray);
                setUsers(usersArray);
                
                // Analyze absence patterns
                analyzeAbsencePatterns(attendanceArray, usersArray);
                
            } catch (error) {
                console.error('Error fetching data:', error);
                showNotification('Failed to fetch attendance data', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [showNotification]);

    // Analyze absence patterns and generate alerts
    const analyzeAbsencePatterns = (attendanceData, userData) => {
        const alerts = [];
        const userAbsenceMap = new Map();

        // Initialize user absence tracking
        userData.forEach(user => {
            userAbsenceMap.set(user._id, {
                user,
                consecutiveAbsences: 0,
                totalAbsences: 0,
                lastAbsenceDate: null,
                absenceDates: []
            });
        });

        // Sort attendance by date
        const sortedAttendance = attendanceData.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Track absences for each user
        sortedAttendance.forEach(record => {
            const userId = record.employee?._id || record.employee;
            const userTracking = userAbsenceMap.get(userId);
            
            if (userTracking) {
                const recordDate = new Date(record.date);
                
                if (record.status === 'absent') {
                    userTracking.totalAbsences++;
                    userTracking.absenceDates.push(recordDate);
                    
                    // Check for consecutive absences
                    if (userTracking.lastAbsenceDate) {
                        const daysDiff = Math.floor((recordDate - userTracking.lastAbsenceDate) / (1000 * 60 * 60 * 24));
                        if (daysDiff === 1) {
                            userTracking.consecutiveAbsences++;
                        } else {
                            userTracking.consecutiveAbsences = 1;
                        }
                    } else {
                        userTracking.consecutiveAbsences = 1;
                    }
                    
                    userTracking.lastAbsenceDate = recordDate;
                } else {
                    // Reset consecutive count if present
                    userTracking.consecutiveAbsences = 0;
                }
            }
        });

        // Generate alerts based on criteria
        userAbsenceMap.forEach((tracking, userId) => {
            const { user, consecutiveAbsences, totalAbsences, absenceDates } = tracking;
            
            if (consecutiveAbsences >= 5) {
                let severity, color, bgColor;
                
                if (consecutiveAbsences >= 11) {
                    severity = 'CRITICAL';
                    color = 'error';
                    bgColor = 'error.main';
                } else if (consecutiveAbsences >= 8) {
                    severity = 'SERIOUS';
                    color = 'warning';
                    bgColor = 'warning.main';
                } else if (consecutiveAbsences >= 5) {
                    severity = 'MODERATE';
                    color = 'info';
                    bgColor = 'info.main';
                }

                alerts.push({
                    id: `absence-${userId}`,
                    user,
                    type: 'consecutive_absence',
                    severity,
                    color,
                    bgColor,
                    days: consecutiveAbsences,
                    message: `${consecutiveAbsences} consecutive days absent`,
                    lastDate: tracking.lastAbsenceDate,
                    priority: consecutiveAbsences >= 11 ? 3 : consecutiveAbsences >= 8 ? 2 : 1
                });
            }
            
            // Also check for high total absences in the period
            if (totalAbsences >= 10 && consecutiveAbsences < 5) {
                alerts.push({
                    id: `total-absence-${userId}`,
                    user,
                    type: 'frequent_absence',
                    severity: 'MODERATE',
                    color: 'warning',
                    bgColor: 'warning.main',
                    days: totalAbsences,
                    message: `${totalAbsences} total absences in 30 days`,
                    lastDate: absenceDates[absenceDates.length - 1],
                    priority: 1
                });
            }
        });

        // Sort alerts by priority (highest first)
        alerts.sort((a, b) => b.priority - a.priority);
        setAbsenceAlerts(alerts);
    };

    const getSeverityDescription = (severity) => {
        switch (severity) {
            case 'MODERATE':
                return '5-7 consecutive days absent';
            case 'SERIOUS':
                return '8-10 consecutive days absent';
            case 'CRITICAL':
                return '11+ consecutive days absent';
            default:
                return '';
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Analyzing attendance patterns...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: 'warning.main' }}>
                🚨 Absence Alerts
            </Typography>

            {/* Severity Criteria Info */}
            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Absence Alert Criteria:</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip label="Moderate: 5-7 days" color="info" size="small" />
                    <Chip label="Serious: 8-10 days" color="warning" size="small" />
                    <Chip label="Critical: 11+ days" color="error" size="small" />
                </Box>
            </Alert>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Total Alerts
                            </Typography>
                            <Typography variant="h4" color="warning.main">
                                {absenceAlerts.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Critical Cases
                            </Typography>
                            <Typography variant="h4" color="error.main">
                                {absenceAlerts.filter(alert => alert.severity === 'CRITICAL').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Serious Cases
                            </Typography>
                            <Typography variant="h4" color="warning.main">
                                {absenceAlerts.filter(alert => alert.severity === 'SERIOUS').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Moderate Cases
                            </Typography>
                            <Typography variant="h4" color="info.main">
                                {absenceAlerts.filter(alert => alert.severity === 'MODERATE').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Alerts Table */}
            <Paper sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    Active Absence Alerts
                </Typography>
                
                {absenceAlerts.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="h6" color="success.main" gutterBottom>
                            🎉 No Active Absence Alerts
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            All employees are maintaining good attendance patterns.
                        </Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Employee</TableCell>
                                    <TableCell>Department</TableCell>
                                    <TableCell>Alert Type</TableCell>
                                    <TableCell>Severity</TableCell>
                                    <TableCell>Days</TableCell>
                                    <TableCell>Last Absence</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {absenceAlerts.map((alert) => (
                                    <TableRow key={alert.id}>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight="600">
                                                    {alert.user?.personalInfo?.fullName || alert.user?.username || 'Unknown'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    ID: {alert.user?.employeeId || 'N/A'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {alert.user?.department?.name || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {alert.type === 'consecutive_absence' ? 'Consecutive Absence' : 'Frequent Absence'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {alert.message}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={alert.severity}
                                                color={alert.color}
                                                size="small"
                                                sx={{ fontWeight: 600 }}
                                            />
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                {getSeverityDescription(alert.severity)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="h6" color={`${alert.color}.main`}>
                                                {alert.days}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {alert.lastDate ? new Date(alert.lastDate).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
            
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                💡 This system automatically tracks all employee attendance and generates alerts based on absence patterns. 
                Data is analyzed for the last 30 days to identify concerning trends.
            </Typography>
        </Box>
    );
};

// Work Hour Deductions Tab Component
const WorkHourDeductionsTab = () => {
    const [loading, setLoading] = useState(true);
    const [attendances, setAttendances] = useState([]);
    const [users, setUsers] = useState([]);
    const [deductions, setDeductions] = useState([]);
    const { showNotification } = useNotification();

    // Constants for deduction rules
    const MINIMUM_DAILY_HOURS = 7;
    const WEEKLY_EXCEPTION_HOURS = 2;

    // Fetch all attendance data and users
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Fetch attendance data for the current week and last week
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 14); // Last 2 weeks for better analysis
                const startDateStr = startDate.toISOString().split('T')[0];
                
                const [attendanceResponse, usersResponse] = await Promise.all([
                    attendanceService.getAll({ startDate: startDateStr, endDate }),
                    userService.getAll()
                ]);
                
                const attendanceArray = Array.isArray(attendanceResponse) 
                    ? attendanceResponse 
                    : (attendanceResponse?.data || []);
                    
                const usersArray = Array.isArray(usersResponse) 
                    ? usersResponse 
                    : (usersResponse?.data || []);
                
                setAttendances(attendanceArray);
                setUsers(usersArray);
                
                // Calculate deductions
                calculateWorkHourDeductions(attendanceArray, usersArray);
                
            } catch (error) {
                console.error('Error fetching data:', error);
                showNotification('Failed to fetch attendance data', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [showNotification]);

    // Calculate work hours from check-in and check-out times
    const calculateWorkHours = (checkIn, checkOut) => {
        if (!checkIn?.time || !checkOut?.time) return 0;
        
        const start = new Date(checkIn.time);
        const end = new Date(checkOut.time);
        const diffMs = end - start;
        
        // Convert to hours and subtract 1 hour for lunch break
        const hours = (diffMs / (1000 * 60 * 60)) - 1;
        return Math.max(0, hours);
    };

    // Get week number for grouping
    const getWeekNumber = (date) => {
        const d = new Date(date);
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + yearStart.getDay() + 1) / 7);
        return `${d.getFullYear()}-W${weekNo}`;
    };

    // Calculate deductions based on criteria
    const calculateWorkHourDeductions = (attendanceData, userData) => {
        const deductionRecords = [];
        const userWeeklyHours = new Map();

        // Group attendance by user and week
        attendanceData.forEach(record => {
            const userId = record.employee?._id || record.employee;
            const user = userData.find(u => u._id === userId);
            
            if (!user || record.status === 'absent' || !record.checkIn?.time || !record.checkOut?.time) {
                return;
            }

            const weekKey = getWeekNumber(record.date);
            const userWeekKey = `${userId}-${weekKey}`;
            
            if (!userWeeklyHours.has(userWeekKey)) {
                userWeeklyHours.set(userWeekKey, {
                    user,
                    week: weekKey,
                    dailyRecords: [],
                    totalShortfall: 0,
                    weeklyExceptionUsed: 0
                });
            }

            const workHours = calculateWorkHours(record.checkIn, record.checkOut);
            const shortfall = Math.max(0, MINIMUM_DAILY_HOURS - workHours);
            
            userWeeklyHours.get(userWeekKey).dailyRecords.push({
                date: record.date,
                workHours,
                shortfall,
                checkIn: record.checkIn,
                checkOut: record.checkOut,
                record
            });
        });

        // Process each user's weekly data
        userWeeklyHours.forEach((weekData, userWeekKey) => {
            const { user, week, dailyRecords } = weekData;
            let remainingException = WEEKLY_EXCEPTION_HOURS;

            // Sort daily records by date
            dailyRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

            dailyRecords.forEach(dayData => {
                const { date, workHours, shortfall, checkIn, checkOut } = dayData;
                
                if (shortfall > 0) {
                    // Apply weekly exception first
                    const exceptionApplied = Math.min(shortfall, remainingException);
                    remainingException -= exceptionApplied;
                    const actualDeduction = shortfall - exceptionApplied;

                    if (actualDeduction > 0) {
                        // Create deduction record
                        deductionRecords.push({
                            id: `deduction-${user._id}-${date}`,
                            user,
                            date: new Date(date),
                            week,
                            type: 'insufficient_hours',
                            workHours: workHours.toFixed(2),
                            requiredHours: MINIMUM_DAILY_HOURS,
                            shortfall: shortfall.toFixed(2),
                            exceptionApplied: exceptionApplied.toFixed(2),
                            deductedHours: actualDeduction.toFixed(2),
                            checkInTime: new Date(checkIn.time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            }),
                            checkOutTime: new Date(checkOut.time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            }),
                            severity: actualDeduction >= 2 ? 'high' : actualDeduction >= 1 ? 'medium' : 'low'
                        });
                    } else if (exceptionApplied > 0) {
                        // Create exception record (no deduction but tracked)
                        deductionRecords.push({
                            id: `exception-${user._id}-${date}`,
                            user,
                            date: new Date(date),
                            week,
                            type: 'exception_applied',
                            workHours: workHours.toFixed(2),
                            requiredHours: MINIMUM_DAILY_HOURS,
                            shortfall: shortfall.toFixed(2),
                            exceptionApplied: exceptionApplied.toFixed(2),
                            deductedHours: '0.00',
                            checkInTime: new Date(checkIn.time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            }),
                            checkOutTime: new Date(checkOut.time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            }),
                            severity: 'exception'
                        });
                    }
                }
            });
        });

        // Sort deductions by date (most recent first)
        deductionRecords.sort((a, b) => b.date - a.date);
        setDeductions(deductionRecords);
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            case 'low':
                return 'info';
            case 'exception':
                return 'success';
            default:
                return 'default';
        }
    };

    const getSeverityLabel = (severity) => {
        switch (severity) {
            case 'high':
                return 'High Impact (2+ hours)';
            case 'medium':
                return 'Medium Impact (1-2 hours)';
            case 'low':
                return 'Low Impact (<1 hour)';
            case 'exception':
                return 'Exception Applied';
            default:
                return '';
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Calculating work hour deductions...</Typography>
            </Box>
        );
    }

    const totalDeductions = deductions.reduce((sum, d) => sum + parseFloat(d.deductedHours), 0);
    const totalExceptions = deductions.reduce((sum, d) => sum + parseFloat(d.exceptionApplied), 0);
    const actualDeductions = deductions.filter(d => d.type === 'insufficient_hours' && parseFloat(d.deductedHours) > 0);
    const exceptionRecords = deductions.filter(d => d.type === 'exception_applied');

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
                ⏰ Work Hour Deductions
            </Typography>

            {/* Deduction Rules Info */}
            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Work Hour Deduction Rules:</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip label="Minimum Daily: 7 hours" color="primary" size="small" />
                    <Chip label="Weekly Exception: 2 hours" color="success" size="small" />
                    <Chip label="Deduction Rate: Per hour" color="warning" size="small" />
                </Box>
            </Alert>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Total Deductions
                            </Typography>
                            <Typography variant="h4" color="error.main">
                                {totalDeductions.toFixed(1)}h
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Exceptions Used
                            </Typography>
                            <Typography variant="h4" color="success.main">
                                {totalExceptions.toFixed(1)}h
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Affected Employees
                            </Typography>
                            <Typography variant="h4" color="warning.main">
                                {new Set(deductions.map(d => d.user._id)).size}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Total Records
                            </Typography>
                            <Typography variant="h4" color="info.main">
                                {deductions.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Deductions Table */}
            <Paper sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    Work Hour Deduction Records
                </Typography>
                
                {deductions.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="h6" color="success.main" gutterBottom>
                            🎉 No Work Hour Deductions
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            All employees are meeting the minimum daily work hour requirements.
                        </Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Employee</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Work Hours</TableCell>
                                    <TableCell>Shortfall</TableCell>
                                    <TableCell>Exception Used</TableCell>
                                    <TableCell>Deducted Hours</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {deductions.map((deduction) => (
                                    <TableRow key={deduction.id}>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight="600">
                                                    {deduction.user?.personalInfo?.fullName || deduction.user?.username || 'Unknown'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {deduction.user?.department?.name || 'N/A'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2">
                                                    {deduction.date.toLocaleDateString()}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {deduction.checkInTime} - {deduction.checkOutTime}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="600">
                                                {deduction.workHours}h
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Required: {deduction.requiredHours}h
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="warning.main" fontWeight="600">
                                                {deduction.shortfall}h
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="success.main" fontWeight="600">
                                                {deduction.exceptionApplied}h
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography 
                                                variant="h6" 
                                                color={parseFloat(deduction.deductedHours) > 0 ? 'error.main' : 'success.main'}
                                                fontWeight="600"
                                            >
                                                {parseFloat(deduction.deductedHours) > 0 ? '-' : ''}{deduction.deductedHours}h
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={deduction.type === 'exception_applied' ? 'Exception' : 'Deducted'}
                                                color={getSeverityColor(deduction.severity)}
                                                size="small"
                                                sx={{ fontWeight: 600 }}
                                            />
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                {getSeverityLabel(deduction.severity)}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
            
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                💡 This system automatically calculates work hour deductions based on a 7-hour minimum daily requirement. 
                Each employee receives a 2-hour weekly exception that is applied before any deductions. 
                Lunch breaks (1 hour) are automatically deducted from total time.
            </Typography>
        </Box>
    );
};

const AttendanceManagementPage = () => {
    const { isHR, isAdmin } = useAuth();
    const canManage = isHR || isAdmin;
    const [mainTab, setMainTab] = useState(0);
    const [attendanceSubTab, setAttendanceSubTab] = useState(0);

    const handleMainTabChange = (event, newValue) => {
        setMainTab(newValue);
    };

    const handleAttendanceSubTabChange = (event, newValue) => {
        setAttendanceSubTab(newValue);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
                Attendance Management
            </Typography>
            
            <Box sx={{ width: '100%' }}>
                {/* Main Tabs */}
                <Paper sx={{ mb: 2 }}>
                    <Tabs
                        value={mainTab}
                        onChange={handleMainTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            '& .MuiTab-root': {
                                minHeight: 64,
                                textTransform: 'none',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                            },
                        }}
                    >
                        <Tab
                            icon={<DashboardIcon />}
                            iconPosition="start"
                            label="Dashboard"
                        />
                        <Tab
                            icon={<PersonIcon />}
                            iconPosition="start"
                            label="Attendance Records"
                        />
                        <Tab
                            icon={<DevicesIcon />}
                            iconPosition="start"
                            label="Device Management"
                            sx={{ display: canManage ? 'flex' : 'none' }}
                        />
                        <Tab
                            icon={<CloudUploadIcon />}
                            iconPosition="start"
                            label="Import Attendance"
                            sx={{ display: canManage ? 'flex' : 'none' }}
                        />
                    </Tabs>
                </Paper>

                {/* Dashboard Tab */}
                <TabPanel value={mainTab} index={0}>
                    <AttendanceDashboard />
                </TabPanel>

                {/* Attendance Records Tab with Sub-tabs */}
                <TabPanel value={mainTab} index={1}>
                    <Paper sx={{ mb: 2 }}>
                        <Tabs
                            value={attendanceSubTab}
                            onChange={handleAttendanceSubTabChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                borderBottom: 1,
                                borderColor: 'divider',
                                '& .MuiTab-root': {
                                    minHeight: 48,
                                    textTransform: 'none',
                                },
                            }}
                        >
                            <Tab
                                icon={<PersonIcon fontSize="small" />}
                                iconPosition="start"
                                label="My Attendance"
                            />
                            <Tab
                                icon={<GroupIcon fontSize="small" />}
                                iconPosition="start"
                                label="All Users Attendance"
                                sx={{ display: canManage ? 'flex' : 'none' }}
                            />
                            <Tab
                                icon={<WarningIcon fontSize="small" />}
                                iconPosition="start"
                                label="Absence Alerts"
                                sx={{ display: canManage ? 'flex' : 'none' }}
                            />
                            <Tab
                                icon={<ScheduleIcon fontSize="small" />}
                                iconPosition="start"
                                label="Work Hour Deductions"
                                sx={{ display: canManage ? 'flex' : 'none' }}
                            />
                        </Tabs>
                    </Paper>

                    {/* My Attendance Sub-tab */}
                    <Box sx={{ display: attendanceSubTab === 0 ? 'block' : 'none' }}>
                        <AttendancePage viewMode="my" />
                    </Box>

                    {/* All Users Attendance Sub-tab */}
                    <Box sx={{ display: attendanceSubTab === 1 ? 'block' : 'none' }}>
                        {canManage ? <AttendancePage viewMode="all" /> : <Box sx={{ p: 3 }}><Typography>Access Denied</Typography></Box>}
                    </Box>

                    {/* Absence Alerts Sub-tab */}
                    <Box sx={{ display: attendanceSubTab === 2 ? 'block' : 'none' }}>
                        {canManage ? <AbsenceAlertsTab /> : <Box sx={{ p: 3 }}><Typography>Access Denied</Typography></Box>}
                    </Box>

                    {/* Work Hour Deductions Sub-tab */}
                    <Box sx={{ display: attendanceSubTab === 3 ? 'block' : 'none' }}>
                        {canManage ? <WorkHourDeductionsTab /> : <Box sx={{ p: 3 }}><Typography>Access Denied</Typography></Box>}
                    </Box>
                </TabPanel>

                {/* Device Management Tab (HR/Admin only) */}
                <TabPanel value={mainTab} index={2}>
                    {canManage ? <DeviceManagement /> : <Box sx={{ p: 3 }}><Typography>Access Denied</Typography></Box>}
                </TabPanel>

                {/* Import Attendance Tab (HR/Admin only) */}
                <TabPanel value={mainTab} index={3}>
                    {canManage ? <AttendanceImport /> : <Box sx={{ p: 3 }}><Typography>Access Denied</Typography></Box>}
                </TabPanel>
            </Box>
        </Box>
    );
};

export default AttendanceManagementPage;
