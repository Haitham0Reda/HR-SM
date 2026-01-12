import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    MenuItem,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import overtimeService from '../../services/overtime.service';
import DateInput from '../../components/common/DateInput';

const CreateOvertimePage = () => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [formData, setFormData] = useState({
        user: user?._id || '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        reason: '',
        compensationType: 'paid', // Default compensation type
    });

    const compensationTypes = [
        { value: 'paid', label: 'Paid' },
        { value: 'time-off', label: 'Time Off' },
        { value: 'none', label: 'None' }
    ];

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
        try {
            // Calculate duration in hours between startTime and endTime
            let duration = 0;
            if (formData.startTime && formData.endTime) {
                const [startHour, startMin] = formData.startTime.split(':').map(Number);
                const [endHour, endMin] = formData.endTime.split(':').map(Number);
                const startMinutes = startHour * 60 + startMin;
                const endMinutes = endHour * 60 + endMin;
                duration = Math.abs(endMinutes - startMinutes) / 60; // Convert to hours
            }

            // Create overtime request using overtime service
            const overtimeData = {
                employee: formData.user,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,
                duration: duration,
                reason: formData.reason,
                compensationType: formData.compensationType
            };

            const response = await overtimeService.create(overtimeData);

            showNotification('Overtime request created successfully', 'success');

            // Dispatch custom events to notify other components
            window.dispatchEvent(new CustomEvent('overtimeCreated'));
            window.dispatchEvent(new CustomEvent('notificationUpdate'));

            navigate(getCompanyRoute('/overtime'));
        } catch (error) {

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
                    onClick={() => navigate(getCompanyRoute('/overtime'))}
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
                        <DateInput  label="Date *"
                            name="date"
                            id="overtime-date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            fullWidth
                            slotProps={{
                                inputLabel: { shrink: true }
                            }}
                            helperText="Select the date for which you worked overtime."
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                type="time"
                                label="End of Working Day *"
                                name="startTime"
                                id="overtime-start-time"
                                value={formData.startTime}
                                onChange={handleChange}
                                fullWidth
                                slotProps={{
                                    inputLabel: { shrink: true }
                                }}
                                helperText="This field is automatically set based on working hours."
                            />
                            <TextField
                                type="time"
                                label="Last Check Time *"
                                name="endTime"
                                id="overtime-end-time"
                                value={formData.endTime}
                                onChange={handleChange}
                                fullWidth
                                slotProps={{
                                    inputLabel: { shrink: true }
                                }}
                                helperText="Enter the time you actually left the office."
                            />
                        </Box>

                        <TextField
                            select
                            label="Compensation Type *"
                            name="compensationType"
                            id="overtime-compensation-type"
                            value={formData.compensationType}
                            onChange={handleChange}
                            required
                            fullWidth
                            helperText="Select how you want to be compensated for overtime."
                        >
                            {compensationTypes.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Reason (Optional)"
                            name="reason"
                            id="overtime-reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={4}
                            fullWidth
                            placeholder="Provide additional details about your overtime work (optional)."
                            helperText="Optional: Provide additional details about your overtime work."
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
                                onClick={() => navigate(getCompanyRoute('/overtime'))}
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


