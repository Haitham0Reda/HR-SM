/**
 * Claim Form Component
 * 
 * Form for creating and editing insurance claims.
 * Includes file upload functionality following existing patterns.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Button,
    TextField,
    MenuItem,
    Grid,
    Typography,
    Paper,
    Stack,
    Autocomplete,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    Description as FileIcon
} from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import insuranceService from '../../services/insurance.service';
import { formatCurrency, formatFileSize } from '../../utils/formatters';

const claimTypes = [
    { value: 'death', label: 'Death Benefit' },
    { value: 'disability', label: 'Disability' },
    { value: 'medical', label: 'Medical Expenses' },
    { value: 'other', label: 'Other' }
];

const ClaimForm = ({
    initialValues = {},
    onSubmit,
    onCancel,
    isEditMode = false,
    loading = false
}) => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    
    const [formValues, setFormValues] = useState({
        policyId: '',
        claimType: 'medical',
        claimAmount: '',
        claimDate: dayjs().format('YYYY-MM-DD'),
        description: '',
        ...initialValues
    });

    const [formErrors, setFormErrors] = useState({});
    const [policies, setPolicies] = useState([]);
    const [policySearchTerm, setPolicySearchTerm] = useState('');
    const [policyLoading, setPolicyLoading] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    // Load policy data if editing
    useEffect(() => {
        if (isEditMode && initialValues.policy) {
            setSelectedPolicy(initialValues.policy);
        }
    }, [isEditMode, initialValues.policy]);

    // Search policies
    useEffect(() => {
        const searchPolicies = async () => {
            if (policySearchTerm.length < 2) {
                setPolicies([]);
                return;
            }

            try {
                setPolicyLoading(true);
                const response = await insuranceService.getAllPolicies({
                    search: policySearchTerm,
                    status: 'active'
                });
                setPolicies(response.data || []);
            } catch (error) {
                console.error('Failed to search policies:', error);
                setPolicies([]);
            } finally {
                setPolicyLoading(false);
            }
        };

        const timeoutId = setTimeout(searchPolicies, 300);
        return () => clearTimeout(timeoutId);
    }, [policySearchTerm]);

    const handleFieldChange = (field, value) => {
        setFormValues(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when field is updated
        if (formErrors[field]) {
            setFormErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
    };

    const handlePolicyChange = (event, newValue) => {
        setSelectedPolicy(newValue);
        handleFieldChange('policyId', newValue?._id || '');
    };

    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        // Validate files
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        const validFiles = files.filter(file => {
            if (file.size > maxSize) {
                alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                return false;
            }
            if (!allowedTypes.includes(file.type)) {
                alert(`File ${file.name} has an unsupported format. Please use JPG, PNG, PDF, or DOC files.`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        // Add files to uploaded files list (for display)
        const newFiles = validFiles.map(file => ({
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            id: Date.now() + Math.random() // Temporary ID
        }));

        setUploadedFiles(prev => [...prev, ...newFiles]);
        
        // Clear the input
        event.target.value = '';
    };

    const handleRemoveFile = (fileId) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const validateForm = () => {
        const errors = {};

        if (!formValues.policyId) {
            errors.policyId = 'Policy is required';
        }

        if (!formValues.claimType) {
            errors.claimType = 'Claim type is required';
        }

        if (!formValues.claimAmount || formValues.claimAmount <= 0) {
            errors.claimAmount = 'Claim amount must be greater than 0';
        }

        if (!formValues.claimDate) {
            errors.claimDate = 'Claim date is required';
        }

        if (!formValues.description || formValues.description.trim().length < 10) {
            errors.description = 'Description must be at least 10 characters';
        }

        if (uploadedFiles.length === 0 && !isEditMode) {
            errors.documents = 'At least one supporting document is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            const claimData = {
                ...formValues,
                documents: uploadedFiles.map(f => f.file)
            };
            
            await onSubmit(claimData);
        } catch (error) {
            // Error handling is done in parent component
        }
    };

    const handleBack = () => {
        if (onCancel) {
            onCancel();
        } else {
            navigate(getCompanyRoute('/insurance/claims'));
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                {/* Policy Selection Section */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                        Policy Information
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Autocomplete
                                value={selectedPolicy}
                                onChange={handlePolicyChange}
                                onInputChange={(event, newInputValue) => {
                                    setPolicySearchTerm(newInputValue);
                                }}
                                options={policies}
                                getOptionLabel={(option) => 
                                    option ? `${option.policyNumber} - ${option.employee?.name}` : ''
                                }
                                loading={policyLoading}
                                disabled={isEditMode}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Policy *"
                                        placeholder="Search by policy number or employee name"
                                        error={!!formErrors.policyId}
                                        helperText={
                                            formErrors.policyId || 
                                            (isEditMode ? 'Policy cannot be changed after claim creation' : 'Type to search active policies')
                                        }
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <Box component="li" {...props}>
                                        <Box>
                                            <Typography variant="body2">
                                                {option.policyNumber} - {option.employee?.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Type: {option.policyType} | Coverage: {formatCurrency(option.coverageAmount)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                                noOptionsText={
                                    policySearchTerm.length < 2 
                                        ? "Type at least 2 characters to search"
                                        : "No active policies found"
                                }
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {/* Claim Details Section */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                        Claim Details
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                label="Claim Type *"
                                value={formValues.claimType}
                                onChange={(e) => handleFieldChange('claimType', e.target.value)}
                                fullWidth
                                error={!!formErrors.claimType}
                                helperText={formErrors.claimType}
                            >
                                {claimTypes.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>
                                        {type.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Claim Amount *"
                                type="number"
                                value={formValues.claimAmount}
                                onChange={(e) => handleFieldChange('claimAmount', Number(e.target.value))}
                                fullWidth
                                error={!!formErrors.claimAmount}
                                helperText={formErrors.claimAmount || 'Amount being claimed'}
                                InputProps={{
                                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Claim Date *"
                                value={formValues.claimDate ? dayjs(formValues.claimDate) : null}
                                onChange={(value) => handleFieldChange('claimDate', value?.format('YYYY-MM-DD'))}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        error: !!formErrors.claimDate,
                                        helperText: formErrors.claimDate || 'Date when the incident occurred'
                                    }
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                label="Description *"
                                multiline
                                rows={4}
                                value={formValues.description}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                fullWidth
                                error={!!formErrors.description}
                                helperText={formErrors.description || 'Detailed description of the claim (minimum 10 characters)'}
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {/* Document Upload Section */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                        Supporting Documents
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={<UploadIcon />}
                            disabled={uploading}
                        >
                            Upload Documents
                            <input
                                type="file"
                                hidden
                                multiple
                                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                                onChange={handleFileUpload}
                            />
                        </Button>
                        <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                            Supported formats: JPG, PNG, PDF, DOC, DOCX (Max 10MB per file)
                        </Typography>
                        {formErrors.documents && (
                            <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                                {formErrors.documents}
                            </Typography>
                        )}
                    </Box>

                    {uploadedFiles.length > 0 && (
                        <List>
                            {uploadedFiles.map((file) => (
                                <ListItem key={file.id} divider>
                                    <FileIcon sx={{ mr: 2, color: 'text.secondary' }} />
                                    <ListItemText
                                        primary={file.name}
                                        secondary={`${formatFileSize(file.size)} • ${file.type}`}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleRemoveFile(file.id)}
                                            color="error"
                                            aria-label="delete"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Paper>

                {/* Action Buttons */}
                <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ mt: 3 }}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={handleBack}
                        disabled={loading}
                    >
                        Back
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        startIcon={<SaveIcon />}
                        disabled={loading}
                    >
                        {loading ? 'Submitting...' : (isEditMode ? 'Update Claim' : 'Submit Claim')}
                    </Button>
                </Stack>
            </Box>
        </LocalizationProvider>
    );
};

ClaimForm.propTypes = {
    initialValues: PropTypes.object,
    onSubmit: PropTypes.func.isRequired,
    onCancel: PropTypes.func,
    isEditMode: PropTypes.bool,
    loading: PropTypes.bool
};

export default ClaimForm;