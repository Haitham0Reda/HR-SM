import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    TextField,
    MenuItem,
    LinearProgress
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    People,
    EventAvailable,
    AttachMoney,
    Assignment
} from '@mui/icons-material';

const AnalyticsPage = () => {
    const [period, setPeriod] = useState('month');

    // Mock data - in real app, this would come from the API
    const stats = {
        totalEmployees: 156,
        employeeGrowth: 8.5,
        attendanceRate: 91.2,
        attendanceTrend: 2.3,
        avgSalary: 4500,
        salaryTrend: -1.2,
        leaveRequests: 23,
        leaveTrend: -5.4
    };

    const departmentStats = [
        { name: 'IT', employees: 45, attendance: 94, avgSalary: 5200 },
        { name: 'HR', employees: 12, attendance: 96, avgSalary: 4100 },
        { name: 'Finance', employees: 18, attendance: 89, avgSalary: 4800 },
        { name: 'Operations', employees: 52, attendance: 88, avgSalary: 3900 },
        { name: 'Marketing', employees: 29, attendance: 92, avgSalary: 4300 }
    ];

    const monthlyTrends = [
        { month: 'Jun', attendance: 88, leaves: 15, newHires: 3 },
        { month: 'Jul', attendance: 90, leaves: 18, newHires: 5 },
        { month: 'Aug', attendance: 89, leaves: 22, newHires: 4 },
        { month: 'Sep', attendance: 91, leaves: 19, newHires: 7 },
        { month: 'Oct', attendance: 92, leaves: 16, newHires: 6 },
        { month: 'Nov', attendance: 91, leaves: 23, newHires: 8 }
    ];

    const StatCard = ({ title, value, trend, icon: Icon, color }) => (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" sx={{ mb: 1 }}>
                            {value}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {trend > 0 ? (
                                <TrendingUp fontSize="small" color="success" />
                            ) : (
                                <TrendingDown fontSize="small" color="error" />
                            )}
                            <Typography
                                variant="body2"
                                color={trend > 0 ? 'success.main' : 'error.main'}
                            >
                                {Math.abs(trend)}% vs last {period}
                            </Typography>
                        </Box>
                    </Box>
                    <Box
                        sx={{
                            bgcolor: `${color}.light`,
                            p: 1.5,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Icon sx={{ color: `${color}.main`, fontSize: 32 }} />
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Analytics Dashboard</Typography>
                <TextField
                    select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    size="small"
                    sx={{ minWidth: 150 }}
                >
                    <MenuItem value="week">This Week</MenuItem>
                    <MenuItem value="month">This Month</MenuItem>
                    <MenuItem value="quarter">This Quarter</MenuItem>
                    <MenuItem value="year">This Year</MenuItem>
                </TextField>
            </Box>

            <Grid container spacing={3}>
                {/* Key Metrics */}
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Employees"
                        value={stats.totalEmployees}
                        trend={stats.employeeGrowth}
                        icon={People}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Attendance Rate"
                        value={`${stats.attendanceRate}%`}
                        trend={stats.attendanceTrend}
                        icon={EventAvailable}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Avg Salary"
                        value={`$${stats.avgSalary}`}
                        trend={stats.salaryTrend}
                        icon={AttachMoney}
                        color="info"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Leave Requests"
                        value={stats.leaveRequests}
                        trend={stats.leaveTrend}
                        icon={Assignment}
                        color="warning"
                    />
                </Grid>

                {/* Department Performance */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Department Performance</Typography>
                            {departmentStats.map((dept) => (
                                <Box key={dept.name} sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2">{dept.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {dept.employees} employees • {dept.attendance}% attendance
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={dept.attendance}
                                        sx={{ height: 8, borderRadius: 1 }}
                                    />
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Monthly Trends */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Monthly Trends</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {monthlyTrends.map((trend) => (
                                    <Box
                                        key={trend.month}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            p: 1.5,
                                            bgcolor: 'action.hover',
                                            borderRadius: 1
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ minWidth: 60 }}>
                                            {trend.month}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 3, flex: 1, justifyContent: 'space-around' }}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Attendance
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {trend.attendance}%
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Leaves
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {trend.leaves}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    New Hires
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {trend.newHires}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Top Performers */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Top Performers (Attendance)</Typography>
                            {[
                                { name: 'John Smith', dept: 'IT', rate: 98.5 },
                                { name: 'Sarah Johnson', dept: 'HR', rate: 97.2 },
                                { name: 'Mike Wilson', dept: 'Finance', rate: 96.8 },
                                { name: 'Emily Brown', dept: 'Operations', rate: 96.1 },
                                { name: 'David Lee', dept: 'Marketing', rate: 95.7 }
                            ].map((employee, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        p: 1.5,
                                        mb: 1,
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1
                                    }}
                                >
                                    <Box>
                                        <Typography variant="subtitle2">{employee.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {employee.dept}
                                        </Typography>
                                    </Box>
                                    <Typography variant="h6" color="success.main">
                                        {employee.rate}%
                                    </Typography>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Leave Analysis */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Leave Analysis</Typography>
                            <Grid container spacing={2}>
                                {[
                                    { type: 'Annual Leave', count: 45, color: 'primary' },
                                    { type: 'Sick Leave', count: 23, color: 'error' },
                                    { type: 'Personal Leave', count: 12, color: 'warning' },
                                    { type: 'Unpaid Leave', count: 5, color: 'default' }
                                ].map((leave) => (
                                    <Grid item xs={6} key={leave.type}>
                                        <Box
                                            sx={{
                                                p: 2,
                                                textAlign: 'center',
                                                border: 1,
                                                borderColor: 'divider',
                                                borderRadius: 1
                                            }}
                                        >
                                            <Typography variant="h4" color={`${leave.color}.main`}>
                                                {leave.count}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {leave.type}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Insights */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Key Insights</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                                        <Typography variant="subtitle2" color="success.contrastText" gutterBottom>
                                            ✓ Positive Trend
                                        </Typography>
                                        <Typography variant="body2" color="success.contrastText">
                                            Attendance rate improved by 2.3% compared to last month
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                                        <Typography variant="subtitle2" color="warning.contrastText" gutterBottom>
                                            ⚠ Attention Needed
                                        </Typography>
                                        <Typography variant="body2" color="warning.contrastText">
                                            Operations department has the lowest attendance rate at 88%
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                                        <Typography variant="subtitle2" color="info.contrastText" gutterBottom>
                                            ℹ Information
                                        </Typography>
                                        <Typography variant="body2" color="info.contrastText">
                                            8 new employees joined this month, highest in Q4
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AnalyticsPage;
