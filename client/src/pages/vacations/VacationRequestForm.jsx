import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Grid,
    MenuItem,
    Alert,
    Paper,
    Chip,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Cancel, EventAvailable } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import vacationService from '../../services/vacation.service';
import Loading from '../../components/common/Loading';

const VacationRequestForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    useDocumentTitle(id ? 'Edit Vacation Request' : 'Create Vacation Request');
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [checkingBalance, setCheckingBalance] = useState(false);
    const [balanceInfo, setBalanceInfo] = useState(null);
    const [formData, setFormData] = useState({
        vacationType: 'annual',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        reason: '',
    });
    const [errors, setErrors] = useState({});

    const isEditMode = Boolean(id);

    const vacationTypeOptions = [
        { value: 'annual', label: 'Annual Leave', description: 'Regular annual vacation days' },
        { value: 'casual', label: 'Casual Leave', description: 'Short-term casual leave' },
        { value: 'sick', label: 'Sick Leave', description: 'Medical leave (requires documentation)' },
        { value: 'unpaid', label: 'Unpaid Leave', description: 'Leave without pay' },
    ];

    useEffect(() => {
        if (isEditMode) {
            fetchVacation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        // Check balance when vacation type or dates change
        if (formData.vacationType && formData.startDate && formData.endDate) {
            checkVacationBalance();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.vacationType, formData.startDate, formData.endDate]);

    const fetchVacation = async () => {
        try {
            setLoading(true);
            const vacation = await vacationService.getById(id);
            setFormData({
                vacationType: vacation.vacationType || 'annual',
                startDate: vacation.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                endDate: vacation.endDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                startTime: vacation.startTime || '',
                endTime: vacation.endTime || '',
                reason: vacation.reason || '',
            });
        } catch (error) {
            console.error('Error fetching vacation:', error);
            showNotification('Failed to load vacation', 'error');
            navigate('/app/vacation-requests');
        } finally {
            setLoading(false);
        }
    };

    const checkVacationBalance = async () => {
        try {
            setCheckingBalance(true);
            const startDate = new Date(formData.startDate);
            const endDate = new Date(formData.endDate);
            const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

            // Mock balance check - in real implementation, this would call an API
            // For now, we'll simulate balance information
            setBalanceInfo({
                type: formData.vacationType,
                available: 15, // Mock available days
                requested: duration,
                remaining: 15 - duration,
            });
        } catch (error) {
            console.error('Error checking balance:', error);
        } finally {
            setCheckingBalance(false);
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

        if (!formData.vacationType) {
            newErrors.vacationType = 'Vacation type is required';
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

        if (formData.reason && formData.reason.length > 500) {
            newErrors.reason = 'Reason must not exceed 500 characters';
        }

        // Check balance for paid leave types
        if (balanceInfo && ['annual', 'casual'].includes(formData.vacationType)) {
            if (balanceInfo.remaining < 0) {
                newErrors.balance = 'Insufficient vacation balance';
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
                vacationType: formData.vacationType,
                startDate: formData.startDate,
                endDate: formData.endDate,
            };

            // Add optional fields if provided
            if (formData.startTime) submitData.startTime = formData.startTime;
            if (formData.endTime) submitData.endTime = formData.endTime;
            if (formData.reason && formData.reason.trim()) submitData.reason = formData.reason.trim();

            if (isEditMode) {
                await vacationService.update(id, submitData);
                showNotification('Vacation request updated successfully', 'success');
            } else {
                await vacationService.create(submitData);
                showNotification('Vacation request created successfully', 'success');
                window.dispatchEvent(new CustomEvent('notificationUpdate'));
            }

            navigate('/app/vacation-requests');
        } catch (error) {
            console.error('Error submitting vacation:', error);
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
                    {isEditMode ? 'Edit Vacation Request' : 'Create Vacation Request'}
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/app/vacation-requests')}
                    startIcon={<Cancel />}
                    sx={{ textTransform: 'none' }}
                >
                    Back to Vacation Requests
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
                        Vacation Request Details
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                        <TextField
                            select
                            label="Vacation Type *"
                            name="vacationType"
                            value={formData.vacationType}
                            onChange={handleChange}
                            required
                            fullWidth
                            error={Boolean(errors.vacationType)}
                            helperText={errors.vacationType || 'Select the type of vacation you are requesting'}
                        >
                            {vacationTypeOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    <Box>
                                        <Typography variant="body1">{option.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {option.description}
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>

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
                                    helperText={errors.startDate || 'Select the first day of vacation'}
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
                                    helperText={errors.endDate || 'Select the last day of vacation'}
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
                            label="Reason"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={4}
                            fullWidth
                            error={Boolean(errors.reason)}
                            helperText={errors.reason || 'Optional: Provide a reason for your vacation request (max 500 characters)'}
                            inputProps={{ maxLength: 500 }}
                        />

                        {/* Balance Display */}
                        {balanceInfo && (
                            <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <EventAvailable color="primary" />
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                        Vacation Balance
                                    </Typography>
                                </Box>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 4 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Available
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {balanceInfo.available} days
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 4 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Requested
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {balanceInfo.requested} days
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 4 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Remaining
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            <Chip
                                                label={`${balanceInfo.remaining} days`}
                                                color={balanceInfo.remaining >= 0 ? 'success' : 'error'}
                                                size="small"
                                            />
                                        </Typography>
                                    </Grid>
                                </Grid>
                                {errors.balance && (
                                    <Alert severity="error" sx={{ mt: 2 }}>
                                        {errors.balance}
                                    </Alert>
                                )}
                            </Paper>
                        )}

                        {checkingBalance && (
                            <Alert severity="info">
                                Checking vacation balance...
                            </Alert>
                        )}

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
                            <Button
                                onClick={handleSubmit}
                                variant="contained"
                                size="large"
                                startIcon={<CheckCircle />}
                                sx={{ textTransform: 'none', fontWeight: 600, px: 4 }}
                            >
                                {isEditMode ? 'Update Request' : 'Submit Request'}
                            </Button>
                            <Button
                                onClick={() => navigate('/app/vacation-requests')}
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
                            Vacation Types
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li><strong>Annual:</strong> Regular paid vacation days</li>
                            <li><strong>Casual:</strong> Short-term casual leave</li>
                            <li><strong>Sick:</strong> Medical leave with documentation</li>
                            <li><strong>Unpaid:</strong> Leave without salary</li>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Important Notes
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li>Submit vacation requests in advance</li>
                            <li>Check your vacation balance before submitting</li>
                            <li>Sick leave may require medical documentation</li>
                            <li>All requests require supervisor approval</li>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Balance Information
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            Your vacation balance is automatically checked when you select dates. Make sure you have sufficient balance before submitting your request.
                        </Typography>
                    </Box>

                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 'auto' }}>
                        * Required fields must be filled
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default VacationRequestForm;
