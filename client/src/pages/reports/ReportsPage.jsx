import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    TextField,
    MenuItem,
    Chip,
    Paper,
    IconButton,
    Avatar,
    Card,
    CardContent,
    CircularProgress,
    Tooltip,
    alpha,
    LinearProgress,
    Badge,
    Menu,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    Assessment,
    Download,
    Print,
    PictureAsPdf,
    TableChart,
    Schedule,
    TrendingUp,
    People,
    Business,
    CalendarToday,
    FilterList,
    Refresh,
    Visibility,
    Share,
    Star,
    StarBorder,
    MoreVert,
    ShowChart,
    InsertChart,
    CloudDownload,
    Email,
    Settings,
    ArrowUpward,
    ArrowDownward,
    Remove,
    CheckCircle
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    ComposedChart
} from 'recharts';
import { useNotification } from '../../context/NotificationContext';
import reportService from '../../services/report.service';
import analyticsService from '../../services/analytics.service';
import dashboardService from '../../services/dashboard.service';
import userService from '../../services/user.service';
import departmentService from '../../services/department.service';
import { useTheme } from '@mui/material/styles';

const ReportsPage = () => {
    const theme = useTheme();
    const [selectedView, setSelectedView] = useState('dashboard');
    const [filters, setFilters] = useState({
        reportType: 'attendance',
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        department: '',
        user: ''
    });
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [favorites, setFavorites] = useState(['attendance', 'payroll']);
    const [settingsAnchor, setSettingsAnchor] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [attendanceChartData, setAttendanceChartData] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const { showNotification } = useNotification();

    // Use fetched attendance data or defaults
    const attendanceData = attendanceChartData.length > 0 ? attendanceChartData : [
        { month: 'Jan', present: 142, absent: 8, leave: 6, rate: 91.0 },
        { month: 'Feb', present: 145, absent: 6, leave: 5, rate: 93.0 },
        { month: 'Mar', present: 148, absent: 4, leave: 4, rate: 94.9 },
        { month: 'Apr', present: 150, absent: 3, leave: 3, rate: 96.2 },
        { month: 'May', present: 147, absent: 5, leave: 4, rate: 94.2 },
        { month: 'Jun', present: 149, absent: 4, leave: 3, rate: 95.5 },
        { month: 'Jul', present: 151, absent: 3, leave: 2, rate: 96.8 },
        { month: 'Aug', present: 148, absent: 5, leave: 3, rate: 94.9 },
        { month: 'Sep', present: 150, absent: 3, leave: 3, rate: 96.2 },
        { month: 'Oct', present: 152, absent: 2, leave: 2, rate: 97.4 },
        { month: 'Nov', present: 142, absent: 6, leave: 8, rate: 91.0 }
    ];

    // Use real department data if available, otherwise use defaults
    const colors = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main];
    
    let departmentData = [];
    if (dashboardStats?.departments && Array.isArray(dashboardStats.departments)) {
        departmentData = dashboardStats.departments.map((dept, index) => ({
            ...dept,
            color: dept.color || colors[index % colors.length]
        }));
    } else if (analyticsData?.kpis?.departments && Array.isArray(analyticsData.kpis.departments)) {
        departmentData = analyticsData.kpis.departments.map((dept, index) => ({
            ...dept,
            color: dept.color || colors[index % colors.length]
        }));
    } else {
        departmentData = [
            { name: 'IT', value: 45, growth: 8.5 },
            { name: 'HR', value: 28, growth: 3.2 },
            { name: 'Finance', value: 32, growth: 5.1 },
            { name: 'Operations', value: 38, growth: -2.3 },
            { name: 'Marketing', value: 13, growth: 12.8 }
        ].map((dept, index) => ({
            ...dept,
            color: colors[index]
        }));
    }

    const performanceData = [
        { month: 'Jan', score: 78, target: 80 },
        { month: 'Feb', score: 82, target: 80 },
        { month: 'Mar', score: 85, target: 82 },
        { month: 'Apr', score: 88, target: 82 },
        { month: 'May', score: 86, target: 85 },
        { month: 'Jun', score: 90, target: 85 },
        { month: 'Jul', score: 92, target: 88 },
        { month: 'Aug', score: 89, target: 88 },
        { month: 'Sep', score: 91, target: 90 },
        { month: 'Oct', score: 93, target: 90 },
        { month: 'Nov', score: 95, target: 92 }
    ];

    const leaveTypeData = [
        { type: 'Sick', count: 45, color: theme.palette.error.main },
        { type: 'Vacation', count: 78, color: theme.palette.info.main },
        { type: 'Personal', count: 32, color: theme.palette.warning.main },
        { type: 'Maternity', count: 12, color: theme.palette.secondary.main },
        { type: 'Other', count: 18, color: theme.palette.grey?.[600] || '#757575' }
    ];

    const payrollData = [
        { month: 'Jan', amount: 450000 },
        { month: 'Feb', amount: 455000 },
        { month: 'Mar', amount: 460000 },
        { month: 'Apr', amount: 465000 },
        { month: 'May', amount: 470000 },
        { month: 'Jun', amount: 475000 },
        { month: 'Jul', amount: 480000 },
        { month: 'Aug', amount: 485000 },
        { month: 'Sep', amount: 490000 },
        { month: 'Oct', amount: 495000 },
        { month: 'Nov', amount: 500000 }
    ];

    const reportTypes = [
        { value: 'attendance', label: 'Attendance', icon: <Schedule />, color: theme.palette.primary.main, count: 24 },
        { value: 'leave', label: 'Leave', icon: <CalendarToday />, color: theme.palette.secondary.main, count: 18 },
        { value: 'payroll', label: 'Payroll', icon: <Assessment />, color: theme.palette.success.main, count: 32 },
        { value: 'performance', label: 'Performance', icon: <TrendingUp />, color: theme.palette.warning.main, count: 15 },
        { value: 'department', label: 'Department', icon: <Business />, color: theme.palette.info.main, count: 12 },
        { value: 'custom', label: 'Custom', icon: <TableChart />, color: theme.palette.error.main, count: 8 }
    ];

    // Calculate KPI data from fetched stats
    const totalEmployees = dashboardStats?.totalEmployees || analyticsData?.kpis?.totalEmployees || 0;
    const attendanceRate = analyticsData?.kpis?.attendanceRate || dashboardStats?.attendanceRate || 91;
    const avgPerformance = analyticsData?.kpis?.avgPerformance || analyticsData?.kpis?.performance || dashboardStats?.avgPerformance || 88;
    const openPositions = dashboardStats?.openPositions || analyticsData?.kpis?.openPositions || 12;

    const kpiData = [
        { 
            label: 'Total Employees', 
            value: totalEmployees, 
            change: analyticsData?.kpis?.employeeChange || dashboardStats?.employeeChange || 2.5, 
            trend: (analyticsData?.kpis?.employeeChange || dashboardStats?.employeeChange || 2.5) > 0 ? 'up' : (analyticsData?.kpis?.employeeChange || dashboardStats?.employeeChange || 2.5) < 0 ? 'down' : 'stable', 
            color: theme.palette.primary.main, 
            icon: <People /> 
        },
        { 
            label: 'Attendance Rate', 
            value: `${Math.round(attendanceRate)}%`, 
            change: analyticsData?.kpis?.attendanceChange || dashboardStats?.attendanceChange || -1.2, 
            trend: (analyticsData?.kpis?.attendanceChange || dashboardStats?.attendanceChange || -1.2) > 0 ? 'up' : (analyticsData?.kpis?.attendanceChange || dashboardStats?.attendanceChange || -1.2) < 0 ? 'down' : 'stable', 
            color: theme.palette.success.main, 
            icon: <CheckCircle /> 
        },
        { 
            label: 'Avg Performance', 
            value: Math.round(avgPerformance), 
            change: analyticsData?.kpis?.performanceChange || dashboardStats?.performanceChange || 3.8, 
            trend: (analyticsData?.kpis?.performanceChange || dashboardStats?.performanceChange || 3.8) > 0 ? 'up' : (analyticsData?.kpis?.performanceChange || dashboardStats?.performanceChange || 3.8) < 0 ? 'down' : 'stable', 
            color: theme.palette.warning.main, 
            icon: <TrendingUp /> 
        },
        { 
            label: 'Open Positions', 
            value: openPositions, 
            change: analyticsData?.kpis?.positionChange || dashboardStats?.positionChange || 0, 
            trend: (analyticsData?.kpis?.positionChange || dashboardStats?.positionChange || 0) > 0 ? 'up' : (analyticsData?.kpis?.positionChange || dashboardStats?.positionChange || 0) < 0 ? 'down' : 'stable', 
            color: theme.palette.secondary.main, 
            icon: <Business /> 
        }
    ];

    const [recentReports, setRecentReports] = useState([]);

    // Fetch data from APIs
    useEffect(() => {
        const fetchData = async () => {
            try {
                setDataLoading(true);
                
                // Fetch all data in parallel
                const [usersResponse, stats, analytics, attendanceData, reports, departmentsResponse] = await Promise.all([
                    userService.getAll().catch(() => ({ users: [] })),
                    dashboardService.getStatistics().catch(err => {

                        return null;
                    }),
                    analyticsService.getKPIs().catch(err => {

                        return null;
                    }),
                    analyticsService.getAttendance({ period: 'monthly', months: 11 }).catch(err => {

                        return null;
                    }),
                    reportService.getAll({ limit: 4, sort: '-createdAt' }).catch(err => {

                        return { reports: [] };
                    }),
                    departmentService.getAll().catch(err => {

                        return { departments: [] };
                    })
                ]);

                // Calculate total employees
                let totalEmployees = 0;
                if (usersResponse) {
                    if (Array.isArray(usersResponse)) {
                        totalEmployees = usersResponse.length;
                    } else if (usersResponse.users && Array.isArray(usersResponse.users)) {
                        totalEmployees = usersResponse.users.length;
                    } else if (usersResponse.data && Array.isArray(usersResponse.data)) {
                        totalEmployees = usersResponse.data.length;
                    } else if (typeof usersResponse.total === 'number') {
                        totalEmployees = usersResponse.total;
                    } else if (typeof usersResponse.count === 'number') {
                        totalEmployees = usersResponse.count;
                    }
                }

                // Process departments data
                let departmentsArray = [];
                if (departmentsResponse) {
                    if (Array.isArray(departmentsResponse)) {
                        departmentsArray = departmentsResponse;
                    } else if (departmentsResponse.departments && Array.isArray(departmentsResponse.departments)) {
                        departmentsArray = departmentsResponse.departments;
                    } else if (departmentsResponse.data && Array.isArray(departmentsResponse.data)) {
                        departmentsArray = departmentsResponse.data;
                    }
                }
                
                // Count employees per department from users
                const usersArray = Array.isArray(usersResponse) ? usersResponse : 
                                  (usersResponse.users || usersResponse.data || []);
                
                const departmentCounts = {};
                usersArray.forEach(user => {
                    if (user.department) {
                        const deptId = typeof user.department === 'object' ? user.department._id : user.department;
                        departmentCounts[deptId] = (departmentCounts[deptId] || 0) + 1;
                    }
                });
                
                // Merge department data with employee counts
                const departmentsWithCounts = departmentsArray
                    .filter(dept => dept.isActive !== false && !dept.parentDepartment) // Only main departments
                    .map(dept => ({
                        _id: dept._id,
                        name: dept.name || dept.arabicName || 'Unknown',
                        value: departmentCounts[dept._id] || 0,
                        growth: Math.random() * 20 - 5, // TODO: Calculate real growth
                        code: dept.code
                    }))
                    .filter(dept => dept.value > 0) // Only departments with employees
                    .sort((a, b) => b.value - a.value) // Sort by employee count
                    .slice(0, 5); // Top 5 departments

                // Merge stats with user count and departments
                const mergedStats = {
                    ...stats,
                    totalEmployees: totalEmployees || stats?.totalEmployees || 0,
                    departments: departmentsWithCounts
                };
                
                setDashboardStats(mergedStats);
                setAnalyticsData(analytics);
                
                // Process attendance data

                const defaultAttendanceData = [
                    { month: 'Jan', present: 142, absent: 8, leave: 6, rate: 91.0 },
                    { month: 'Feb', present: 145, absent: 6, leave: 5, rate: 93.0 },
                    { month: 'Mar', present: 148, absent: 4, leave: 4, rate: 94.9 },
                    { month: 'Apr', present: 150, absent: 3, leave: 3, rate: 96.2 },
                    { month: 'May', present: 147, absent: 5, leave: 4, rate: 94.2 },
                    { month: 'Jun', present: 149, absent: 4, leave: 3, rate: 95.5 },
                    { month: 'Jul', present: 151, absent: 3, leave: 2, rate: 96.8 },
                    { month: 'Aug', present: 148, absent: 5, leave: 3, rate: 94.9 },
                    { month: 'Sep', present: 150, absent: 3, leave: 3, rate: 96.2 },
                    { month: 'Oct', present: 152, absent: 2, leave: 2, rate: 97.4 },
                    { month: 'Nov', present: 142, absent: 6, leave: 8, rate: 91.0 }
                ];
                
                if (attendanceData && attendanceData.data && Array.isArray(attendanceData.data) && attendanceData.data.length > 0) {

                    setAttendanceChartData(attendanceData.data);
                } else if (attendanceData && Array.isArray(attendanceData) && attendanceData.length > 0) {

                    setAttendanceChartData(attendanceData);
                } else {

                    setAttendanceChartData(defaultAttendanceData);
                }


                // Set recent reports
                const reportsArray = reports?.reports || reports?.data || [];
                if (Array.isArray(reportsArray) && reportsArray.length > 0) {
                    setRecentReports(reportsArray.map(r => ({
                        id: r._id || r.id,
                        name: r.name || 'Untitled Report',
                        date: r.createdAt || r.date,
                        type: r.type || 'General',
                        size: r.size || 'N/A',
                        downloads: r.downloads || 0
                    })));
                } else {
                    // Set default recent reports if none available
                    setRecentReports([
                        { id: 1, name: 'Monthly Attendance Report', date: '2025-11-10', type: 'Attendance', size: '2.4 MB', downloads: 45 },
                        { id: 2, name: 'Payroll Summary', date: '2025-11-01', type: 'Payroll', size: '1.8 MB', downloads: 78 },
                        { id: 3, name: 'Leave Balance Report', date: '2025-10-28', type: 'Leave', size: '890 KB', downloads: 32 },
                        { id: 4, name: 'Performance Review', date: '2025-10-15', type: 'Performance', size: '3.2 MB', downloads: 56 }
                    ]);
                }
            } catch (error) {

                showNotification('Failed to load some dashboard data', 'warning');
            } finally {
                setDataLoading(false);
            }
        };

        fetchData();
    }, [showNotification]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateReport = async (format = 'view') => {
        try {
            setLoading(true);
            await reportService.generate(filters);
            showNotification(`${format.toUpperCase()} report generated successfully`, 'success');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to generate report', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorite = (reportType) => {
        setFavorites(prev => 
            prev.includes(reportType) ? prev.filter(f => f !== reportType) : [...prev, reportType]
        );
    };

    const getTrendIcon = (trend) => {
        if (trend === 'up') return <ArrowUpward sx={{ fontSize: 16 }} />;
        if (trend === 'down') return <ArrowDownward sx={{ fontSize: 16 }} />;
        return <Remove sx={{ fontSize: 16 }} />;
    };

    if (dataLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', p: 3 }}>
            {/* Header */}
            <Box sx={{ 
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                p: 3,
                borderRadius: 2,
                mb: 3
            }}>
                {/* Header Top */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Reports & Analytics
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Real-time insights and comprehensive data visualization
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Refresh">
                            <IconButton sx={{ color: 'white' }} onClick={() => window.location.reload()}>
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Settings">
                            <IconButton sx={{ color: 'white' }} onClick={(e) => setSettingsAnchor(e.currentTarget)}>
                                <Settings />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            anchorEl={settingsAnchor}
                            open={Boolean(settingsAnchor)}
                            onClose={() => setSettingsAnchor(null)}
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        >
                            <MenuItem onClick={() => { setShowFilters(!showFilters); setSettingsAnchor(null); }}>
                                <ListItemIcon>
                                    <FilterList fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{showFilters ? 'Hide Filters' : 'Show Filters'}</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => { showNotification('Export settings coming soon', 'info'); setSettingsAnchor(null); }}>
                                <ListItemIcon>
                                    <Download fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>Export Settings</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => { showNotification('Print settings coming soon', 'info'); setSettingsAnchor(null); }}>
                                <ListItemIcon>
                                    <Print fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>Print Settings</ListItemText>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Box>
            </Box>

            {/* KPI Cards */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                {kpiData.map((kpi, index) => (
                    <Paper
                        key={index}
                        elevation={0}
                        sx={{
                            flex: '1 1 calc(25% - 12px)',
                            minWidth: 200,
                            p: 2.5,

                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.3s',
                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 2 }
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                            <Avatar sx={{ bgcolor: alpha(kpi.color, 0.2), color: kpi.color, width: 40, height: 40 }}>
                                {kpi.icon}
                            </Avatar>
                            <Chip
                                icon={getTrendIcon(kpi.trend)}
                                label={`${Math.abs(kpi.change)}%`}
                                size="small"
                                sx={{
                                    bgcolor: kpi.trend === 'up' ? alpha(theme.palette.success.main, 0.2) : 
                                             kpi.trend === 'down' ? alpha(theme.palette.error.main, 0.2) : alpha(theme.palette.grey?.[600] || '#757575', 0.2),
                                    color: kpi.trend === 'up' ? theme.palette.success.main : kpi.trend === 'down' ? theme.palette.error.main : theme.palette.grey?.[600] || '#757575',
                                    fontWeight: 600,
                                    height: 24
                                }}
                            />
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {kpi.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {kpi.label}
                        </Typography>
                    </Paper>
                ))}
            </Box>

            {/* Main Content */}
            <Box>
                {/* View Selector */}
                <Paper elevation={0} sx={{ p: 1, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {[
                            { value: 'dashboard', icon: <ShowChart />, label: 'Dashboard' },
                            { value: 'analytics', icon: <InsertChart />, label: 'Analytics' },
                            { value: 'generate', icon: <Assessment />, label: 'Generate' },
                            { value: 'history', icon: <Schedule />, label: 'History' }
                        ].map((view) => (
                            <Button
                                key={view.value}
                                startIcon={view.icon}
                                onClick={() => setSelectedView(view.value)}
                                sx={{
                                    flex: 1,
                                    py: 1.5,
                                    bgcolor: selectedView === view.value ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                    color: selectedView === view.value ? theme.palette.primary.main : 'text.secondary',
                                    fontWeight: selectedView === view.value ? 600 : 400,
                                    borderRadius: 2
                                }}
                            >
                                {view.label}
                            </Button>
                        ))}
                    </Box>
                </Paper>

                {/* Dashboard View */}
                {selectedView === 'dashboard' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Top Row - Main Charts */}
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {/* Attendance Chart - 2/3 width */}
                            <Card elevation={0} sx={{ flex: '2 1 600px', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                Attendance Overview
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Monthly trends and patterns
                                            </Typography>
                                        </Box>
                                        <Chip label="Monthly" size="small" color="primary" variant="outlined" />
                                    </Box>
                                    <ResponsiveContainer width="100%" height={320}>
                                        <ComposedChart data={attendanceData}>
                                            <defs>
                                                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                            <XAxis dataKey="month" stroke={theme.palette.text.secondary} />
                                            <YAxis yAxisId="left" stroke={theme.palette.text.secondary} />
                                            <YAxis yAxisId="right" orientation="right" stroke={theme.palette.text.secondary} />
                                            <RechartsTooltip />
                                            <Legend />
                                            <Bar yAxisId="left" dataKey="present" fill={theme.palette.success.main} radius={[8, 8, 0, 0]} />
                                            <Bar yAxisId="left" dataKey="absent" fill={theme.palette.error.main} radius={[8, 8, 0, 0]} />
                                            <Line yAxisId="right" type="monotone" dataKey="rate" stroke={theme.palette.primary.main} strokeWidth={3} />
                                            <Area yAxisId="right" type="monotone" dataKey="rate" fill="url(#colorRate)" stroke="none" />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Department Pie - 1/3 width */}
                            <Card elevation={0} sx={{ flex: '1 1 300px', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                                        Departments
                                    </Typography>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <PieChart>
                                            <Pie
                                                data={departmentData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={90}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {departmentData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                                        {departmentData.map((dept, index) => (
                                            <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: dept.color }} />
                                                    <Typography variant="body2">{dept.name}</Typography>
                                                </Box>
                                                <Typography variant="body2" fontWeight={600}>{dept.value}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>

                        {/* Middle Row - Performance & Leave */}
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            <Card elevation={0} sx={{ flex: '1 1 400px', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                                        Performance Trends
                                    </Typography>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <LineChart data={performanceData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                            <XAxis dataKey="month" stroke={theme.palette.text.secondary} />
                                            <YAxis stroke={theme.palette.text.secondary} domain={[70, 100]} />
                                            <RechartsTooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="score" stroke={theme.palette.primary.main} strokeWidth={3} dot={{ r: 5 }} />
                                            <Line type="monotone" dataKey="target" stroke={theme.palette.warning.main} strokeWidth={2} strokeDasharray="5 5" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card elevation={0} sx={{ flex: '1 1 400px', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                                        Leave Distribution
                                    </Typography>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={leaveTypeData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                            <XAxis type="number" stroke={theme.palette.text.secondary} />
                                            <YAxis dataKey="type" type="category" stroke={theme.palette.text.secondary} width={80} />
                                            <RechartsTooltip />
                                            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                                                {leaveTypeData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </Box>

                        {/* Quick Actions */}
                        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                    Quick Actions
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <Button variant="outlined" startIcon={<PictureAsPdf />} sx={{ flex: '1 1 200px', py: 1.5, borderRadius: 2 }} onClick={() => handleGenerateReport('pdf')}>
                                        Export PDF
                                    </Button>
                                    <Button variant="outlined" startIcon={<TableChart />} sx={{ flex: '1 1 200px', py: 1.5, borderRadius: 2 }} onClick={() => handleGenerateReport('excel')}>
                                        Export Excel
                                    </Button>
                                    <Button variant="outlined" startIcon={<Email />} sx={{ flex: '1 1 200px', py: 1.5, borderRadius: 2 }}>
                                        Email Report
                                    </Button>
                                    <Button variant="outlined" startIcon={<Share />} sx={{ flex: '1 1 200px', py: 1.5, borderRadius: 2 }}>
                                        Share
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                )}

                {/* Analytics View */}
                {selectedView === 'analytics' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                                    Payroll Trend Analysis
                                </Typography>
                                <ResponsiveContainer width="100%" height={350}>
                                    <AreaChart data={payrollData}>
                                        <defs>
                                            <linearGradient id="colorPayroll" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0.1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                        <XAxis dataKey="month" stroke={theme.palette.text.secondary} />
                                        <YAxis stroke={theme.palette.text.secondary} />
                                        <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                                        <Legend />
                                        <Area type="monotone" dataKey="amount" stroke={theme.palette.success.main} strokeWidth={3} fillOpacity={1} fill="url(#colorPayroll)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {departmentData.map((dept, index) => (
                                <Card key={index} elevation={0} sx={{ flex: '1 1 calc(33.333% - 16px)', minWidth: 250, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Avatar sx={{ bgcolor: alpha(dept.color, 0.2), color: dept.color, width: 48, height: 48 }}>
                                                <Business />
                                            </Avatar>
                                            <Chip
                                                label={`${dept.growth > 0 ? '+' : ''}${dept.growth}%`}
                                                size="small"
                                                sx={{
                                                    bgcolor: dept.growth > 0 ? alpha(theme.palette.success.main, 0.2) : alpha(theme.palette.error.main, 0.2),
                                                    color: dept.growth > 0 ? theme.palette.success.main : theme.palette.error.main
                                                }}
                                            />
                                        </Box>
                                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                                            {dept.value}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {dept.name} Department
                                        </Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={(dept.value / 156) * 100}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: alpha(dept.color, 0.15),
                                                '& .MuiLinearProgress-bar': { bgcolor: dept.color, borderRadius: 4 }
                                            }}
                                        />
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Generate View */}
                {selectedView === 'generate' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                                    Select Report Type
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    {reportTypes.map((type) => (
                                        <Card
                                            key={type.value}
                                            elevation={0}
                                            sx={{
                                                flex: '1 1 calc(33.333% - 12px)',
                                                minWidth: 250,
                                                p: 2.5,
                                                cursor: 'pointer',
                                                border: 2,
                                                borderColor: filters.reportType === type.value ? type.color : 'divider',
                                                borderRadius: 2,
                                                bgcolor: filters.reportType === type.value ? alpha(type.color, 0.15) : 'background.paper',
                                                transition: 'all 0.3s',
                                                '&:hover': { borderColor: type.color, transform: 'translateY(-4px)', boxShadow: 3, bgcolor: alpha(type.color, 0.1) }
                                            }}
                                            onClick={() => setFilters(prev => ({ ...prev, reportType: type.value }))}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Avatar sx={{ bgcolor: alpha(type.color, 0.2), color: type.color, width: 56, height: 56 }}>
                                                    {type.icon}
                                                </Avatar>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleFavorite(type.value); }}>
                                                        {favorites.includes(type.value) ? <Star sx={{ color: theme.palette.warning.main }} /> : <StarBorder />}
                                                    </IconButton>
                                                    <Badge badgeContent={type.count} color="primary" />
                                                </Box>
                                            </Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                {type.label}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Generate {type.label.toLowerCase()} report
                                            </Typography>
                                        </Card>
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Filters */}
                        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Report Filters
                                    </Typography>
                                    <Button size="small" startIcon={<FilterList />} onClick={() => setShowFilters(!showFilters)}>
                                        {showFilters ? 'Hide' : 'Show'} Filters
                                    </Button>
                                </Box>
                                {showFilters && (
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                        <TextField
                                            type="date"
                                            label="Start Date"
                                            name="startDate"
                                            value={filters.startDate}
                                            onChange={handleFilterChange}
                                            sx={{ flex: '1 1 200px' }}
                                            slotProps={{ inputLabel: { shrink: true } }}
                                        />
                                        <TextField
                                            type="date"
                                            label="End Date"
                                            name="endDate"
                                            value={filters.endDate}
                                            onChange={handleFilterChange}
                                            sx={{ flex: '1 1 200px' }}
                                            slotProps={{ inputLabel: { shrink: true } }}
                                        />
                                        <TextField
                                            select
                                            label="Department"
                                            name="department"
                                            value={filters.department}
                                            onChange={handleFilterChange}
                                            sx={{ flex: '1 1 200px' }}
                                        >
                                            <MenuItem value="">All Departments</MenuItem>
                                            <MenuItem value="hr">HR</MenuItem>
                                            <MenuItem value="it">IT</MenuItem>
                                            <MenuItem value="finance">Finance</MenuItem>
                                            <MenuItem value="operations">Operations</MenuItem>
                                        </TextField>
                                        <TextField
                                            label="Employee ID"
                                            name="user"
                                            value={filters.user}
                                            onChange={handleFilterChange}
                                            sx={{ flex: '1 1 200px' }}
                                            placeholder="Optional"
                                        />
                                    </Box>
                                )}
                            </CardContent>
                        </Card>

                        {/* Generate Actions */}
                        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                                    Generate & Export
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Visibility />}
                                        onClick={() => handleGenerateReport('view')}
                                        disabled={loading}
                                        sx={{ flex: '1 1 200px', py: 1.5, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, borderRadius: 2 }}
                                    >
                                        Generate Report
                                    </Button>
                                    <Button variant="outlined" size="large" startIcon={<PictureAsPdf />} onClick={() => handleGenerateReport('pdf')} disabled={loading} sx={{ flex: '1 1 150px', py: 1.5, borderRadius: 2 }}>
                                        PDF
                                    </Button>
                                    <Button variant="outlined" size="large" startIcon={<TableChart />} onClick={() => handleGenerateReport('excel')} disabled={loading} sx={{ flex: '1 1 150px', py: 1.5, borderRadius: 2 }}>
                                        Excel
                                    </Button>
                                    <Button variant="outlined" size="large" startIcon={<Email />} disabled={loading} sx={{ flex: '1 1 150px', py: 1.5, borderRadius: 2 }}>
                                        Email
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                )}

                {/* History View */}
                {selectedView === 'history' && (
                    <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Report History
                                </Typography>
                                <Chip label={`${recentReports.length} Reports`} color="primary" variant="outlined" />
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {recentReports.map((report) => (
                                    <Card
                                        key={report.id}
                                        elevation={0}
                                        sx={{
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), borderColor: theme.palette.primary.main, transform: 'translateX(4px)' }
                                        }}
                                    >
                                        <CardContent sx={{ p: 2.5 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), color: theme.palette.primary.main, width: 48, height: 48 }}>
                                                        <Assessment />
                                                    </Avatar>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                            {report.name}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {new Date(report.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                            </Typography>
                                                            <Chip label={report.type} size="small" />
                                                            <Typography variant="caption" color="text.secondary">{report.size}</Typography>
                                                            <Chip icon={<CloudDownload sx={{ fontSize: 14 }} />} label={report.downloads} size="small" variant="outlined" />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Tooltip title="View">
                                                        <IconButton size="small" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.15), color: theme.palette.primary.main }}>
                                                            <Visibility sx={{ fontSize: 20 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Download">
                                                        <IconButton size="small" sx={{ bgcolor: alpha(theme.palette.success.main, 0.15), color: theme.palette.success.main }}>
                                                            <Download sx={{ fontSize: 20 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="More">
                                                        <IconButton size="small">
                                                            <MoreVert sx={{ fontSize: 20 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                )}
            </Box>
        </Box>
    );
};

export default ReportsPage;
