import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Grid,
    FormHelperText,
    Alert,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Cancel, CloudUpload } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import sickLeaveService from '../../services/sickLeave.service';
import Loading from '../../components/common/Loading';

const SickLeaveForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    useDocumentTitle(id ? 'Edit Sick Leave' : 'Create Sick Leave');
    const { showNotification } = useNotification();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
    });
    const [medicalDocuments, setMedicalDocuments] = useState([]);
    const [errors, setErrors] = useState({});
    const [duration, setDuration] = useState(0);

    const isEditMode = Boolean(id);

    useEffect(() => {
        if (isEditMode) {
            fetchSickLeave();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        calculateDuration();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.startDate, formData.endDate]);

    const fetchSickLeave = async () => {
        try {
            setLoading(true);
            const sickLeave = await sickLeaveService.getById(id);
            setFormData({
                startDate: sickLeave.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                endDate: sickLeave.endDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                reason: sickLeave.reason || '',
            });
        } catch (error) {

            showNotification('Failed to load sick leave', 'error');
            navigate('/app/sick-leaves');
        } finally {
            setLoading(false);
        }
    };

    const calculateDuration = () => {
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setDuration(diffDays);
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

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setMedicalDocuments(files);
        if (errors.medicalDocuments) {
            setErrors(prev => ({ ...prev, medicalDocuments: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

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

        // Check if medical documentation is required (>3 days)
        if (duration > 3 && medicalDocuments.length === 0 && !isEditMode) {
            newErrors.medicalDocuments = 'Medical documentation is required for sick leave exceeding 3 days';
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
            // Calculate duration in days
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days

            const submitData = new FormData();
            submitData.append('employee', user._id); // Add the current user as the employee
            submitData.append('startDate', formData.startDate);
            submitData.append('endDate', formData.endDate);
            submitData.append('duration', diffDays); // Add calculated duration
            
            if (formData.reason && formData.reason.trim()) {
                submitData.append('reason', formData.reason.trim());
            }

            // Add medical documents if provided
            if (medicalDocuments.length > 0) {
                medicalDocuments.forEach((file) => {
                    submitData.append('medicalDocuments', file);
                });
            }

            if (isEditMode) {
                await sickLeaveService.update(id, submitData);
                showNotification('Sick leave updated successfully', 'success');
            } else {
                await sickLeaveService.create(submitData);
                showNotification('Sick leave created successfully', 'success');
                window.dispatchEvent(new CustomEvent('notificationUpdate'));
            }

            navigate('/app/sick-leaves');
        } catch (error) {
            console.error('Sick leave submission error:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Operation failed';
            showNotification(errorMessage, 'error');
        }
    };

    if (loading) return <Loading />;

    const requiresMedicalDoc = duration > 3;

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
                    {isEditMode ? 'Edit Sick Leave' : 'Create Sick Leave'}
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/app/sick-leaves')}
                    startIcon={<Cancel />}
                    sx={{ textTransform: 'none' }}
                >
                    Back to Sick Leaves
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
                        Sick Leave Details
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
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
                                    helperText={errors.startDate || 'Select the first day of sick leave'}
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
                                    helperText={errors.endDate || 'Select the last day of sick leave'}
                                />
                            </Grid>
                        </Grid>

                        {duration > 0 && (
                            <Alert severity="info">
                                Duration: {duration} {duration === 1 ? 'day' : 'days'}
                                {requiresMedicalDoc && ' - Medical documentation is required'}
                            </Alert>
                        )}

                        <TextField
                            label="Reason"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={4}
                            fullWidth
                            helperText="Optional: Provide details about your illness (max 500 characters)"
                            inputProps={{ maxLength: 500 }}
                        />

                        {/* Medical Documentation Upload */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                                Medical Documentation {requiresMedicalDoc && '*'}
                            </Typography>
                            <Button
                                variant="outlined"
                                component="label"
                                startIcon={<CloudUpload />}
                                fullWidth
                                sx={{ mb: 1 }}
                            >
                                Upload Medical Documents
                                <input
                                    type="file"
                                    hidden
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={handleFileChange}
                                />
                            </Button>
                            {medicalDocuments.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Selected files:
                                    </Typography>
                                    {medicalDocuments.map((file, index) => (
                                        <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                                            • {file.name}
                                        </Typography>
                                    ))}
                                </Box>
                            )}
                            {errors.medicalDocuments && (
                                <FormHelperText error>{errors.medicalDocuments}</FormHelperText>
                            )}
                            <FormHelperText>
                                {requiresMedicalDoc 
                                    ? 'Medical documentation is required for sick leave exceeding 3 days'
                                    : 'Optional: Upload medical certificates or doctor notes'}
                            </FormHelperText>
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
                            <Button
                                onClick={handleSubmit}
                                variant="contained"
                                size="large"
                                startIcon={<CheckCircle />}
                                sx={{ textTransform: 'none', fontWeight: 600, px: 4 }}
                            >
                                {isEditMode ? 'Update Sick Leave' : 'Submit Sick Leave'}
                            </Button>
                            <Button
                                onClick={() => navigate('/app/sick-leaves')}
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
                            Two-Step Approval Process
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            Sick leave requests go through a two-step approval process:
                        </Typography>
                        <Box component="ol" sx={{ pl: 2, m: 0, mt: 1, color: 'text.secondary' }}>
                            <li>Supervisor Review</li>
                            <li>Doctor Review (if approved by supervisor)</li>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Medical Documentation
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li>Required for sick leave exceeding 3 days</li>
                            <li>Accepted formats: PDF, JPG, PNG, DOC, DOCX</li>
                            <li>Multiple files can be uploaded</li>
                            <li>Doctor may request additional documentation</li>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Important Notes
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li>Submit sick leave requests as soon as possible</li>
                            <li>Provide clear medical documentation</li>
                            <li>Both supervisor and doctor must approve</li>
                            <li>You will be notified at each approval step</li>
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

export default SickLeaveForm;
