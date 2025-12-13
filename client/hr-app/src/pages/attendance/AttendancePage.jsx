import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
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
    Card,
    CardContent,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Print as PrintIcon,
    FilterList as FilterIcon,
    Assessment as ReportIcon,
    Person as PersonIcon,
    TrendingUp as TrendingUpIcon,
    CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import attendanceService from '../../services/attendance.service';
import userService from '../../services/user.service';
import { getHolidayInfo } from '../../utils/holidayChecker';

const AttendancePage = ({ viewMode = 'my' }) => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { user, isHR, isAdmin } = useAuth();
    const [attendances, setAttendances] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [formData, setFormData] = useState({
        employee: '',
        date: new Date().toISOString().split('T')[0],
        checkIn: '',
        checkOut: '',
        status: 'present',
        notes: ''
    });

    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const { showNotification } = useNotification();

    // Check if user can manage attendance (HR/Admin)
    const canManage = isHR || isAdmin;

    const statuses = ['present', 'absent', 'late', 'half-day', 'work-from-home'];

    const fetchAttendances = async () => {
        try {
            setLoading(true);
            console.log('Fetching attendance records...');
            const response = await attendanceService.getAll();
            console.log('Attendance API response:', response);

            // The API interceptor should have already extracted the data
            // Handle different response formats
            let attendanceArray = [];
            if (Array.isArray(response)) {
                attendanceArray = response;
            } else if (response?.data && Array.isArray(response.data)) {
                attendanceArray = response.data;
            } else if (response?.attendances && Array.isArray(response.attendances)) {
                attendanceArray = response.attendances;
            }

            console.log('Processed attendance array:', attendanceArray);
            console.log('Current user:', user);
            console.log('Can manage:', canManage);

            // Filter to show only current user's attendance if not HR/Admin
            const filteredData = canManage
                ? attendanceArray
                : attendanceArray.filter(att => {
                    const employeeId = att.employee?._id || att.employee;
                    const userId = user?._id;
                    console.log('Comparing:', employeeId, 'with', userId);
                    return employeeId === userId;
                });

            console.log('Filtered attendance data:', filteredData);
            setAttendances(filteredData);
        } catch (error) {
            console.error('Error fetching attendance:', error);
            console.error('Error details:', error.response?.data);
            showNotification(error.response?.data?.message || 'Failed to fetch attendance records', 'error');
            setAttendances([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await userService.getAll();
            const usersArray = Array.isArray(data) ? data : (data?.data || []);
            setUsers(usersArray);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        }
    };

    useEffect(() => {
        if (user) {
            fetchAttendances();
            if (canManage) {
                fetchUsers();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?._id, canManage]);

    const handleOpenDialog = (attendance = null) => {
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
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedAttendance(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
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
            fetchAttendances();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await attendanceService.delete(selectedAttendance._id);
            showNotification('Attendance record deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedAttendance(null);
            fetchAttendances();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            present: 'success',
            absent: 'error',
            late: 'warning',
            'half-day': 'info',
            'work-from-home': 'primary'
        };
        return colors[status] || 'default';
    };

    const columns = [
        // Only show employee column if user can manage (HR/Admin)
        ...(canManage ? [{
            id: 'employee',
            label: 'Employee',
            render: (row) => row.employee?.personalInfo?.fullName || row.employee?.username || 'N/A'
        }] : []),
        {
            id: 'date',
            label: 'Date',
            render: (row) => new Date(row.date).toLocaleDateString()
        },
        {
            id: 'checkIn',
            label: 'Check In',
            render: (row) => {
                if (row.checkIn?.time) {
                    return new Date(row.checkIn.time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
                if (typeof row.checkIn === 'string') {
                    return row.checkIn;
                }
                return 'N/A';
            }
        },
        {
            id: 'checkOut',
            label: 'Check Out',
            render: (row) => {
                if (row.checkOut?.time) {
                    return new Date(row.checkOut.time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
                if (typeof row.checkOut === 'string') {
                    return row.checkOut;
                }
                return 'N/A';
            }
        },
        {
            id: 'status',
            label: 'Status',
            render: (row) => (
                <Chip
                    label={row.status}
                    color={getStatusColor(row.status)}
                    size="small"
                />
            )
        },
        { 
            id: 'notes', 
            label: 'Notes',
            render: (row) => row.notes || '-'
        },
        // Only show actions if user can manage (HR/Admin)
        ...(canManage ? [{
            id: 'actions',
            label: 'Actions',
            align: 'center',
            render: (row) => (
                <Box>
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
                            setSelectedAttendance(row);
                            setOpenConfirm(true);
                        }}
                        color="error"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            )
        }] : [])
    ];

    const handleFilter = () => {
        fetchAttendances();
    };

    const handlePrint = () => {
        // Create a new window for printing
        const printWindow = window.open('', '', 'height=600,width=800');

        // Build the table HTML manually
        let tableHTML = '<table><thead><tr>';
        tableHTML += '<th>DATE</th><th>DAY</th><th>FIRST CHECK</th><th>LAST CHECK</th>';
        tableHTML += '<th>WORKING HOURS</th><th>OVERTIME</th><th>STATUS</th><th>ACTIONS</th>';
        tableHTML += '</tr></thead><tbody>';

        // Add data rows
        filteredAttendances.forEach((attendance) => {
            tableHTML += '<tr>';
            tableHTML += `<td>${formatDate(attendance.date)}</td>`;
            tableHTML += `<td>${getDayName(attendance.date)}</td>`;

            // First Check
            const checkInTime = formatTime(attendance.checkIn);
            const checkInClass = attendance.checkIn?.isLate ? 'time-late' : 'time-ontime';
            tableHTML += `<td><span class="${checkInClass}">${checkInTime}</span>${attendance.checkIn?.isLate ? '<br><small>Late</small>' : ''}</td>`;

            // Last Check
            const checkOutTime = formatTime(attendance.checkOut);
            const checkOutClass = attendance.checkOut?.isEarly ? 'time-late' : 'time-ontime';
            tableHTML += `<td><span class="${checkOutClass}">${checkOutTime}</span>${attendance.checkOut?.isEarly ? '<br><small>Early</small>' : ''}</td>`;

            // Working Hours
            tableHTML += `<td>${calculateWorkingHours(attendance.checkIn, attendance.checkOut)}</td>`;

            // Overtime
            const overtime = attendance.hours?.overtime > 0 ? `${attendance.hours.overtime} hours` : 'N/A';
            tableHTML += `<td>${overtime}</td>`;

            // Status
            const statusLabel = getStatusLabel(attendance.status);
            const statusColor = getStatusColor(attendance.status);
            let statusClass = 'status-info';
            if (statusColor === 'success') statusClass = 'status-success';
            else if (statusColor === 'warning') statusClass = 'status-warning';
            else if (statusColor === 'error') statusClass = 'status-error';
            tableHTML += `<td><span class="status-chip ${statusClass}">${statusLabel}</span></td>`;

            // Actions
            const action = attendance.checkIn?.isLate ? '⚠ LATE ARRIVAL' : '';
            tableHTML += `<td>${action}</td>`;

            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';

        // Write the HTML content
        printWindow.document.write('<html><head><title>Attendance Report</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            body { 
                font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif; 
                margin: 20px; 
                color: #333;
            }
            h1 { 
                color: #007bff;
                margin-bottom: 10px;
                font-size: 28px;
                font-weight: 700;
            }
            .info { 
                margin-bottom: 20px; 
                font-size: 14px; 
                line-height: 1.8;
                padding: 15px;
                background-color: #f5f7fa;
                border-left: 4px solid #007bff;
                border-radius: 4px;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 20px; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            th { 
                background: #007bff;
                color: white; 
                padding: 14px 10px; 
                text-align: left; 
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            td { 
                padding: 12px 10px; 
                border-bottom: 1px solid #e0e0e0;
                font-size: 13px;
            }
            tr:nth-child(even) { 
                background-color: #fafbfc;
            }
            tr:hover { 
                background-color: #f0f4f8;
            }
            .status-chip { 
                padding: 5px 14px; 
                border-radius: 20px; 
                font-size: 11px; 
                font-weight: 600; 
                display: inline-block;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            .status-success { 
                background-color: #10b981; 
                color: white; 
            }
            .status-warning { 
                background-color: #f59e0b; 
                color: white; 
            }
            .status-error { 
                background-color: #ef4444; 
                color: white; 
            }
            .status-info { 
                background-color: #3b82f6; 
                color: white; 
            }
            .time-late { 
                color: #f59e0b; 
                font-weight: 600; 
            }
            .time-ontime { 
                color: #10b981; 
                font-weight: 600; 
            }
            small { 
                color: #6b7280; 
                font-size: 10px; 
                font-style: italic;
            }
            @media print { 
                body { margin: 10mm; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
            }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write('<h1>Attendance Report</h1>');
        printWindow.document.write(`
            <div class="info">
                <strong>Employee:</strong> ${user?.personalInfo?.fullName || user?.username}<br>
                <strong>Employee ID:</strong> ${user?.employeeId || 'N/A'}<br>
                <strong>Department:</strong> ${user?.department?.name || 'N/A'}<br>
                <strong>Report Period:</strong> ${formatDate(startDate)} - ${formatDate(endDate)}<br>
                <strong>Total Records:</strong> ${filteredAttendances.length}
            </div>
        `);
        printWindow.document.write(tableHTML);
        printWindow.document.write('</body></html>');

        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    // Calculate statistics
    const filteredAttendances = attendances.filter(att => {
        const attDate = new Date(att.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return attDate >= start && attDate <= end;
    });


    const stats = {
        totalDays: filteredAttendances.length,
        present: filteredAttendances.filter(a => ['present', 'on-time', 'late'].includes(a.status)).length,
        absent: filteredAttendances.filter(a => a.status === 'absent').length,
        late: filteredAttendances.filter(a => a.status === 'late').length,
        weekends: filteredAttendances.filter(a => a.status === 'weekend').length,
    };

    const getStatusLabel = (status) => {
        const labels = {
            'on-time': 'ON TIME',
            'present': 'ON TIME',
            'late': 'LATE ARRIVAL',
            'absent': 'ABSENT',
            'weekend': 'WEEKEND',
            'vacation': 'VACATION',
            'sick-leave': 'SICK LEAVE',
            'work-from-home': 'WORK FROM HOME',
            'half-day': 'HALF DAY',
        };
        return labels[status] || status.toUpperCase();
    };

    const formatTime = (timeObj) => {
        if (!timeObj?.time) return 'N/A';
        const date = new Date(timeObj.time);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const calculateWorkingHours = (checkIn, checkOut) => {
        if (!checkIn?.time || !checkOut?.time) return 'N/A';

        const start = new Date(checkIn.time);
        const end = new Date(checkOut.time);
        const diff = end - start;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours} hours ${minutes} mins`;
    };

    const getDayName = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) return <Loading />;

    // If user is not HR/Admin, show the report view
    if (!canManage) {
        return (
            <Box sx={{ p: 3, minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        My Attendance
                    </Typography>
                </Box>

                {/* Report Header Card */}
                <Paper sx={{
                    p: 3,
                    background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                    color: 'white',
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0, 123, 255, 0.4)',
                    border: 'none'
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <ReportIcon sx={{ fontSize: 32 }} />
                            <Typography variant="h6" fontWeight="600">
                                My Attendance Report
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<PrintIcon />}
                            onClick={handlePrint}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.25)',
                                color: 'white',
                                fontWeight: 600,
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.35)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                }
                            }}
                        >
                            Print Report
                        </Button>
                    </Box>
                </Paper>

                {/* Date Filter */}
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                        <Box sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '200px' }}>
                            <TextField
                                label="Start Date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '200px' }}>
                            <TextField
                                label="End Date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '200px' }}>
                            <Button
                                variant="contained"
                                startIcon={<FilterIcon />}
                                onClick={handleFilter}
                                fullWidth
                                sx={{
                                    height: 56,
                                    fontWeight: 600
                                }}
                            >
                                Filter
                            </Button>
                        </Box>
                    </Box>
                </Paper>

                {/* Summary Cards */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {/* Employee Information */}
                    <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                        <Card sx={{
                            height: '100%',
                            borderRadius: 3,
                            boxShadow: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.15)'
                            }
                        }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <PersonIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                                    <Typography variant="h6" fontWeight="600" sx={{ color: 'primary.main' }}>
                                        Employee Information
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Employee ID:</Typography>
                                        <Typography variant="body2" fontWeight="600">{user?.employeeId || 'N/A'}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Name:</Typography>
                                        <Typography variant="body2" fontWeight="600">{user?.personalInfo?.fullName || user?.username}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Position:</Typography>
                                        <Typography variant="body2" fontWeight="600">
                                            {user?.position?.title || 'N/A'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Status:</Typography>
                                        <Chip
                                            label="Active"
                                            color="success"
                                            size="small"
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Department:</Typography>
                                        <Typography variant="body2" fontWeight="600">
                                            {user?.department?.name || 'N/A'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Report Period:</Typography>
                                        <Typography variant="body2" fontWeight="600">
                                            {formatDate(startDate)} - {formatDate(endDate)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Attendance Summary */}
                    <Box sx={{ flex: '1 1 calc(50% - 24px)', minWidth: '300px' }}>
                        <Card sx={{
                            height: '100%',
                            borderRadius: 3,
                            boxShadow: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.15)'
                            }
                        }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                                    <Typography variant="h6" fontWeight="600" sx={{ color: 'primary.main' }}>
                                        Attendance Summary
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            (Excluding weekends and holidays) ● Includes 0 part-time off days
                                        </Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2">(Days present + Working days)</Typography>
                                            <Chip
                                                label={`${stats.present} / ${stats.totalDays}`}
                                                color="info"
                                                sx={{ fontWeight: 700 }}
                                            />
                                        </Box>
                                    </Box>

                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            (Working days = Days present)
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2">(Remaining / Total)</Typography>
                                        <Chip
                                            label="7 / 7"
                                            color="success"
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </Box>

                {/* Attendance Table */}
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                    📋 Attendance Records ({filteredAttendances.length})
                </Typography>
                <Box sx={{ width: '100%', overflowX: 'auto', mb: 3, minHeight: 400 }}>
                    <TableContainer component={Paper} sx={{
                        borderRadius: 3,
                        boxShadow: 3,
                        minWidth: 800,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider'
                    }}>
                        <Table sx={{ minWidth: 800, tableLayout: 'fixed' }} id="attendance-table-print">
                            <TableHead>
                                <TableRow sx={{
                                    bgcolor: 'primary.main',
                                    height: 56
                                }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>DATE</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>DAY</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>FIRST CHECK</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>LAST CHECK</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>WORKING HOURS</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>OVERTIME</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>STATUS</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>ACTIONS</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredAttendances.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                                No Attendance Records Found
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                There are no attendance records for the selected date range.
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                                Try expanding the date range or check if you have any attendance records.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAttendances.map((attendance) => (
                                        <TableRow
                                            key={attendance._id}
                                            sx={{
                                                '&:hover': { bgcolor: 'action.hover' }
                                            }}
                                        >
                                            <TableCell>
                                                {formatDate(attendance.date)}
                                            </TableCell>
                                            <TableCell>
                                                {getDayName(attendance.date)}
                                            </TableCell>
                                            <TableCell>
                                                <Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: attendance.checkIn?.isLate ? 'warning.main' : 'success.main',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {formatTime(attendance.checkIn)}
                                                    </Typography>
                                                    {attendance.checkIn?.isLate && (
                                                        <Typography variant="caption" color="warning.main">
                                                            Late
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: attendance.checkOut?.isEarly ? 'warning.main' : 'success.main',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {formatTime(attendance.checkOut)}
                                                    </Typography>
                                                    {attendance.checkOut?.isEarly && (
                                                        <Typography variant="caption" color="warning.main">
                                                            Early
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                {calculateWorkingHours(attendance.checkIn, attendance.checkOut)}
                                            </TableCell>
                                            <TableCell>
                                                {attendance.hours?.overtime > 0
                                                    ? `${attendance.hours.overtime} hours`
                                                    : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={getStatusLabel(attendance.status)}
                                                    color={getStatusColor(attendance.status)}
                                                    size="small"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {attendance.checkIn?.isLate && (
                                                    <Chip
                                                        label="⚠ LATE ARRIVAL"
                                                        size="small"
                                                        color="warning"
                                                        sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                                                    />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                {/* Footer */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={handlePrint}
                    >
                        Print Report
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                        ⓘ No Missing Check Detected
                    </Typography>
                </Box>
            </Box>
        );
    }

    // Filter all users attendance
    const filteredAllUsersAttendance = attendances.filter(att => {
        const attDate = new Date(att.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dateMatch = attDate >= start && attDate <= end;
        
        const employeeMatch = !filterEmployee || 
            att.employee?._id === filterEmployee || 
            att.employee === filterEmployee;
        
        const statusMatch = !filterStatus || att.status === filterStatus;
        
        const departmentMatch = !filterDepartment || 
            att.employee?.department?._id === filterDepartment ||
            att.employee?.department === filterDepartment;
        
        return dateMatch && employeeMatch && statusMatch && departmentMatch;
    });

    // Calculate statistics for all users
    const allUsersStats = {
        totalRecords: filteredAllUsersAttendance.length,
        present: filteredAllUsersAttendance.filter(a => ['present', 'on-time'].includes(a.status)).length,
        absent: filteredAllUsersAttendance.filter(a => a.status === 'absent').length,
        late: filteredAllUsersAttendance.filter(a => a.status === 'late').length,
        workFromHome: filteredAllUsersAttendance.filter(a => a.status === 'work-from-home').length,
    };

    // HR/Admin view - show management interface
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">
                    Attendance Management
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Record Attendance
                    </Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => navigate('/attendance/import')}
                    >
                        Import Attendance
                    </Button>
                </Box>
            </Box>

            {/* Attendance Content */}
            {viewMode === 'my' ? (
                // My Attendance View
                <Box>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Total records: {attendances.filter(att => att.employee?._id === user?._id || att.employee === user?._id).length}
                    </Typography>
                    <DataTable
                        data={attendances.filter(att => att.employee?._id === user?._id || att.employee === user?._id)}
                        columns={columns}
                    />
                </Box>
            ) : viewMode === 'all' ? (
                // All Users Attendance View
                <Box>
                    {/* Filters */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Filters</Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <TextField
                                    label="Start Date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <TextField
                                    label="End Date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <TextField
                                    select
                                    label="Employee"
                                    value={filterEmployee}
                                    onChange={(e) => setFilterEmployee(e.target.value)}
                                    fullWidth
                                >
                                    <MenuItem value="">All Employees</MenuItem>
                                    {users.map((u) => (
                                        <MenuItem key={u._id} value={u._id}>
                                            {u.personalInfo?.fullName || u.username}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <TextField
                                    select
                                    label="Status"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    fullWidth
                                >
                                    <MenuItem value="">All Statuses</MenuItem>
                                    {statuses.map((status) => (
                                        <MenuItem key={status} value={status}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        </Grid>
                        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setFilterEmployee('');
                                    setFilterStatus('');
                                    setFilterDepartment('');
                                    setStartDate(() => {
                                        const date = new Date();
                                        date.setDate(date.getDate() - 7);
                                        return date.toISOString().split('T')[0];
                                    });
                                    setEndDate(new Date().toISOString().split('T')[0]);
                                }}
                            >
                                Clear Filters
                            </Button>
                        </Box>
                    </Paper>

                    {/* Statistics Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card>
                                <CardContent>
                                    <Typography color="text.secondary" gutterBottom>
                                        Total Records
                                    </Typography>
                                    <Typography variant="h4">
                                        {allUsersStats.totalRecords}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card>
                                <CardContent>
                                    <Typography color="text.secondary" gutterBottom>
                                        Present
                                    </Typography>
                                    <Typography variant="h4" color="success.main">
                                        {allUsersStats.present}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card>
                                <CardContent>
                                    <Typography color="text.secondary" gutterBottom>
                                        Absent
                                    </Typography>
                                    <Typography variant="h4" color="error.main">
                                        {allUsersStats.absent}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card>
                                <CardContent>
                                    <Typography color="text.secondary" gutterBottom>
                                        Late
                                    </Typography>
                                    <Typography variant="h4" color="warning.main">
                                        {allUsersStats.late}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Attendance Table */}
                    <Paper sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                Attendance Records ({filteredAllUsersAttendance.length})
                            </Typography>
                            <Button
                                variant="outlined"
                                startIcon={<PrintIcon />}
                                onClick={() => {
                                    window.print();
                                }}
                            >
                                Print
                            </Button>
                        </Box>
                        <DataTable
                            data={filteredAllUsersAttendance}
                            columns={columns}
                        />
                    </Paper>
                </Box>
            ) : null}

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedAttendance ? 'Edit Attendance' : 'Record Attendance'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            select
                            label="Employee"
                            name="employee"
                            value={formData.employee}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {users.map((user) => (
                                <MenuItem key={user._id} value={user._id}>
                                    {user.personalInfo?.fullName || user.username} - {user.email}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            type="date"
                            label="Date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                                <TextField
                                    type="time"
                                    label="Check In"
                                    name="checkIn"
                                    value={formData.checkIn}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <TextField
                                    type="time"
                                    label="Check Out"
                                    name="checkOut"
                                    value={formData.checkOut}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                        <TextField
                            select
                            label="Status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {statuses.map((status) => (
                                <MenuItem key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedAttendance ? 'Update' : 'Record'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Attendance Record"
                message="Are you sure you want to delete this attendance record?"
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedAttendance(null);
                }}
            />
        </Box>
    );
};

export default AttendancePage;
