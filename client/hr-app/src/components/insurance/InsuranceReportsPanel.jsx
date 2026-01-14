/**
 * Insurance Reports Panel Component
 * 
 * Panel for generating insurance reports and viewing analytics.
 * Includes filtering, export functionality, and data visualization.
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    TextField,
    MenuItem,
    Grid,
    Typography,
    Paper,
    Stack,
    Card,
    CardContent,
    CircularProgress
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    PictureAsPdf as PdfIcon,
    TableChart as ExcelIcon
} from '@mui/icons-material';
import DatePicker from '../common/DatePicker';
import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/formatters';
import {
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

const reportTypes = [
    { value: 'policies', label: 'Policies Report' },
    { value: 'claims', label: 'Claims Report' },
    { value: 'analytics', label: 'Analytics Report' }
];

const policyTypes = [
    { value: '', label: 'All Types' },
    { value: 'CAT_A', label: 'Category A' },
    { value: 'CAT_B', label: 'Category B' },
    { value: 'CAT_C', label: 'Category C' }
];

const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' }
];

const InsuranceReportsPanel = () => {
    const [filters, setFilters] = useState({
        reportType: 'policies',
        startDate: dayjs().subtract(1, 'year'),
        endDate: dayjs(),
        policyType: '',
        status: ''
    });

    const [analytics] = useState({
        totalPolicies: 156,
        activePolicies: 142,
        totalClaims: 23,
        pendingClaims: 8,
        totalCoverage: 15600000,
        monthlyPremiums: 46800
    });

    // Chart data
    const [policyDistributionData] = useState([
        { name: 'Category A', value: 62, color: '#0088FE' },
        { name: 'Category B', value: 58, color: '#00C49F' },
        { name: 'Category C', value: 36, color: '#FFBB28' }
    ]);

    const [monthlyTrendsData] = useState([
        { month: 'Jan', policies: 120, claims: 15 },
        { month: 'Feb', policies: 125, claims: 18 },
        { month: 'Mar', policies: 132, claims: 16 },
        { month: 'Apr', policies: 138, claims: 20 },
        { month: 'May', policies: 145, claims: 19 },
        { month: 'Jun', policies: 156, claims: 23 }
    ]);

    const [premiumCollectionData] = useState([
        { month: 'Jan', amount: 42000 },
        { month: 'Feb', amount: 43500 },
        { month: 'Mar', amount: 44200 },
        { month: 'Apr', amount: 45100 },
        { month: 'May', amount: 45800 },
        { month: 'Jun', amount: 46800 }
    ]);

    const [loading, setLoading] = useState(false);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleGenerateReport = async (format) => {
        try {
            setLoading(true);
            console.log('Generating report:', { ...filters, format });

            // Get auth token from localStorage
            const persistRoot = localStorage.getItem('persist:root');
            if (!persistRoot) {
                console.error('No authentication found');
                alert('Please log in to generate reports');
                return;
            }

            const root = JSON.parse(persistRoot);
            const auth = JSON.parse(root.auth);
            // Try both possible property names
            const token = auth.tenantToken || auth.tenant_token;

            if (!token) {
                console.error('No auth token found in auth object:', Object.keys(auth));
                alert('Authentication token not found. Please log in again.');
                return;
            }

            // Format dates properly for the API
            const requestBody = {
                startDate: filters.startDate ? filters.startDate.format('YYYY-MM-DD') : undefined,
                endDate: filters.endDate ? filters.endDate.format('YYYY-MM-DD') : undefined,
                includeExpired: filters.status === '' || filters.status === 'expired',
                includeClaims: true,
                includeFamilyMembers: true,
                reportTitle: `Insurance ${filters.reportType.charAt(0).toUpperCase() + filters.reportType.slice(1)} Report`
            };

            // Make API call to generate report
            const endpoint = format === 'pdf'
                ? '/api/v1/life-insurance/reports/pdf'
                : '/api/v1/life-insurance/reports/excel';

            const response = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            // Get the blob from the response
            const blob = await response.blob();

            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `insurance-report-${filters.reportType}-${dayjs().format('YYYY-MM-DD')}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log('Report generated successfully');
        } catch (error) {
            console.error('Report generation failed:', error);
            alert(`Failed to generate report: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshAnalytics = async () => {
        try {
            setLoading(true);
            // Mock analytics refresh
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('Analytics refreshed');
        } catch (error) {
            console.error('Analytics refresh failed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial analytics load
        handleRefreshAnalytics();
    }, []);

    return (
        <Box sx={{ width: '100%', p: 3 }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4">
                    Insurance Reports & Analytics
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefreshAnalytics}
                    disabled={loading}
                >
                    Refresh Analytics
                </Button>
            </Stack>

            {/* Key Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="text.secondary">
                                Total Policies
                            </Typography>
                            <Typography variant="h4">
                                {analytics.totalPolicies}
                            </Typography>
                            <Typography variant="body2" color="success.main">
                                +8.5% vs last year
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="text.secondary">
                                Total Coverage
                            </Typography>
                            <Typography variant="h4">
                                {formatCurrency(analytics.totalCoverage)}
                            </Typography>
                            <Typography variant="body2" color="success.main">
                                +12.1% vs last year
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="text.secondary">
                                Monthly Premiums
                            </Typography>
                            <Typography variant="h4">
                                {formatCurrency(analytics.monthlyPremiums)}
                            </Typography>
                            <Typography variant="body2" color="success.main">
                                +5.7% vs last year
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="text.secondary">
                                Active Claims
                            </Typography>
                            <Typography variant="h4">
                                {analytics.totalClaims}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {analytics.activePolicies} active, {analytics.pendingClaims} pending
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Report Generation */}
            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                    Generate Reports
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            select
                            label="Report Type"
                            value={filters.reportType}
                            onChange={(e) => handleFilterChange('reportType', e.target.value)}
                            fullWidth
                        >
                            {reportTypes.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <DatePicker
                            label="Start Date"
                            value={filters.startDate}
                            onChange={(value) => handleFilterChange('startDate', value)}
                            fullWidth
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <DatePicker
                            label="End Date"
                            value={filters.endDate}
                            onChange={(value) => handleFilterChange('endDate', value)}
                            fullWidth
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            select
                            label="Policy Type"
                            value={filters.policyType}
                            onChange={(e) => handleFilterChange('policyType', e.target.value)}
                            fullWidth
                        >
                            {policyTypes.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            select
                            label="Status"
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            fullWidth
                        >
                            {statusOptions.map((status) => (
                                <MenuItem key={status.value} value={status.value}>
                                    {status.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>

                <Stack direction="row" spacing={2}>
                    <Button
                        variant="contained"
                        startIcon={<PdfIcon />}
                        onClick={() => handleGenerateReport('pdf')}
                        disabled={loading}
                    >
                        PDF
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<ExcelIcon />}
                        onClick={() => handleGenerateReport('excel')}
                        disabled={loading}
                    >
                        Excel
                    </Button>
                </Stack>
            </Paper>

            {/* Charts Section */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Policy Distribution by Type
                        </Typography>
                        <Box data-testid="pie-chart" sx={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={policyDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {policyDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Monthly Trends
                        </Typography>
                        <Box data-testid="line-chart" sx={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyTrendsData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="policies" stroke="#8884d8" strokeWidth={2} />
                                    <Line type="monotone" dataKey="claims" stroke="#82ca9d" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Premium Collection Trends
                        </Typography>
                        <Box data-testid="bar-chart" sx={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={premiumCollectionData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend />
                                    <Bar dataKey="amount" fill="#8884d8" name="Premium Amount" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Loading Overlay */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <CircularProgress />
                </Box>
            )}
        </Box>
    );
};

export default InsuranceReportsPanel;
