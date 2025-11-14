import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    MenuItem,
    Grid,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import leaveService from '../../services/leave.service';

const CreateLeavePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [formData, setFormData] = useState({
        user: user?._id || '',
        type: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        reason: '',
        missionLocation: '',
        missionPurpose: ''
    });

    const leaveTypes = [
        { value: 'mission', label: 'Mission' },
        { value: 'sick', label: 'Sick' }
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };



    const handleSubmit = async () => {
        // Validate required fields
        if (!formData.type) {
            showNotification('Please select a leave type', 'error');
            return;
        }
        if (!formData.startDate) {
            showNotification('Please select a start date', 'error');
            return;
        }
        if (!formData.endDate) {
            showNotification('Please select an end date', 'error');
            return;
        }
        if (new Date(formData.endDate) < new Date(formData.startDate)) {
            showNotification('End date cannot be before start date', 'error');
            return;
        }



        try {
            // Prepare data for submission
            const submitData = { ...formData };

            // If mission type, add mission object (only if fields are provided)
            if (formData.type === 'mission') {
                if (formData.missionLocation || formData.missionPurpose) {
                    submitData.mission = {
                        location: formData.missionLocation?.trim() || '',
                        purpose: formData.missionPurpose?.trim() || ''
                    };
                }
                // Remove the flat fields
                delete submitData.missionLocation;
                delete submitData.missionPurpose;
            }

            console.log('Submitting leave request:', submitData);
            const response = await leaveService.create(submitData);
            console.log('Leave created successfully:', response);
            showNotification('Leave request created successfully', 'success');

            // Trigger notification refresh for HR/Admin
            window.dispatchEvent(new CustomEvent('notificationUpdate'));

            navigate('/app/leaves');
        } catch (error) {
            console.error('Error creating leave:', error);
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
                    Create Leave Request
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/app/leaves')}
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
                        Leave Request Form
                    </Typography>

                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        flex: 1
                    }}>
                        <TextField
                            select
                            label="Leave Type *"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                            fullWidth>
                            <MenuItem value="">-- Select Type --</MenuItem>
                            {leaveTypes.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="date"
                                    label="Start Date *"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    helperText="Select the first day of your leave."
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="date"
                                    label="End Date *"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    helperText="Select the last day of your leave."
                                />
                            </Grid>
                        </Grid>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="time"
                                    label="From Time"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    helperText="Optional: Specify start time if needed."
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    type="time"
                                    label="To Time"
                                    name="endTime"
                                    value={formData.endTime}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    helperText="Optional: Specify end time if needed."
                                />
                            </Grid>
                        </Grid>

                        {formData.type === 'mission' && (
                            <>
                                <TextField
                                    label="Mission Location (Optional)"
                                    name="missionLocation"
                                    value={formData.missionLocation}
                                    onChange={handleChange}
                                    fullWidth
                                    placeholder="Enter the mission location"
                                    helperText="Optional: Specify where the mission will take place"
                                />
                                <TextField
                                    label="Mission Purpose (Optional)"
                                    name="missionPurpose"
                                    value={formData.missionPurpose}
                                    onChange={handleChange}
                                    multiline
                                    rows={4}
                                    fullWidth
                                    placeholder="Describe the purpose of the mission"
                                    helperText="Optional: Provide details about the mission"
                                />
                            </>
                        )}

                        <TextField
                            label="Reason (Optional)"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            multiline
                            rows={4}
                            fullWidth
                            placeholder="Optional: Provide additional details"
                            helperText="Optional: Provide additional context if needed"
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
                                onClick={() => navigate('/app/leaves')}
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
                            Leave Types
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            Select the appropriate leave type based on your situation.
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Mission
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            Use this for work-related travel, training, conferences, or official business trips outside your regular workplace.
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Sick
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                            For medical reasons or health-related absences. A doctor's note may be required for extended periods.
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                            Important Notes
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
                            <li>Submit mission requests in advance when possible</li>
                            <li>Provide detailed information about your absence</li>
                            <li>Ensure proper coordination with your team</li>
                        </Box>
                    </Box>

                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 'auto' }}>
                        All leave requests require approval from HR
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default CreateLeavePage;
