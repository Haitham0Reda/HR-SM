import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Grid,
    MenuItem,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import overtimeService from '../../services/overtime.service';
import Loading from '../../components/common/Loading';

const OvertimeForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    useDocumentTitle(id ? 'Edit Overtime' : 'Create Overtime');
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        duration: '',
        reason: '',
        compensationType: '',
    });
    const [errors, setErrors] = useState({});

    const isEditMode = Boolean(id);

    const compensationTypes = [
        { value: 'paid', label: 'Paid' },
        { value: 'time-off', label: 'Time Off' },
        { value: 'none', label: 'None' }
    ];

    useEffect(() => {
        if (isEditMode) {
            fetchOvertime();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchOvertime = async () => {
        try {
            setLoading(true);
            const overtime = await overtimeService.getById(id);
            setFormData({
                date: overtime.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                startTime: overtime.startTime || '',
                endTime: overtime.endTime || '',
                duration: overtime.duration || '',
                reason: overtime.reason || '',
                compensationType: overtime.compensationType || '',
            });
        } catch (error) {
            console.error('Error fetching overtime:', error);
            showNotification('Failed to load overtime', 'error');
            navigate('/app/overtime');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Auto-calculate duration when both times are set
        if (name === 'startTime' || name === 'endTime') {
            const start = name === 'startTime' ? value : formData.startTime;
            const end = name === 'endTime' ? value : formData.endTime;
            
            if (start && end && validateTimeFormat(start) && validateTimeFormat(end)) {
                const duration = calculateDuration(start, end);
                if (duration > 0) {
                    setFormData(prev => ({ ...prev, duration: duration.toString() }));
                }
            }
        }
        
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateTimeFormat = (time) => {
        // HH:MM format validation
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
    };

    const calculateDuration = (startTime, endTime) => {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        let durationMinutes = endMinutes - startMinutes;
        
        // Handle overnight shifts
        if (durationMinutes < 0) {
            durationMinutes += 24 * 60;
        }
        
        return (durationMinutes / 60).toFixed(2);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.date) {
            newErrors.date = 'Date is required';
        }

        if (!formData.startTime || formData.startTime.trim() === '') {
            newErrors.startTime = 'Start time is required';
        } else if (!validateTimeFormat(formData.startTime)) {
            newErrors.startTime = 'Start time must be in HH:MM format (e.g., 09:30)';
        }

        if (!formData.endTime || formData.endTime.trim() === '') {
            newErrors.endTime = 'End time is required';
        } else if (!validateTimeFormat(formData.endTime)) {
            newErrors.endTime = 'End time must be in HH:MM format (e.g., 17:30)';
        }

        // Validate time range
        if (formData.startTime && formData.endTime && validateTimeFormat(formData.startTime) && validateTimeFormat(formData.endTime)) {
            const duration = calculateDuration(formData.startTime, formData.endTime);
            if (duration <= 0) {
                newErrors.endTime = 'End time must be after start time';
            }
        }

        if (!formData.reason || formData.reason.trim() === '') {
            newErrors.reason = 'Reason is required';
        } else if (formData.reason.length > 300) {
            newErrors.reason = 'Reason must not exceed 300 characters';
        }

        if (!formData.compensationType) {
            newErrors.compensationType = 'Compensation type is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            showNotification('Please fix the form errors', 'error');
            return;
        }

        try {
            const submitData = {
                date: formData.date,
                startTime: formData.startTime.trim(),
                endTime: formData.endTime.trim(),
                reason: formData.reason.trim(),
                compensationType: formData.compensationType,
            };

            // Add duration if provided
            if (formData.duration) {
                submitData.duration = parseFloat(formData.duration);
            }

            if (isEditMode) {
                await overtimeService.update(id, submitData);
                showNotification('Overtime updated successfully', 'success');
            } else {
                await overtimeService.create(submitData);
                showNotification('Overtime created successfully', 'success');
                window.dispatchEvent(new CustomEvent('notificationUpdate'));
            }

            navigate('/app/overtime');
        } catch (error) {
            console.error('Error submitting overtime:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Operation failed';
            showNotification(errorMessage, 'error');
        }
    };

    if (loading) return <Loading />;

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            p: 4,
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 4,
            }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {isEditMode ? 'Edit Overtime' : 'Create Overtime'}
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/app/overtime')}
                    startIcon={<Cancel />}
                    sx={{ textTransform: 'none' }}
                >
                    Back to Overtime
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
                    boxShadow: 2,
                }}>
                    <Typography variant="h6" sx={{ color: 'primary.main', mb: 3, fontWeight: 600 }}>
                        Overtime Details
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
                            slotProps={{ inputLabel: { shrink: true } }}
                            error={Boolean(errors.date)}
                            helperText={errors.date || 'Select the date for the overtime'}
                        />

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Start Time *"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    placeholder="HH:MM (e.g., 18:00)"
                                    error={Boolean(errors.startTime)}
                                    helperText={errors.startTime || 'Enter start time in HH:MM format'}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="End Time *"
                                    name="endTime"
                                    value={formData.endTime}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    placeholder="HH:MM (e.g., 22:00)"
                                    error={Boolean(errors.endTime)}
                                    helperText={errors.endTime || 'Enter end time in HH:MM format'}
                                />
                            </Grid>
                        </Grid>

                        <TextField
                            type="number"
                            label="Duration (hours)"
                            name="duration"
                            value={formData.duration}
                            onChange={handleChange}
                            fullWidth
                            slotProps={{
                                htmlInput: { min: 0, step: 0.25 }
                            }}
                            helperText="Auto-calculated from time range or enter manually"
                        />

                        <TextField
                            select
                            label="Compensation Type *"
                            name="compensationType"
                            value={formData.compensationType}
                            onChange={handleChange}
                            required
                            fullWidth
                            error={Boolean(errors.compensationType)}
                            helperText={errors.compensationType || 'Select how this overtime will be compensated'}
                        >
                            <MenuItem value="">-- Select Type --</MenuItem>
                            {compensationTypes.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Reason *"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={4}
                            required
                            fullWidth
                            error={Boolean(errors.reason)}
                            helperText={errors.reason || 'Provide a reason for the overtime (max 300 characters)'}
                            slotProps={{
                                htmlInput: { maxLength: 300 }
                            }}
                        />

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
                            <Button
                                onClick={handleSubmit}
                                variant="contained"
                                size="large"
                                startIcon={<CheckCircle />}
                                sx={{ textTransform: 'none', fontWeight: 600, px: 4 }}
                            >
                                {isEditMode ? 'Update Overtime' : 'Submit Overtime'}
                            </Button>
                            <Button
                                onClick={() => navigate('/app/overtime')}
                                variant="outlined"
                                size="large"
                                sx={{ textTransform: 'none', fontWeight: 600 }}
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
                    boxShadow: 2,
                }}>
                    <Typography variant="h6" sx={{ color: 'primary.main', mb: 3, fontWeight: 600 }}>
                        Information
                    </Typography>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            What is Overtime?
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            Overtime records track extra working hours beyond your regular schedule. This helps ensure proper compensation or time-off allocation.
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Compensation Types
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li><strong>Paid:</strong> Receive monetary compensation</li>
                            <li><strong>Time Off:</strong> Convert to compensatory time off</li>
                            <li><strong>None:</strong> No compensation (voluntary)</li>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Time Format
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            Enter time in 24-hour format (HH:MM). Examples: 18:00, 22:30, 08:00
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Important Notes
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li>Submit overtime records promptly</li>
                            <li>Duration is auto-calculated from time range</li>
                            <li>All overtime requires supervisor approval</li>
                            <li>Compensation is processed after approval</li>
                        </Box>
                    </Box>

                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 'auto' }}>
                        * Required fields must be filled
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default OvertimeForm;
