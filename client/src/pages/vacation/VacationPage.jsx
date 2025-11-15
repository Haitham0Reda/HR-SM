import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    TextField,
    Typography,
    Grid,
    Alert,
    Chip,
    Divider,
    Tabs,
    Tab,
    MenuItem
} from '@mui/material';
import { BeachAccess as BeachAccessIcon, Send as SendIcon, History as HistoryIcon } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import leaveService from '../../services/leave.service';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';

const VacationPage = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [vacationHistory, setVacationHistory] = useState([]);
    const [formData, setFormData] = useState({
        type: 'annual',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: ''
    });
    const { showNotification } = useNotification();
    const { user, isHR, isAdmin } = useAuth();

    useEffect(() => {
        fetchVacationHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchVacationHistory = async () => {
        try {
            setLoading(true);
            
            // For HR and Admin users, fetch all vacation requests
            // For regular users, fetch only their own vacation requests
            const params = (isHR || isAdmin) ? {} : { user: user._id };
            const data = await leaveService.getAll(params);
            
            // Filter only vacation-related leaves (annual, casual, sick)
            const vacationData = data.filter(leave => 
                ['annual', 'casual', 'sick'].includes(leave.leaveType)
            );
            
            setVacationHistory(vacationData);
        } catch (error) {
            showNotification('Failed to fetch vacation history', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            
            const submitData = {
                user: user._id,
                leaveType: formData.type,
                startDate: formData.startDate,
                endDate: formData.endDate,
                reason: formData.reason.trim()
            };

            await leaveService.create(submitData);
            showNotification('Vacation request submitted successfully', 'success');
            
            // Reset form
            setFormData({
                type: 'annual',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                reason: ''
            });
            
            // Refresh history
            fetchVacationHistory();
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to submit request';
            showNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const calculateDays = () => {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);

        let workingDays = 0;
        const current = new Date(start);

        // Loop through each day and count only working days (Sunday-Thursday)
        while (current <= end) {
            const dayOfWeek = current.getDay();
            // 0 = Sunday, 1 = Monday, ..., 4 = Thursday (working days)
            // 5 = Friday, 6 = Saturday (official holidays - excluded)
            if (dayOfWeek !== 5 && dayOfWeek !== 6) {
                workingDays++;
            }
            current.setDate(current.getDate() + 1);
        }

        return workingDays > 0 ? workingDays : 0;
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'warning',
            approved: 'success',
            rejected: 'error',
            cancelled: 'default'
        };
        return colors[status] || 'default';
    };

    const historyColumns = [
        // Show user column only for HR/Admin users
        ...(isHR || isAdmin ? [{
            field: 'user',
            headerName: 'Employee',
            renderCell: (row) => {
                const userObj = row.employee || row.user;
                if (!userObj) return 'Unknown User';
                
                const fullName = `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim();
                return fullName || userObj.username || userObj.email || 'Unknown User';
            }
        }] : []),
        {
            field: 'leaveType',
            headerName: 'Type',
            renderCell: (row) => (
                <Chip
                    label={row.leaveType?.charAt(0).toUpperCase() + row.leaveType?.slice(1) || 'N/A'}
                    size="small"
                    variant="outlined"
                    color="primary"
                />
            )
        },
        {
            field: 'startDate',
            headerName: 'Start Date',
            renderCell: (row) => new Date(row.startDate).toLocaleDateString()
        },
        {
            field: 'endDate',
            headerName: 'End Date',
            renderCell: (row) => new Date(row.endDate).toLocaleDateString()
        },
        {
            field: 'duration',
            headerName: 'Days',
            renderCell: (row) => `${row.duration || 0} days`
        },
        {
            field: 'status',
            headerName: 'Status',
            renderCell: (row) => (
                <Chip
                    label={row.status?.toUpperCase() || 'PENDING'}
                    color={getStatusColor(row.status)}
                    size="small"
                />
            )
        },
        {
            field: 'reason',
            headerName: 'Reason',
            renderCell: (row) => row.reason || 'N/A'
        }
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Vacation Management</Typography>
            </Box>

            <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ mb: 3 }}
            >
                <Tab icon={<BeachAccessIcon />} label="Request Vacation" />
                <Tab icon={<HistoryIcon />} label="Vacation History" />
            </Tabs>

            {activeTab === 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Request New Vacation
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        
                        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        select
                                        label="Vacation Type"
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                        fullWidth
                                        required
                                    >
                                        <MenuItem value="annual">Annual Leave</MenuItem>
                                        <MenuItem value="casual">Casual Leave</MenuItem>
                                        <MenuItem value="sick">Sick Leave</MenuItem>
                                    </TextField>
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        label="Days Requested"
                                        value={`${calculateDays()} day(s)`}
                                        InputProps={{
                                            readOnly: true,
                                        }}
                                        fullWidth
                                    />
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        type="date"
                                        label="Start Date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                        required
                                    />
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        type="date"
                                        label="End Date"
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                        required
                                    />
                                </Grid>
                                
                                <Grid item xs={12}>
                                    <TextField
                                        label="Reason"
                                        name="reason"
                                        value={formData.reason}
                                        onChange={handleChange}
                                        multiline
                                        rows={3}
                                        fullWidth
                                    />
                                </Grid>
                                
                                <Grid item xs={12}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={<SendIcon />}
                                        disabled={loading}
                                    >
                                        {loading ? 'Submitting...' : 'Submit Request'}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {activeTab === 1 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Vacation History
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        
                        {loading ? (
                            <Loading />
                        ) : (
                            <DataTable
                                data={vacationHistory}
                                columns={historyColumns}
                                emptyMessage="No vacation history found"
                            />
                        )}
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default VacationPage;