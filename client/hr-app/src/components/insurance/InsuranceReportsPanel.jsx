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
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/formatters';

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
            // Mock report generation
            const reportData = {
                ...filters,
                format
            };
            console.log('Generating report:', reportData);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Create mock download
            const blob = new Blob(['Mock report data'], { type: format === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `insurance-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Report generation failed:', error);
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
        <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                    <Grid item xs={12} sm={6} md={3}>
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
                    <Grid item xs={12} sm={6} md={3}>
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
                    <Grid item xs={12} sm={6} md={3}>
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
                    <Grid item xs={12} sm={6} md={3}>
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
                        <Grid item xs={12} sm={6} md={3}>
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

                        <Grid item xs={12} sm={6} md={3}>
                            <DatePicker
                                label="Start Date"
                                value={filters.startDate}
                                onChange={(value) => handleFilterChange('startDate', value)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true
                                    }
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <DatePicker
                                label="End Date"
                                value={filters.endDate}
                                onChange={(value) => handleFilterChange('endDate', value)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true
                                    }
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
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

                        <Grid item xs={12} sm={6} md={3}>
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
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Policy Distribution by Type
                            </Typography>
                            <Box data-testid="pie-chart" sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography color="text.secondary">Pie Chart Placeholder</Typography>
                            </Box>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Monthly Trends
                            </Typography>
                            <Box data-testid="line-chart" sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography color="text.secondary">Line Chart Placeholder</Typography>
                            </Box>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Premium Collection Trends
                            </Typography>
                            <Box data-testid="bar-chart" sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography color="text.secondary">Bar Chart Placeholder</Typography>
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
        </LocalizationProvider>
    );
};

export default InsuranceReportsPanel;