import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Grid,
    TextField,
    MenuItem,
    Chip
} from '@mui/material';
import { Assessment, Download, Print, PictureAsPdf } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import reportService from '../../services/report.service';

const ReportsPage = () => {
    const [filters, setFilters] = useState({
        reportType: 'attendance',
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        department: '',
        user: ''
    });
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();

    const reportTypes = [
        { value: 'attendance', label: 'Attendance Report', description: 'Employee attendance summary' },
        { value: 'leave', label: 'Leave Report', description: 'Leave requests and balances' },
        { value: 'payroll', label: 'Payroll Report', description: 'Salary and payment details' },
        { value: 'performance', label: 'Performance Report', description: 'Employee performance metrics' },
        { value: 'department', label: 'Department Report', description: 'Department-wise statistics' },
        { value: 'custom', label: 'Custom Report', description: 'Build your own report' }
    ];

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateReport = async (format = 'view') => {
        try {
            setLoading(true);
            const response = await reportService.generate(filters);

            if (format === 'pdf') {
                showNotification('PDF report generated successfully', 'success');
                // In real implementation, this would download the PDF
            } else if (format === 'excel') {
                showNotification('Excel report generated successfully', 'success');
                // In real implementation, this would download the Excel file
            } else {
                showNotification('Report generated successfully', 'success');
            }
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to generate report', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3 }}>Reports</Typography>

            <Grid container spacing={3}>
                {/* Report Type Selection */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Select Report Type</Typography>
                            <Grid container spacing={2}>
                                {reportTypes.map((type) => (
                                    <Grid item xs={12} sm={6} md={4} key={type.value}>
                                        <Card
                                            sx={{
                                                cursor: 'pointer',
                                                border: filters.reportType === type.value ? 2 : 1,
                                                borderColor: filters.reportType === type.value ? 'primary.main' : 'divider',
                                                '&:hover': { borderColor: 'primary.main' }
                                            }}
                                            onClick={() => setFilters(prev => ({ ...prev, reportType: type.value }))}
                                        >
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                    <Assessment color="primary" sx={{ mr: 1 }} />
                                                    <Typography variant="subtitle1">{type.label}</Typography>
                                                </Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    {type.description}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Filters */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Report Filters</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <TextField
                                        type="date"
                                        label="Start Date"
                                        name="startDate"
                                        value={filters.startDate}
                                        onChange={handleFilterChange}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <TextField
                                        type="date"
                                        label="End Date"
                                        name="endDate"
                                        value={filters.endDate}
                                        onChange={handleFilterChange}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <TextField
                                        select
                                        label="Department"
                                        name="department"
                                        value={filters.department}
                                        onChange={handleFilterChange}
                                        fullWidth
                                    >
                                        <MenuItem value="">All Departments</MenuItem>
                                        <MenuItem value="hr">HR</MenuItem>
                                        <MenuItem value="it">IT</MenuItem>
                                        <MenuItem value="finance">Finance</MenuItem>
                                        <MenuItem value="operations">Operations</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <TextField
                                        label="Employee ID (Optional)"
                                        name="user"
                                        value={filters.user}
                                        onChange={handleFilterChange}
                                        fullWidth
                                        placeholder="Leave empty for all"
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Actions */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Generate Report</Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Assessment />}
                                    onClick={() => handleGenerateReport('view')}
                                    disabled={loading}
                                >
                                    View Report
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<PictureAsPdf />}
                                    onClick={() => handleGenerateReport('pdf')}
                                    disabled={loading}
                                >
                                    Export as PDF
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<Download />}
                                    onClick={() => handleGenerateReport('excel')}
                                    disabled={loading}
                                >
                                    Export as Excel
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<Print />}
                                    onClick={() => window.print()}
                                    disabled={loading}
                                >
                                    Print
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Quick Stats */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Quick Statistics</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                                        <Typography variant="h4" color="primary.contrastText">156</Typography>
                                        <Typography variant="body2" color="primary.contrastText">Total Employees</Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                                        <Typography variant="h4" color="success.contrastText">142</Typography>
                                        <Typography variant="body2" color="success.contrastText">Present Today</Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                                        <Typography variant="h4" color="warning.contrastText">8</Typography>
                                        <Typography variant="body2" color="warning.contrastText">On Leave</Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                                        <Typography variant="h4" color="error.contrastText">6</Typography>
                                        <Typography variant="body2" color="error.contrastText">Absent</Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Reports */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Recent Reports</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {[
                                    { name: 'Monthly Attendance Report - November 2025', date: '2025-11-10', type: 'Attendance' },
                                    { name: 'Payroll Summary - October 2025', date: '2025-11-01', type: 'Payroll' },
                                    { name: 'Leave Balance Report - Q4 2025', date: '2025-10-28', type: 'Leave' }
                                ].map((report, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            p: 2,
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            '&:hover': { bgcolor: 'action.hover' }
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="subtitle2">{report.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Generated on {new Date(report.date).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Chip label={report.type} size="small" />
                                            <Button size="small" startIcon={<Download />}>
                                                Download
                                            </Button>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ReportsPage;
