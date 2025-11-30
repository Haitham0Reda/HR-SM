import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import missionService from '../../services/mission.service';
import departmentService from '../../services/department.service';
import Loading from '../../components/common/Loading';

const MissionForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    useDocumentTitle(id ? 'Edit Mission' : 'Create Mission');
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [formData, setFormData] = useState({
        location: '',
        purpose: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        relatedDepartment: '',
        reason: '',
    });
    const [errors, setErrors] = useState({});

    const isEditMode = Boolean(id);

    useEffect(() => {
        fetchDepartments();
        if (isEditMode) {
            fetchMission();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchDepartments = async () => {
        try {
            const data = await departmentService.getAll();
            setDepartments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        }
    };

    const fetchMission = async () => {
        try {
            setLoading(true);
            const mission = await missionService.getById(id);
            setFormData({
                location: mission.location || '',
                purpose: mission.purpose || '',
                startDate: mission.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                endDate: mission.endDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                startTime: mission.startTime || '',
                endTime: mission.endTime || '',
                relatedDepartment: mission.relatedDepartment?._id || mission.relatedDepartment || '',
                reason: mission.reason || '',
            });
        } catch (error) {
            console.error('Error fetching mission:', error);
            showNotification('Failed to load mission', 'error');
            navigate('/app/missions');
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

    const validateForm = () => {
        const newErrors = {};

        if (!formData.location || formData.location.trim() === '') {
            newErrors.location = 'Location is required';
        } else if (formData.location.length > 200) {
            newErrors.location = 'Location must not exceed 200 characters';
        }

        if (!formData.purpose || formData.purpose.trim() === '') {
            newErrors.purpose = 'Purpose is required';
        } else if (formData.purpose.length > 500) {
            newErrors.purpose = 'Purpose must not exceed 500 characters';
        }

        if (!formData.startDate) {
            newErrors.startDate = 'Start date is required';
        }

        if (!formData.endDate) {
            newErrors.endDate = 'End date is required';
        }

        if (formData.startDate && formData.endDate) {
            if (new Date(formData.endDate) < new Date(formData.startDate)) {
                newErrors.endDate = 'End date cannot be before start date';
            }
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
                location: formData.location.trim(),
                purpose: formData.purpose.trim(),
                startDate: formData.startDate,
                endDate: formData.endDate,
            };

            // Add optional fields if provided
            if (formData.startTime) submitData.startTime = formData.startTime;
            if (formData.endTime) submitData.endTime = formData.endTime;
            if (formData.relatedDepartment) submitData.relatedDepartment = formData.relatedDepartment;
            if (formData.reason && formData.reason.trim()) submitData.reason = formData.reason.trim();

            if (isEditMode) {
                await missionService.update(id, submitData);
                showNotification('Mission updated successfully', 'success');
            } else {
                await missionService.create(submitData);
                showNotification('Mission created successfully', 'success');
                window.dispatchEvent(new CustomEvent('notificationUpdate'));
            }

            navigate('/app/missions');
        } catch (error) {
            console.error('Error submitting mission:', error);
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
                    {isEditMode ? 'Edit Mission' : 'Create Mission'}
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/app/missions')}
                    startIcon={<Cancel />}
                    sx={{ textTransform: 'none' }}
                >
                    Back to Missions
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
                        Mission Details
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                        <TextField
                            label="Location *"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            required
                            fullWidth
                            error={Boolean(errors.location)}
                            helperText={errors.location || 'Specify where the mission will take place (max 200 characters)'}
                            inputProps={{ maxLength: 200 }}
                        />

                        <TextField
                            label="Purpose *"
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleChange}
                            multiline
                            rows={4}
                            required
                            fullWidth
                            error={Boolean(errors.purpose)}
                            helperText={errors.purpose || 'Describe the purpose of the mission (max 500 characters)'}
                            inputProps={{ maxLength: 500 }}
                        />

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    type="date"
                                    label="Start Date *"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    error={Boolean(errors.startDate)}
                                    helperText={errors.startDate || 'Select the first day of the mission'}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    type="date"
                                    label="End Date *"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    error={Boolean(errors.endDate)}
                                    helperText={errors.endDate || 'Select the last day of the mission'}
                                />
                            </Grid>
                        </Grid>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    type="time"
                                    label="Start Time"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    helperText="Optional: Specify start time if needed"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    type="time"
                                    label="End Time"
                                    name="endTime"
                                    value={formData.endTime}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    helperText="Optional: Specify end time if needed"
                                />
                            </Grid>
                        </Grid>

                        <TextField
                            select
                            label="Related Department"
                            name="relatedDepartment"
                            value={formData.relatedDepartment}
                            onChange={handleChange}
                            fullWidth
                            helperText="Optional: Select the department related to this mission"
                        >
                            <MenuItem value="">-- None --</MenuItem>
                            {departments.map((dept) => (
                                <MenuItem key={dept._id} value={dept._id}>
                                    {dept.name}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Additional Notes"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={3}
                            fullWidth
                            helperText="Optional: Provide any additional context or notes"
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
                                {isEditMode ? 'Update Mission' : 'Submit Mission'}
                            </Button>
                            <Button
                                onClick={() => navigate('/app/missions')}
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
                            What is a Mission?
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            A mission is a work-related trip or assignment outside your regular workplace. This includes business trips, training, conferences, or field assignments.
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Required Information
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li>Location: Where the mission will take place</li>
                            <li>Purpose: Why you need to go on this mission</li>
                            <li>Start and End Dates: Duration of the mission</li>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Important Notes
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li>Submit mission requests in advance</li>
                            <li>Provide clear and detailed information</li>
                            <li>Ensure proper coordination with your team</li>
                            <li>All missions require supervisor approval</li>
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

export default MissionForm;
