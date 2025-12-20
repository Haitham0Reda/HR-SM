/**
 * Insurance Reports Panel Component
 * 
 * Panel for generating and viewing insurance reports and analytics.
 * Follows existing report component patterns with Chart.js integration.
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Button,
    TextField,
    MenuItem,
    Stack,
    Chip,
    LinearProgress,
    Alert,
    Divider,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Assessment as ReportIcon,
    Download as DownloadIcon,
    Refresh as RefreshIcon,
    PictureAsPdf as PdfIcon,
    TableChart as ExcelIcon,
    TrendingUp,
    TrendingDown,
    HealthAndSafety as InsuranceIcon,
    People as PeopleIcon,
    AttachMoney as MoneyIcon,
    Assignment as ClaimIcon
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import { useInsuranceReports } from '../../hooks/useInsurance';
import { formatCurrency } from '../../utils/formatters';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const InsuranceReportsPanel = () => {
    const { generateReport, fetchAnalytics, analytics, loading } = useInsuranceReports();
    
    const [filters, setFilters] = useState({
        reportType: 'policies',
        startDate: dayjs().subtract(1, 'year').format('YYYY-MM-DD'),
        endDate: dayjs().format('YYYY-MM-DD'),
        policyType: '',
        status: ''
    });

    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setAnalyticsLoading(true);
            await fetchAnalytics({
                startDate: filters.startDate,
                endDate: filters.endDate
            });
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleGenerateReport = async (format = 'pdf') => {
        try {
            await generateReport(filters.reportType, {
                ...filters,
                format
            });
        } catch (error) {
            console.error('Failed to generate report:', error);
        }
    };

    const handleRefreshAnalytics = () => {
        loadAnalytics();
    };

    // Mock data for demonstration - in real app, this would come from analytics
    const mockAnalytics = {
        totalPolicies: 156,
        activePolicies: 142,
        totalClaims: 23,
        pendingClaims: 8,
        totalCoverage: 15600000,
        totalPremiums: 46800,
        claimsPaid: 125000,
        averageClaimAmount: 5434,
        policyGrowth: 8.5,
        claimsGrowth: -2.3,
        coverageGrowth: 12.1,
        premiumGrowth: 5.7
    };

    const policyTypeData = [
        { name: 'CAT_A', value: 45, amount: 4500000 },
        { name: 'CAT_B', value: 67, amount: 6700000 },
        { name: 'CAT_C', value: 44, amount: 8800000 }
    ];

    const monthlyTrends = [
        { month: 'Jan', policies: 135, claims: 18, premiums: 40500 },
        { month: 'Feb', policies: 138, claims: 22, premiums: 41400 },
        { month: 'Mar', policies: 142, claims: 19, premiums: 42600 },
        { month: 'Apr', policies: 145, claims: 25, premiums: 43500 },
        { month: 'May', policies: 148, claims: 21, premiums: 44400 },
        { month: 'Jun', policies: 152, claims: 23, premiums: 45600 },
        { month: 'Jul', policies: 156, claims: 20, premiums: 46800 }
    ];

    const StatCard = ({ title, value, trend, icon: Icon, color, subtitle }) => (
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
                        {subtitle && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {subtitle}
                            </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {trend > 0 ? (
                                <TrendingUp fontSize="small" color="success" />
                            ) : trend < 0 ? (
                                <TrendingDown fontSize="small" color="error" />
                            ) : null}
                            <Typography
                                variant="body2"
                                color={trend > 0 ? 'success.main' : trend < 0 ? 'error.main' : 'text.secondary'}
                            >
                                {trend !== 0 ? `${Math.abs(trend)}% vs last year` : 'No change'}
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
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4">Insurance Reports & Analytics</Typography>
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="Refresh Analytics">
                            <IconButton onClick={handleRefreshAnalytics} disabled={analyticsLoading}>
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>

                {analyticsLoading && <LinearProgress sx={{ mb: 2 }} />}

                {/* Key Metrics */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Total Policies"
                            value={mockAnalytics.totalPolicies}
                            trend={mockAnalytics.policyGrowth}
                            icon={InsuranceIcon}
                            color="primary"
                            subtitle={`${mockAnalytics.activePolicies} active`}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Total Coverage"
                            value={formatCurrency(mockAnalytics.totalCoverage)}
                            trend={mockAnalytics.coverageGrowth}
                            icon={MoneyIcon}
                            color="success"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Monthly Premiums"
                            value={formatCurrency(mockAnalytics.totalPremiums)}
                            trend={mockAnalytics.premiumGrowth}
                            icon={MoneyIcon}
                            color="info"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Active Claims"
                            value={mockAnalytics.totalClaims}
                            trend={mockAnalytics.claimsGrowth}
                            icon={ClaimIcon}
                            color="warning"
                            subtitle={`${mockAnalytics.pendingClaims} pending`}
                        />
                    </Grid>
                </Grid>

                {/* Report Generation */}
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Generate Reports
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={6} md={2}>
                                <TextField
                                    select
                                    label="Report Type"
                                    value={filters.reportType}
                                    onChange={(e) => handleFilterChange('reportType', e.target.value)}
                                    fullWidth
                                    size="small"
                                >
                                    <MenuItem value="policies">Policies Report</MenuItem>
                                    <MenuItem value="claims">Claims Report</MenuItem>
                                    <MenuItem value="analytics">Analytics Report</MenuItem>
                                </TextField>
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={2}>
                                <DatePicker
                                    label="Start Date"
                                    value={dayjs(filters.startDate)}
                                    onChange={(value) => handleFilterChange('startDate', value?.format('YYYY-MM-DD'))}
                                    slotProps={{
                                        textField: {
                                            size: 'small',
                                            fullWidth: true
                                        }
                                    }}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={2}>
                                <DatePicker
                                    label="End Date"
                                    value={dayjs(filters.endDate)}
                                    onChange={(value) => handleFilterChange('endDate', value?.format('YYYY-MM-DD'))}
                                    slotProps={{
                                        textField: {
                                            size: 'small',
                                            fullWidth: true
                                        }
                                    }}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={2}>
                                <TextField
                                    select
                                    label="Policy Type"
                                    value={filters.policyType}
                                    onChange={(e) => handleFilterChange('policyType', e.target.value)}
                                    fullWidth
                                    size="small"
                                >
                                    <MenuItem value="">All Types</MenuItem>
                                    <MenuItem value="CAT_A">Category A</MenuItem>
                                    <MenuItem value="CAT_B">Category B</MenuItem>
                                    <MenuItem value="CAT_C">Category C</MenuItem>
                                </TextField>
                            </Grid>
                            
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
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="expired">Expired</MenuItem>
                                    <MenuItem value="cancelled">Cancelled</MenuItem>
                                </TextField>
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={2}>
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="contained"
                                        startIcon={<PdfIcon />}
                                        onClick={() => handleGenerateReport('pdf')}
                                        disabled={loading}
                                        size="small"
                                    >
                                        PDF
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<ExcelIcon />}
                                        onClick={() => handleGenerateReport('excel')}
                                        disabled={loading}
                                        size="small"
                                    >
                                        Excel
                                    </Button>
                                </Stack>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Charts */}
                <Grid container spacing={3}>
                    {/* Policy Distribution */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                    Policy Distribution by Type
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={policyTypeData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name}: ${value}`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {policyTypeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Monthly Trends */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                    Monthly Trends
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={monthlyTrends}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <RechartsTooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="policies" stroke="#8884d8" name="Policies" />
                                        <Line type="monotone" dataKey="claims" stroke="#82ca9d" name="Claims" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Premium Trends */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                    Premium Collection Trends
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={monthlyTrends}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                                        <Legend />
                                        <Bar dataKey="premiums" fill="#8884d8" name="Monthly Premiums" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </LocalizationProvider>
    );
};

export default InsuranceReportsPanel;