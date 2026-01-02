import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Button,
    TextField,
    MenuItem,
    Typography,
    Paper,
    Avatar,
    FormControlLabel,
    Checkbox,
    Stack,
    Divider,
    InputAdornment
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
    ArrowBack as ArrowBackIcon,
    PhotoCamera as PhotoCameraIcon,
    Delete as DeleteIcon,
    Email as EmailIcon
} from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useNavigate } from 'react-router';
import dayjs from 'dayjs';
import { useCompanyRouting } from '../hooks/useCompanyRouting';
import departmentService from '../services/department.service';
import positionService from '../services/position.service';
import userService from '../services/user.service';
import { getUserProfilePicture, getUserInitials } from '../utils/profilePicture';
import { 
    sanitizeFormData, 
    cleanNameField, 
    cleanArabicName, 
    cleanPhoneNumber, 
    cleanNationalId,
    isValidInput 
} from '../utils/inputSanitizer';

const nationalities = [
    'Egyptian', 'Saudi', 'Emirati', 'Kuwaiti', 'Qatari', 'Bahraini', 'Omani',
    'Jordanian', 'Lebanese', 'Syrian', 'Palestinian', 'Iraqi', 'Yemeni',
    'Libyan', 'Tunisian', 'Algerian', 'Moroccan', 'Sudanese', 'Other'
];

const categories = ['Administrative', 'business', 'Technical', 'Support'];
const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Probation'];
const statuses = ['Active', 'On-leave', 'Terminated', 'Resigned'];
const roles = [
    { value: 'employee', label: 'Employee' },
    { value: 'admin', label: 'Admin' },
    { value: 'hr', label: 'HR' },
    { value: 'manager', label: 'Manager' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'head-of-department', label: 'Head of Department' },
    { value: 'dean', label: 'Dean' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'id-card-admin', label: 'ID Card Admin' }
];

function EmployeeForm(props) {
    const {
        formState,
        onFieldChange,
        onSubmit,
        onReset,
        submitButtonLabel,
        backButtonPath,
        isEditMode = false,
    } = props;

    const formValues = formState.values;
    const formErrors = formState.errors;
    const navigate = useNavigate();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState(getUserProfilePicture(formValues));
    const [supervisors, setSupervisors] = useState([]);

    useEffect(() => {
        fetchDepartments();
        fetchPositions();
        fetchSupervisors();
    }, []);



    const fetchDepartments = async () => {
        try {
            const data = await departmentService.getAll();
            setDepartments(data.filter(d => d.isActive));
        } catch (error) {

        }
    };

    const fetchPositions = async () => {
        try {
            const data = await positionService.getAll();
            setPositions(data.filter(p => p.isActive));
        } catch (error) {

        }
    };

    const fetchSupervisors = async () => {
        // TODO: Implement fetch supervisors from API
        setSupervisors([]);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            // Sanitize form data before submission to prevent JSON parsing errors
            const sanitizedFormData = sanitizeFormData(formValues);
            
            // Validate critical fields
            if (!isValidInput(sanitizedFormData.username)) {
                throw new Error('Username contains invalid characters');
            }
            if (!isValidInput(sanitizedFormData.email)) {
                throw new Error('Email contains invalid characters');
            }
            
            console.log('Submitting sanitized form data:', sanitizedFormData);
            
            // First submit the user data
            const result = await onSubmit(sanitizedFormData);
            
            // If there's a profile picture to upload and we have a user ID
            if (profilePictureFile && result?.userId) {
                try {
                    const profilePictureUrl = await uploadProfilePicture(result.userId);
                    // Update the form values with the uploaded picture URL
                    if (profilePictureUrl) {
                        onFieldChange('profile', {
                            ...formValues.profile,
                            profilePicture: profilePictureUrl
                        });
                    }
                } catch (uploadError) {
                    console.error('Profile picture upload failed:', uploadError);
                    // Don't fail the entire form submission for profile picture upload failure
                }
            }
        } catch (error) {
            console.error('Form submission error:', error);
            // Re-throw the error so the parent component can handle it
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFieldChange = (field) => (event) => {
        let value = event.target.value;
        
        // Apply field-specific cleaning
        switch (field) {
            case 'username':
                // Basic username cleaning - remove special characters but keep basic ones
                value = value.toLowerCase().replace(/[^a-z0-9._-]/g, '').trim();
                break;
            case 'email':
                // Basic email cleaning - remove dangerous characters
                value = value.replace(/[<>'"]/g, '').trim();
                break;
            default:
                // Basic sanitization for other fields
                if (typeof value === 'string') {
                    value = value.replace(/[<>]/g, '').trim();
                }
        }
        
        onFieldChange(field, value);
    };

    const handleNestedFieldChange = (parent, field) => (event) => {
        let value = event.target.value;
        
        // Apply field-specific cleaning
        switch (field) {
            case 'firstName':
            case 'lastName':
            case 'medName':
                value = cleanNameField(value);
                break;
            case 'arabicName':
                value = cleanArabicName(value);
                break;
            case 'phone':
                value = cleanPhoneNumber(value);
                break;
            case 'nationalId':
                value = cleanNationalId(value);
                break;
            default:
                // Basic sanitization for other fields
                if (typeof value === 'string') {
                    value = value.replace(/[<>]/g, '').trim();
                }
        }
        
        onFieldChange(parent, {
            ...formValues[parent],
            [field]: value
        });
    };

    const handleDateChange = (field) => (value) => {
        if (value?.isValid()) {
            onFieldChange(field, value.toISOString());
        } else {
            onFieldChange(field, null);
        }
    };

    const handleNestedDateChange = (parent, field) => (value) => {
        if (value?.isValid()) {
            onFieldChange(parent, {
                ...formValues[parent],
                [field]: value.toISOString()
            });
        } else {
            onFieldChange(parent, {
                ...formValues[parent],
                [field]: null
            });
        }
    };

    const handleBack = () => {
        const { getCompanyRoute } = useCompanyRouting();
        navigate(backButtonPath ?? getCompanyRoute('/users'));
    };

    const handleProfilePictureChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validate file size (2MB limit)
            if (file.size > 2 * 1024 * 1024) {
                alert('File size must be less than 2MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            setProfilePictureFile(file);

            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicturePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveProfilePicture = () => {
        setProfilePictureFile(null);
        setProfilePicturePreview('');
        // Update form values
        onFieldChange('profile', {
            ...formValues.profile,
            profilePicture: ''
        });
    };

    const uploadProfilePicture = async (userId) => {
        if (!profilePictureFile) return null;

        try {
            const formData = new FormData();
            formData.append('profilePicture', profilePictureFile);
            
            const response = await userService.uploadProfilePicture(userId, formData);
            return response.profilePicture;
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            throw error;
        }
    };

    const handleReset = () => {
        if (onReset) {
            onReset();
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                {/* Employee Information Section */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>Employee Information</Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Box sx={{ mr: 3 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Employee Photo</Typography>
                            <Avatar
                                src={profilePicturePreview || getUserProfilePicture(formValues)}
                                sx={{ width: 120, height: 120 }}
                            >
                                {!profilePicturePreview && !getUserProfilePicture(formValues) && 
                                    getUserInitials(formValues)
                                }
                            </Avatar>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<PhotoCameraIcon />}
                                    component="label"
                                >
                                    Change Photo
                                    <input 
                                        type="file" 
                                        hidden 
                                        accept="image/*" 
                                        onChange={handleProfilePictureChange}
                                    />
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={handleRemoveProfilePicture}
                                >
                                    Remove
                                </Button>
                            </Stack>
                        </Box>
                        
                        <Grid container spacing={2} sx={{ flex: 1 }}>
                            {isEditMode && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        label="Employee ID"
                                        value={formValues.employeeId || ''}
                                        disabled
                                        fullWidth
                                        helperText="Auto-generated"
                                    />
                                </Grid>
                            )}
                            <Grid size={{ xs: 12, sm: isEditMode ? 6 : 12 }}>
                                <TextField
                                    label="Username"
                                    value={formValues.username || ''}
                                    onChange={handleFieldChange('username')}
                                    required
                                    fullWidth
                                    error={!!formErrors.username}
                                    helperText={formErrors.username || 'Special characters will be cleaned automatically'}
                                />
                            </Grid>
                            {!isEditMode && (
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        label="Password"
                                        type="password"
                                        value={formValues.password || ''}
                                        onChange={handleFieldChange('password')}
                                        required
                                        fullWidth
                                        error={!!formErrors.password}
                                        helperText={formErrors.password || 'Minimum 6 characters'}
                                    />
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                </Paper>

                {/* Personal Information Section */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>Personal Information</Typography>
                    
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                label="First Name *"
                                value={formValues.profile?.firstName || ''}
                                onChange={handleNestedFieldChange('profile', 'firstName')}
                                required
                                fullWidth
                                helperText="English letters only (auto-cleaned)"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                label="Middle Name"
                                value={formValues.profile?.medName || ''}
                                onChange={handleNestedFieldChange('profile', 'medName')}
                                fullWidth
                                helperText="English letters only (auto-cleaned)"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                label="Last Name *"
                                value={formValues.profile?.lastName || ''}
                                onChange={handleNestedFieldChange('profile', 'lastName')}
                                required
                                fullWidth
                                helperText="English letters only (auto-cleaned)"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                label="Arabic Name *"
                                value={formValues.profile?.arabicName || ''}
                                onChange={handleNestedFieldChange('profile', 'arabicName')}
                                required
                                fullWidth
                                dir="rtl"
                                helperText="Arabic characters only (auto-cleaned)"
                            />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                label="Mobile Number"
                                value={formValues.profile?.phone || ''}
                                onChange={handleNestedFieldChange('profile', 'phone')}
                                fullWidth
                                helperText="Numbers only, 11 digits (auto-cleaned)"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                label="Work Email"
                                type="email"
                                value={formValues.email || ''}
                                onChange={handleFieldChange('email')}
                                fullWidth
                                placeholder="Enter work email address"
                                helperText="Enter the employee's work email address"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailIcon color={formValues.email ? 'primary' : 'action'} />
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                select
                                label="Nationality *"
                                value={formValues.profile?.nationality || ''}
                                onChange={handleNestedFieldChange('profile', 'nationality')}
                                required
                                fullWidth
                                helperText="Select employee nationality"
                            >
                                {nationalities.map((nat) => (
                                    <MenuItem key={nat} value={nat}>{nat}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                label="National ID *"
                                value={formValues.profile?.nationalId || ''}
                                onChange={handleNestedFieldChange('profile', 'nationalId')}
                                required
                                fullWidth
                                helperText="Numbers only, 14 digits (auto-cleaned)"
                            />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <DatePicker
                                label="Hire Date"
                                value={formValues.employment?.hireDate ? dayjs(formValues.employment.hireDate) : null}
                                onChange={handleNestedDateChange('employment', 'hireDate')}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        helperText: 'Years of service: 10 years'
                                    }
                                }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <DatePicker
                                label="Birthday"
                                value={formValues.profile?.dateOfBirth ? dayjs(formValues.profile.dateOfBirth) : null}
                                onChange={handleNestedDateChange('profile', 'dateOfBirth')}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        helperText: 'Auto-extracted from National ID'
                                    }
                                }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                select
                                label="Gender"
                                value={formValues.profile?.gender || ''}
                                onChange={handleNestedFieldChange('profile', 'gender')}
                                fullWidth
                            >
                                <MenuItem value="male">Male</MenuItem>
                                <MenuItem value="female">Female</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Employment Information Section */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>Employment Information</Typography>
                    
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Role *"
                                value={formValues.role || 'employee'}
                                onChange={handleFieldChange('role')}
                                required
                                fullWidth
                                helperText="Select user role and permissions"
                            >
                                {roles.map((role) => (
                                    <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Category *"
                                value={formValues.category || ''}
                                onChange={handleFieldChange('category')}
                                required
                                fullWidth
                            >
                                {categories.map((cat) => (
                                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Job Type *"
                                value={formValues.employment?.contractType || ''}
                                onChange={handleNestedFieldChange('employment', 'contractType')}
                                required
                                fullWidth
                            >
                                {jobTypes.map((type) => (
                                    <MenuItem key={type} value={type.toLowerCase().replace('-', '')}>{type}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Department *"
                                value={formValues.department || ''}
                                onChange={handleFieldChange('department')}
                                required
                                fullWidth
                            >
                                {departments.map((dept) => (
                                    <MenuItem key={dept._id} value={dept._id}>
                                        {dept.name} ({dept.code})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Position *"
                                value={formValues.position || ''}
                                onChange={handleFieldChange('position')}
                                required
                                fullWidth
                            >
                                {positions.map((pos) => (
                                    <MenuItem key={pos._id} value={pos._id}>
                                        {pos.title} ({pos.code})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Section"
                                value={formValues.section || ''}
                                onChange={handleFieldChange('section')}
                                fullWidth
                            >
                                <MenuItem value="">Select Section</MenuItem>
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Status *"
                                value={formValues.employment?.employmentStatus || 'active'}
                                onChange={handleNestedFieldChange('employment', 'employmentStatus')}
                                required
                                fullWidth
                            >
                                {statuses.map((status) => (
                                    <MenuItem key={status} value={status.toLowerCase().replace('-', '')}>{status}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />

                    <Typography variant="subtitle1" sx={{ mb: 2 }}>Permissions</Typography>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={formValues.allowResearch || false}
                                onChange={(e) => onFieldChange('allowResearch', e.target.checked)}
                            />
                        }
                        label="Allow Research"
                    />

                    <Divider sx={{ my: 3 }} />

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={formValues.includeInAttendance !== false}
                                onChange={(e) => onFieldChange('includeInAttendance', e.target.checked)}
                            />
                        }
                        label="Include in Attendance"
                    />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                        If checked, this employee will be included in attendance reports and have access to attendance features.
                    </Typography>
                </Paper>

                {/* Supervision Information Section */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>Supervision Information</Typography>
                    
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Supervisor"
                                value={formValues.supervisor || ''}
                                onChange={handleFieldChange('supervisor')}
                                fullWidth
                                helperText="Only active employees are shown"
                            >
                                <MenuItem value="">Select a supervisor</MenuItem>
                                {supervisors.map((sup) => (
                                    <MenuItem key={sup._id} value={sup._id}>
                                        {sup.name} ({sup.username})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Alternative Supervisor"
                                value={formValues.alternativeSupervisor || ''}
                                onChange={handleFieldChange('alternativeSupervisor')}
                                fullWidth
                                helperText="Only active employees are shown"
                            >
                                <MenuItem value="">Select a supervisor</MenuItem>
                                {supervisors.map((sup) => (
                                    <MenuItem key={sup._id} value={sup._id}>
                                        {sup.name} ({sup.username})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Action Buttons */}
                <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ mt: 3 }}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={handleBack}
                    >
                        Back
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={isSubmitting}
                    >
                        {submitButtonLabel}
                    </Button>
                </Stack>
            </Box>
        </LocalizationProvider>
    );
}

EmployeeForm.propTypes = {
    backButtonPath: PropTypes.string,
    formState: PropTypes.shape({
        errors: PropTypes.object.isRequired,
        values: PropTypes.object.isRequired,
    }).isRequired,
    onFieldChange: PropTypes.func.isRequired,
    onReset: PropTypes.func,
    onSubmit: PropTypes.func.isRequired,
    submitButtonLabel: PropTypes.string.isRequired,
    isEditMode: PropTypes.bool,
};

export default EmployeeForm;
