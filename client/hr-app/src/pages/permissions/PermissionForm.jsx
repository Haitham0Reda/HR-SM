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
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import permissionService from '../../services/permission.service';
import Loading from '../../components/common/Loading';

const PermissionForm = () => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { id } = useParams();
    useDocumentTitle(id ? 'Edit Permission' : 'Create Permission');
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        permissionType: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        duration: '',
        reason: '',
    });
    const [errors, setErrors] = useState({});

    const isEditMode = Boolean(id);

    const permissionTypes = [
        { value: 'late-arrival', label: 'Late Arrival' },
        { value: 'early-departure', label: 'Early Departure' }
    ];

    useEffect(() => {
        if (isEditMode) {
            fetchPermission();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchPermission = async () => {
        try {
            setLoading(true);
            const permission = await permissionService.getById(id);
            setFormData({
                permissionType: permission.permissionType || '',
                date: permission.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                time: permission.time || '',
                duration: permission.duration || '',
                reason: permission.reason || '',
            });
        } catch (error) {

            showNotification('Failed to load permission', 'error');
            navigate(getCompanyRoute('/permissions'));
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    const validateForm = () => {
        const newErrors = {};

        if (!formData.permissionType) {
            newErrors.permissionType = 'Permission type is required';
        }

        if (!formData.date) {
            newErrors.date = 'Date is required';
        }

        if (!formData.time || formData.time.trim() === '') {
            newErrors.time = 'Time is required';
        } else if (!validateTimeFormat(formData.time)) {
            newErrors.time = 'Time must be in HH:MM format (e.g., 09:30)';
        }

        if (!formData.reason || formData.reason.trim() === '') {
            newErrors.reason = 'Reason is required';
        } else if (formData.reason.length > 300) {
            newErrors.reason = 'Reason must not exceed 300 characters';
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
                permissionType: formData.permissionType,
                date: formData.date,
                time: formData.time.trim(),
                reason: formData.reason.trim(),
            };

            // Add duration if provided
            if (formData.duration) {
                submitData.duration = parseFloat(formData.duration);
            }

            if (isEditMode) {
                await permissionService.update(id, submitData);
                showNotification('Permission updated successfully', 'success');
            } else {
                await permissionService.create(submitData);
                showNotification('Permission created successfully', 'success');
                window.dispatchEvent(new CustomEvent('notificationUpdate'));
            }

            navigate(getCompanyRoute('/permissions'));
        } catch (error) {

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
                    {isEditMode ? 'Edit Permission' : 'Create Permission'}
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => navigate(getCompanyRoute('/permissions'))}
                    startIcon={<Cancel />}
                    sx={{ textTransform: 'none' }}
                >
                    Back to Permissions
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
                        Permission Details
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                        <TextField
                            select
                            label="Permission Type *"
                            name="permissionType"
                            value={formData.permissionType}
                            onChange={handleChange}
                            required
                            fullWidth
                            error={Boolean(errors.permissionType)}
                            helperText={errors.permissionType || 'Select the type of permission request'}
                        >
                            <MenuItem value="">-- Select Type --</MenuItem>
                            {permissionTypes.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </TextField>

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
                            helperText={errors.date || 'Select the date for the permission'}
                        />

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Time *"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    placeholder="HH:MM (e.g., 09:30)"
                                    error={Boolean(errors.time)}
                                    helperText={errors.time || 'Enter time in HH:MM format'}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    type="number"
                                    label="Duration (hours)"
                                    name="duration"
                                    value={formData.duration}
                                    onChange={handleChange}
                                    fullWidth
                                    slotProps={{
                                        htmlInput: { min: 0, step: 0.5 }
                                    }}
                                    helperText="Optional: Duration in hours"
                                />
                            </Grid>
                        </Grid>

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
                            helperText={errors.reason || 'Provide a reason for the permission (max 300 characters)'}
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
                                {isEditMode ? 'Update Permission' : 'Submit Permission'}
                            </Button>
                            <Button
                                onClick={() => navigate(getCompanyRoute('/permissions'))}
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
                            What is a Permission?
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            A permission request is used to document late arrivals or early departures from work. This helps track attendance exceptions.
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Permission Types
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li><strong>Late Arrival:</strong> When you arrive after scheduled start time</li>
                            <li><strong>Early Departure:</strong> When you leave before scheduled end time</li>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Time Format
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            Enter time in 24-hour format (HH:MM). Examples: 09:30, 14:45, 08:00
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Important Notes
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li>Submit permission requests promptly</li>
                            <li>Provide clear and valid reasons</li>
                            <li>All permissions require supervisor approval</li>
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

export default PermissionForm;
