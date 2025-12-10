import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    MenuItem,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import permissionService from '../../services/permission.service';

const CreatePermissionPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [formData, setFormData] = useState({
        user: user?._id || '',
        type: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        reason: '',
    });

    const permissionTypes = [
        { value: 'late-arrival', label: 'Late Arrival' },
        { value: 'early-departure', label: 'Early Departure' }
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        // Validate required fields
        if (!formData.type) {
            showNotification('Please select a permission type', 'error');
            return;
        }
        if (!formData.date) {
            showNotification('Please select a date', 'error');
            return;
        }
        if (!formData.startTime) {
            showNotification('Please enter expected time', 'error');
            return;
        }
        if (!formData.endTime) {
            showNotification('Please enter actual time', 'error');
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

            // Map 'user' field to 'employee' for backend compatibility
            const submitData = {
                ...formData,
                employee: formData.user,
                permissionType: formData.type,
                time: formData.startTime, // Use startTime as the main time field
                duration: duration
            };
            // Remove the old field names
            delete submitData.user;
            delete submitData.type;

            await permissionService.create(submitData);

            showNotification('Permission request created successfully', 'success');

            // Trigger notification refresh for HR/Admin (with small delay)
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('notificationUpdate'));
            }, 500);

            navigate('/app/permissions');
        } catch (error) {

            const errorMessage = error?.message || error?.data?.message || 'Operation failed';
            showNotification(errorMessage, 'error');
        }
    };

    const handleCancel = () => {
        navigate('/app/permissions');
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
                    Create Permission Request
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/app/permissions')}
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
                flex: 1
            }}>
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
                        Permission Request Form
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
                            InputLabelProps={{ shrink: true }}
                            helperText="Select the date for which you need permission."
                        />

                        <TextField
                            select
                            label="Permission Type *"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                            fullWidth>
                            <MenuItem value="">-- Select Type --</MenuItem>
                            {permissionTypes.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                type="time"
                                label="Expected Time *"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                helperText="This field is automatically set based on working hours."
                            />
                            <TextField
                                type="time"
                                label="Actual Time *"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                placeholder="--:-- --"
                            />
                        </Box>

                        <TextField
                            label="Reason"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={4}
                            fullWidth
                            placeholder="Please provide a detailed reason for your request (optional)."
                            helperText="Optional: Provide additional details about your request."
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
                                onClick={() => navigate('/app/permissions')}
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

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Working Hours
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            09:00 - 15:30
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Late Arrival
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            Use this option if you arrived after 09:00. The expected time should be 09:00 and the actual time should be when you actually arrived.
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Early Departure
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            Use this option if you left before 15:30. The expected time should be 15:30 and the actual time should be when you actually left.
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Permission Limits
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li><strong>Daily Limit:</strong> 2 hours</li>
                            <li><strong>Monthly Limit:</strong> 4 hours</li>
                        </Box>
                    </Box>

                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 'auto' }}>
                        HR Month: Day 20 to Day 19
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default CreatePermissionPage;
