import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import permissionService from '../../services/permission.service';

const CreateOvertimePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [formData, setFormData] = useState({
        user: user?._id || '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        reason: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        // Validate required fields
        if (!formData.date) {
            showNotification('Please select a date', 'error');
            return;
        }
        if (!formData.startTime) {
            showNotification('Please enter start time', 'error');
            return;
        }
        if (!formData.endTime) {
            showNotification('Please enter end time', 'error');
            return;
        }
        if (!formData.reason || formData.reason.trim() === '') {
            showNotification('Please provide a reason for overtime', 'error');
            return;
        }

        try {
            console.log('Submitting overtime request:', formData);

            // Create overtime request using permission service
            const overtimeData = {
                type: 'overtime',
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,
                reason: formData.reason,
                user: formData.user
            };

            const response = await permissionService.create(overtimeData);
            console.log('Overtime request created:', response);

            showNotification('Overtime request created successfully', 'success');
            navigate('/overtime');
        } catch (error) {
            console.error('Error creating overtime:', error);
            const errorMessage = error?.message || error?.response?.data?.message || 'Failed to create overtime request';
            showNotification(errorMessage, 'error');
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            color: 'text.primary',
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
                    Create Overtime Request
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/overtime')}
                    startIcon={<Cancel />}
                    sx={{
                        textTransform: 'none',
                    }}
                >
                    Back to Dashboard
                </Button>
            </Box>

            {/* Main Content */}
            <Box sx={{
                display: 'flex',
                gap: 3,
                flex: 1,
                flexWrap: { xs: 'wrap', md: 'nowrap' }
            }}>
                {/* Form Section */}
                <Box sx={{
                    flex: { xs: '1 1 100%', md: '2 1 0' },
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                }}>
                    <Typography variant="h6" sx={{ color: 'primary.main', mb: 3, fontWeight: 600 }}>
                        Overtime Request Form
                    </Typography>

                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        flex: 1
                    }}>
                        <TextField
                            type="date"
                            label="Date *"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            fullWidth
                            InputLabelProps={{
                                shrink: true
                            }}
                            helperText="Select the date for which you worked overtime."
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                type="time"
                                label="End of Working Day *"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleChange}
                                fullWidth
                                InputLabelProps={{
                                    shrink: true
                                }}
                                helperText="This field is automatically set based on working hours."
                            />
                            <TextField
                                type="time"
                                label="Last Check Time *"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleChange}
                                fullWidth
                                InputLabelProps={{
                                    shrink: true
                                }}
                                helperText="Enter the time you actually left the office."
                            />
                        </Box>

                        <TextField
                            label="Reason *"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={4}
                            required
                            fullWidth
                            placeholder="Please provide a detailed reason for your overtime work."
                            helperText="Please provide a detailed reason for your overtime work."
                        />

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 2, mt: 'auto', flexWrap: 'wrap' }}>
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
                                onClick={() => navigate('/overtime')}
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
                    flex: { xs: '1 1 100%', md: '1 1 0' },
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                }}>
                    <Typography variant="h6" sx={{ color: 'primary.main', mb: 3, fontWeight: 600 }}>
                        Information
                    </Typography>

                    <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Working Hours
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            09:00 - 15:30
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Overtime Requirements
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li>Overtime must be at least 2 hours</li>
                            <li>Must be after the end of working day (15:30)</li>
                            <li>Requires supervisor approval</li>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            How to Calculate Overtime
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            Overtime starts after the end of working day (15:30) until your last check time. After supervisor approval, overtime will be calculated in your attendance report.
                        </Typography>
                    </Box>

                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 'auto' }}>
                        Please submit overtime requests within 7 days of the work performed.
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default CreateOvertimePage;
