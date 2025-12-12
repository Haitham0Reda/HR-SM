import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    MenuItem,
    Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Cancel, AccessTime, EventNote, Info } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import forgetCheckService from '../../services/forgetCheck.service';

const CreateForgetCheckPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        requestType: 'check-in',
        requestedTime: '',
        reason: ''
    });

    const requestTypes = [
        { value: 'check-in', label: 'Check In', icon: '🔵' },
        { value: 'check-out', label: 'Check Out', icon: '🟣' }
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.date) {
            showNotification('Please select a date', 'error');
            return;
        }
        if (!formData.requestedTime) {
            showNotification('Please enter the requested time', 'error');
            return;
        }
        if (!formData.reason || formData.reason.trim().length < 10) {
            showNotification('Reason must be at least 10 characters', 'error');
            return;
        }

        try {
            const submitData = {
                employee: user?._id,
                date: formData.date,
                requestType: formData.requestType,
                requestedTime: formData.requestedTime,
                reason: formData.reason.trim()
            };

            await forgetCheckService.create(submitData);
            showNotification('Request created successfully', 'success');

            window.dispatchEvent(new CustomEvent('notificationUpdate'));
            navigate('/app/forget-checks');
        } catch (error) {

            const errorMessage = error?.response?.data?.message || error?.message || 'Operation failed';
            showNotification(errorMessage, 'error');
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            p: 4,
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 4
            }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Create Forget Check Request
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/app/forget-checks')}
                    startIcon={<Cancel />}
                    sx={{ textTransform: 'none' }}
                >
                    Back to Dashboard
                </Button>
            </Box>

            {/* Main Content */}
            <Box sx={{ display: 'flex', gap: 3, flex: 1 }}>
                {/* Form Section */}
                <Box sx={{
                    flex: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 2
                }}>
                    <Typography variant="h6" sx={{ color: 'primary.main', mb: 3, fontWeight: 600 }}>
                        Request Form
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                        <TextField
                            type="date"
                            label="Date *"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            helperText="Select the date you forgot to check in/out"
                        />

                        <TextField
                            select
                            label="Request Type *"
                            name="requestType"
                            value={formData.requestType}
                            onChange={handleChange}
                            required
                            fullWidth
                        >
                            {requestTypes.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Box>
                            <TextField
                                type="time"
                                label="Requested Time *"
                                name="requestedTime"
                                value={formData.requestedTime}
                                onChange={handleChange}
                                required
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                                Enter the time you arrived (for check in) or left (for check out).
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: 'warning.main', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Info sx={{ fontSize: '1rem' }} /> Working hours: 09:00 AM - 03:30 PM
                            </Typography>
                        </Box>

                        <TextField
                            label="Reason *"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={6}
                            required
                            fullWidth
                            placeholder="Explain why you forgot to check in/out (minimum 10 characters)"
                            helperText={`${formData.reason.length}/500 characters (minimum 10 required)`}
                        />

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
                            <Button
                                onClick={handleSubmit}
                                variant="contained"
                                size="large"
                                startIcon={<CheckCircle />}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    px: 4
                                }}
                            >
                                Submit Request
                            </Button>
                            <Button
                                onClick={() => navigate('/app/forget-checks')}
                                variant="outlined"
                                size="large"
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600
                                }}
                            >
                                Cancel
                            </Button>
                        </Box>
                    </Box>
                </Box>

                {/* Information Sidebar */}
                <Box sx={{
                    flex: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 2
                }}>
                    <Typography variant="h6" sx={{ color: 'primary.main', mb: 3, fontWeight: 600 }}>
                        Information
                    </Typography>

                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                            Use this form to request a correction for a missed check-in or check-out.
                        </Typography>
                    </Alert>

                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <AccessTime color="info" />
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                Check In
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            Request to record your arrival time if you forgot to check in when you arrived at work.
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <EventNote color="secondary" />
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                Check Out
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            Request to record your departure time if you forgot to check out when you left work.
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Important Notes
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li>Submit requests as soon as you notice the missed check</li>
                            <li>Provide accurate time and detailed reason</li>
                            <li>Requests require HR approval</li>
                            <li>False information may result in disciplinary action</li>
                        </Box>
                    </Box>

                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 'auto' }}>
                        All requests require approval from HR
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default CreateForgetCheckPage;
