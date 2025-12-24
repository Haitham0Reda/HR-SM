/**
 * Policy Form Component
 * 
 * Form for creating and editing insurance policies.
 * Follows existing form patterns from EmployeeForm.
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
    Autocomplete
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import insuranceService from '../../services/insurance.service';
import { formatCurrency } from '../../utils/formatters';

const policyTypes = [
    { value: 'CAT_A', label: 'Category A', description: 'Basic coverage', premium: 100 },
    { value: 'CAT_B', label: 'Category B', description: 'Standard coverage', premium: 200 },
    { value: 'CAT_C', label: 'Category C', description: 'Premium coverage', premium: 300 }
];

const coverageAmounts = {
    CAT_A: [50000, 100000, 150000],
    CAT_B: [100000, 200000, 300000],
    CAT_C: [200000, 400000, 500000]
};

const PolicyForm = ({
    initialValues = {},
    onSubmit,
    onCancel,
    isEditMode = false,
    loading = false
}) => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    
    const [formValues, setFormValues] = useState({
        employeeId: '',
        policyType: 'CAT_C',
        coverageAmount: 200000,
        premium: 300,
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
        deductible: 0,
        notes: '',
        ...initialValues
    });

    const [formErrors, setFormErrors] = useState({});
    const [employees, setEmployees] = useState([]);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [employeeLoading, setEmployeeLoading] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // Load employee data if editing
    useEffect(() => {
        if (isEditMode && initialValues.employee) {
            setSelectedEmployee(initialValues.employee);
        }
    }, [isEditMode, initialValues.employee]);

    // Search employees
    useEffect(() => {
        const searchEmployees = async () => {
            if (employeeSearchTerm.length < 2) {
                setEmployees([]);
                return;
            }

            try {
                setEmployeeLoading(true);
                const response = await insuranceService.searchEmployees(employeeSearchTerm);
                setEmployees(response.data || []);
            } catch (error) {
                console.error('Failed to search employees:', error);
                setEmployees([]);
            } finally {
                setEmployeeLoading(false);
            }
        };

        const timeoutId = setTimeout(searchEmployees, 300);
        return () => clearTimeout(timeoutId);
    }, [employeeSearchTerm]);

    // Update coverage amounts and premium when policy type changes
    useEffect(() => {
        const selectedType = policyTypes.find(type => type.value === formValues.policyType);
        if (selectedType) {
            const availableCoverages = coverageAmounts[formValues.policyType];
            setFormValues(prev => ({
                ...prev,
                coverageAmount: availableCoverages[0],
                premium: selectedType.premium
            }));
        }
    }, [formValues.policyType]);

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

    const handleEmployeeChange = (event, newValue) => {
        setSelectedEmployee(newValue);
        handleFieldChange('employeeId', newValue?._id || '');
    };

    const validateForm = () => {
        const errors = {};

        if (!formValues.employeeId) {
            errors.employeeId = 'Employee is required';
        }

        if (!formValues.policyType) {
            errors.policyType = 'Policy type is required';
        }

        if (!formValues.coverageAmount || formValues.coverageAmount <= 0) {
            errors.coverageAmount = 'Coverage amount must be greater than 0';
        }

        if (!formValues.premium || formValues.premium <= 0) {
            errors.premium = 'Premium must be greater than 0';
        }

        if (!formValues.startDate) {
            errors.startDate = 'Start date is required';
        }

        if (!formValues.endDate) {
            errors.endDate = 'End date is required';
        }

        if (formValues.startDate && formValues.endDate) {
            const startDate = dayjs(formValues.startDate);
            const endDate = dayjs(formValues.endDate);
            
            if (endDate.isBefore(startDate)) {
                errors.endDate = 'End date must be after start date';
            }
        }

        if (formValues.deductible < 0) {
            errors.deductible = 'Deductible cannot be negative';
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
            await onSubmit(formValues);
        } catch (error) {
            // Error handling is done in parent component
        }
    };

    const handleBack = () => {
        if (onCancel) {
            onCancel();
        } else {
            navigate(getCompanyRoute('/insurance/policies'));
        }
    };

    const availableCoverages = coverageAmounts[formValues.policyType] || [];

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                {/* Employee Selection Section */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                        Employee Information
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Autocomplete
                                value={selectedEmployee}
                                onChange={handleEmployeeChange}
                                onInputChange={(event, newInputValue) => {
                                    setEmployeeSearchTerm(newInputValue);
                                }}
                                options={employees}
                                getOptionLabel={(option) => 
                                    option ? `${option.name} (${option.employeeNumber})` : ''
                                }
                                loading={employeeLoading}
                                disabled={isEditMode}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Employee *"
                                        placeholder="Search by name or employee number"
                                        error={!!formErrors.employeeId}
                                        helperText={
                                            formErrors.employeeId || 
                                            (isEditMode ? 'Employee cannot be changed after policy creation' : 'Type to search employees')
                                        }
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <Box component="li" {...props}>
                                        <Box>
                                            <Typography variant="body2">
                                                {option.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                ID: {option.employeeNumber} | Dept: {option.department?.name || 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                                noOptionsText={
                                    employeeSearchTerm.length < 2 
                                        ? "Type at least 2 characters to search"
                                        : "No employees found"
                                }
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {/* Policy Details Section */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                        Policy Details
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                label="Policy Type *"
                                value={formValues.policyType}
                                onChange={(e) => handleFieldChange('policyType', e.target.value)}
                                fullWidth
                                error={!!formErrors.policyType}
                                helperText={formErrors.policyType}
                            >
                                {policyTypes.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>
                                        <Box>
                                            <Typography variant="body2">
                                                {type.label}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {type.description} - Base Premium: {formatCurrency(type.premium)}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                label="Coverage Amount *"
                                value={formValues.coverageAmount}
                                onChange={(e) => handleFieldChange('coverageAmount', Number(e.target.value))}
                                fullWidth
                                error={!!formErrors.coverageAmount}
                                helperText={formErrors.coverageAmount}
                            >
                                {availableCoverages.map((amount) => (
                                    <MenuItem key={amount} value={amount}>
                                        {formatCurrency(amount)}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Premium *"
                                type="number"
                                value={formValues.premium}
                                onChange={(e) => handleFieldChange('premium', Number(e.target.value))}
                                fullWidth
                                error={!!formErrors.premium}
                                helperText={formErrors.premium || 'Monthly premium amount'}
                                InputProps={{
                                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Deductible"
                                type="number"
                                value={formValues.deductible}
                                onChange={(e) => handleFieldChange('deductible', Number(e.target.value))}
                                fullWidth
                                error={!!formErrors.deductible}
                                helperText={formErrors.deductible || 'Amount deducted from claims'}
                                InputProps={{
                                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Start Date *"
                                value={formValues.startDate ? dayjs(formValues.startDate) : null}
                                onChange={(value) => handleFieldChange('startDate', value?.format('YYYY-MM-DD'))}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        error: !!formErrors.startDate,
                                        helperText: formErrors.startDate
                                    }
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="End Date *"
                                value={formValues.endDate ? dayjs(formValues.endDate) : null}
                                onChange={(value) => handleFieldChange('endDate', value?.format('YYYY-MM-DD'))}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        error: !!formErrors.endDate,
                                        helperText: formErrors.endDate
                                    }
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                label="Notes"
                                multiline
                                rows={3}
                                value={formValues.notes}
                                onChange={(e) => handleFieldChange('notes', e.target.value)}
                                fullWidth
                                helperText="Additional notes or comments about this policy"
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {/* Policy Summary */}
                <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Policy Summary
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                                Employee
                            </Typography>
                            <Typography variant="body1">
                                {selectedEmployee?.name || 'Not selected'}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                                Policy Type
                            </Typography>
                            <Typography variant="body1">
                                {policyTypes.find(t => t.value === formValues.policyType)?.label || 'N/A'}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                                Coverage Amount
                            </Typography>
                            <Typography variant="body1">
                                {formatCurrency(formValues.coverageAmount)}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                                Monthly Premium
                            </Typography>
                            <Typography variant="body1">
                                {formatCurrency(formValues.premium)}
                            </Typography>
                        </Grid>
                    </Grid>
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
                        {loading ? 'Saving...' : (isEditMode ? 'Update Policy' : 'Create Policy')}
                    </Button>
                </Stack>
            </Box>
        </LocalizationProvider>
    );
};

PolicyForm.propTypes = {
    initialValues: PropTypes.object,
    onSubmit: PropTypes.func.isRequired,
    onCancel: PropTypes.func,
    isEditMode: PropTypes.bool,
    loading: PropTypes.bool
};

export default PolicyForm;