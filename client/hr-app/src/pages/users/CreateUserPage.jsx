import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import {
    Box,
    Button,
    TextField,
    Typography,
    MenuItem,
    Paper,
    Stack,
    Avatar,
    IconButton,
    InputAdornment,
    Grid,
    Stepper,
    Step,
    StepLabel,
    Card,
    CardContent,
    alpha,
    Fade
} from '@mui/material';
import {
    Person as PersonIcon,
    ArrowBack as ArrowBackIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Work as WorkIcon,
    AdminPanelSettings as AdminIcon,
    Badge as BadgeIcon,
    Phone as PhoneIcon,
    LocationOn as LocationIcon,
    CalendarToday as CalendarIcon,
    Business as BusinessIcon,
    NavigateNext as NextIcon,
    NavigateBefore as BackIcon,
    Check as CheckIcon,
    CameraAlt as CameraIcon
} from '@mui/icons-material';
import userService from '../../services/user.service';
import departmentService from '../../services/department.service';
import positionService from '../../services/position.service';
import { useNotification } from '../../store/providers/ReduxNotificationProvider';

const steps = ['Account', 'Personal Info', 'Employment'];

const CreateUserPage = () => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { showNotification } = useNotification();
    const [activeStep, setActiveStep] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [profilePicture, setProfilePicture] = useState(null); // eslint-disable-line no-unused-vars
    const [profilePicturePreview, setProfilePicturePreview] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'employee',
        department: '',
        subDepartment: '',
        position: '',
        personalInfo: {
            fullName: '',
            firstName: '',
            medName: '',
            lastName: '',
            arabicName: '',
            dateOfBirth: '',
            gender: '',
            nationality: '',
            nationalId: '',
            phone: '',
            address: '',
            maritalStatus: ''
        },
        employment: {
            hireDate: '',
            contractType: '',
            employmentStatus: 'active'
        }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            let [deptResponse, posResponse] = await Promise.all([
                departmentService.getAll(),
                positionService.getAll()
            ]);
            
            // Handle API response format: {success: true, data: Array} or just Array
            let deptData = deptResponse?.data || deptResponse;
            let posData = posResponse?.data || posResponse;
            
            // Ensure we have arrays
            if (!Array.isArray(deptData)) {
                console.warn('Department data is not an array:', deptData);
                deptData = [];
            }
            if (!Array.isArray(posData)) {
                console.warn('Position data is not an array:', posData);
                posData = [];
            }
            
            // Sort departments hierarchically (main departments first, then sub-departments)
            const sortedDepts = [];
            const mainDepts = deptData.filter(d => !d.parentDepartment);
            const subDepts = deptData.filter(d => d.parentDepartment);
            
            mainDepts.forEach(mainDept => {
                sortedDepts.push(mainDept);
                // Add sub-departments of this main department
                const children = subDepts.filter(sub => 
                    (typeof sub.parentDepartment === 'object' ? sub.parentDepartment._id : sub.parentDepartment) === mainDept._id
                );
                sortedDepts.push(...children);
            });
            
            // Add any remaining sub-departments (orphaned)
            const addedSubIds = new Set(sortedDepts.filter(d => d.parentDepartment).map(d => d._id));
            const remainingSubs = subDepts.filter(d => !addedSubIds.has(d._id));
            sortedDepts.push(...remainingSubs);
            
            setDepartments(sortedDepts);
            setPositions(posData);
        } catch (error) {
            console.error('Error fetching data:', error);
            setDepartments([]);
            setPositions([]);
        }
    };

    const getBirthDateFromNID = (nid) => {
        if (!nid || nid.length !== 14) return "";
        
        const centuryCode = nid[0];
        const year = nid.slice(1, 3);
        const month = nid.slice(3, 5);
        const day = nid.slice(5, 7);
        
        let century = "";
        if (centuryCode === "2") century = "19";
        else if (centuryCode === "3") century = "20";
        else return "";
        
        return `${century}${year}-${month}-${day}`;
    };

    const handleChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            
            if (field === 'personalInfo.fullName') {
                const nameParts = value.trim().split(/\s+/);
                const updates = { fullName: value };
                
                if (nameParts.length === 1) {
                    updates.firstName = nameParts[0];
                    updates.medName = '';
                    updates.lastName = '';
                } else if (nameParts.length === 2) {
                    updates.firstName = nameParts[0];
                    updates.medName = '';
                    updates.lastName = nameParts[1];
                } else if (nameParts.length >= 3) {
                    updates.firstName = nameParts[0];
                    updates.medName = nameParts.slice(1, -1).join(' ');
                    updates.lastName = nameParts[nameParts.length - 1];
                }
                
                setFormData(prev => ({
                    ...prev,
                    [parent]: { ...prev[parent], ...updates }
                }));
            } else if (field === 'personalInfo.nationalId') {
                const updates = { nationalId: value };
                
                if (value.length === 14) {
                    const birthDate = getBirthDateFromNID(value);
                    if (birthDate) {
                        updates.dateOfBirth = birthDate;
                        showNotification('Birth date extracted from National ID', 'success');
                    }
                }
                
                setFormData(prev => ({
                    ...prev,
                    [parent]: { ...prev[parent], ...updates }
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    [parent]: { ...prev[parent], [child]: value }
                }));
            }
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleProfilePictureChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showNotification('Please select an image file', 'error');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Image size should be less than 5MB', 'error');
                return;
            }
            
            setProfilePicture(file);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicturePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNext = () => {
        if (activeStep === 0) {
            if (!formData.username || !formData.email || !formData.password) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }
        }
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.username || !formData.email || !formData.password) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        try {
            if (profilePicturePreview) {
                formData.personalInfo.profilePicture = profilePicturePreview;
            }
            
            // Prepare data for submission
            const submitData = {
                ...formData,
                // Use sub-department if selected, otherwise use main department
                // Convert empty strings to null to avoid ObjectId validation errors
                department: (formData.subDepartment && formData.subDepartment !== '') 
                    ? formData.subDepartment 
                    : (formData.department && formData.department !== '') 
                        ? formData.department 
                        : null,
                // Also handle position field
                position: (formData.position && formData.position !== '') ? formData.position : null
            };
            
            // Remove subDepartment field as it's not part of the user model
            delete submitData.subDepartment;
            
            await userService.create(submitData);
            showNotification('User created successfully', 'success');
            navigate(getCompanyRoute('/users'));
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to create user', 'error');
        }
    };

    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Fade in timeout={500}>
                        <Box>
                            <Stack spacing={3}>
                                {/* Profile Picture */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                                    <Box sx={{ position: 'relative' }}>
                                        <Avatar
                                            src={profilePicturePreview}
                                            sx={{
                                                width: 140,
                                                height: 140,
                                                fontSize: '4rem',
                                                fontWeight: 700,
                                                bgcolor: 'primary.main',
                                                border: '5px solid',
                                                borderColor: 'background.paper',
                                                boxShadow: 4,
                                                mb: 2
                                            }}
                                        >
                                            {formData.username?.charAt(0).toUpperCase() || <PersonIcon sx={{ fontSize: 70 }} />}
                                        </Avatar>
                                        <input
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            id="create-user-profile-picture-upload"
                                            type="file"
                                            onChange={handleProfilePictureChange}
                                        />
                                        <label htmlFor="create-user-profile-picture-upload">
                                            <IconButton
                                                component="span"
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 20,
                                                    right: 0,
                                                    bgcolor: 'primary.main',
                                                    color: 'white',
                                                    '&:hover': { bgcolor: 'primary.dark' },
                                                    boxShadow: 2
                                                }}
                                            >
                                                <CameraIcon />
                                            </IconButton>
                                        </label>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Click camera icon to upload photo
                                    </Typography>
                                </Box>

                                <TextField 
                                    id="create-user-username"
                                    label="Username" 
                                    value={formData.username} 
                                    onChange={(e) => handleChange('username', e.target.value)} 
                                    required 
                                    fullWidth
                                    placeholder="john.doe"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonIcon color="action" />
                                            </InputAdornment>
                                        )
                                    }}
                                />
                                
                                <TextField 
                                    id="create-user-email"
                                    label="Email Address" 
                                    type="email" 
                                    value={formData.email} 
                                    onChange={(e) => handleChange('email', e.target.value)} 
                                    required 
                                    fullWidth
                                    placeholder="john.doe@company.com"
                                />
                                
                                <TextField 
                                    id="create-user-password"
                                    label="Password" 
                                    type={showPassword ? 'text' : 'password'} 
                                    value={formData.password} 
                                    onChange={(e) => handleChange('password', e.target.value)} 
                                    required 
                                    fullWidth
                                    placeholder="Enter strong password"
                                    helperText="Password will be stored securely"
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />
                                
                                <TextField 
                                    id="create-user-role"
                                    select 
                                    label="Role" 
                                    value={formData.role} 
                                    onChange={(e) => handleChange('role', e.target.value)} 
                                    required 
                                    fullWidth
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <AdminIcon color="action" />
                                            </InputAdornment>
                                        )
                                    }}
                                >
                                    <MenuItem value="employee">Employee</MenuItem>
                                    <MenuItem value="admin">Administrator</MenuItem>
                                    <MenuItem value="hr">HR</MenuItem>
                                    <MenuItem value="manager">Manager</MenuItem>
                                    <MenuItem value="supervisor">Supervisor</MenuItem>
                                    <MenuItem value="head-of-department">Head of Department</MenuItem>
                                    <MenuItem value="dean">Dean</MenuItem>
                                </TextField>
                            </Stack>
                        </Box>
                    </Fade>
                );
            case 1:
                return (
                    <Fade in timeout={500}>
                        <Box>
                            <Stack spacing={3}>
                                <TextField 
                                    id="create-user-full-name"
                                    label="Full Name" 
                                    value={formData.personalInfo.fullName} 
                                    onChange={(e) => handleChange('personalInfo.fullName', e.target.value)} 
                                    fullWidth
                                    placeholder="John Michael Doe"
                                    helperText="Will be auto-split into first, middle, and last name"
                                />
                                
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField 
                                            id="create-user-first-name"
                                            label="First Name" 
                                            value={formData.personalInfo.firstName} 
                                            onChange={(e) => handleChange('personalInfo.firstName', e.target.value)} 
                                            fullWidth
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField 
                                            id="create-user-middle-name"
                                            label="Middle Name" 
                                            value={formData.personalInfo.medName} 
                                            onChange={(e) => handleChange('personalInfo.medName', e.target.value)} 
                                            fullWidth
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <TextField 
                                            id="create-user-last-name"
                                            label="Last Name" 
                                            value={formData.personalInfo.lastName} 
                                            onChange={(e) => handleChange('personalInfo.lastName', e.target.value)} 
                                            fullWidth
                                            size="small"
                                        />
                                    </Grid>
                                </Grid>

                                <TextField 
                                    id="create-user-arabic-name"
                                    label="Arabic Name" 
                                    value={formData.personalInfo.arabicName} 
                                    onChange={(e) => handleChange('personalInfo.arabicName', e.target.value)} 
                                    fullWidth
                                    placeholder="الاسم بالعربية"
                                />

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField 
                                            id="create-user-national-id"
                                            label="National ID" 
                                            value={formData.personalInfo.nationalId} 
                                            onChange={(e) => handleChange('personalInfo.nationalId', e.target.value)} 
                                            fullWidth
                                            placeholder="14 digits"
                                            helperText="Birth date will be auto-extracted"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <BadgeIcon color="action" />
                                                    </InputAdornment>
                                                )
                                            }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField 
                                            id="create-user-date-of-birth"
                                            label="Date of Birth" 
                                            type="date" 
                                            value={formData.personalInfo.dateOfBirth} 
                                            onChange={(e) => handleChange('personalInfo.dateOfBirth', e.target.value)} 
                                            fullWidth
                                            InputLabelProps={{ shrink: true }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <CalendarIcon color="action" />
                                                    </InputAdornment>
                                                )
                                            }}
                                        />
                                    </Grid>
                                </Grid>

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField 
                                            id="create-user-gender"
                                            select 
                                            label="Gender" 
                                            value={formData.personalInfo.gender} 
                                            onChange={(e) => handleChange('personalInfo.gender', e.target.value)} 
                                            fullWidth
                                        >
                                            <MenuItem value="">Select Gender</MenuItem>
                                            <MenuItem value="Male">Male</MenuItem>
                                            <MenuItem value="Female">Female</MenuItem>
                                        </TextField>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField 
                                            id="create-user-marital-status"
                                            select 
                                            label="Marital Status" 
                                            value={formData.personalInfo.maritalStatus} 
                                            onChange={(e) => handleChange('personalInfo.maritalStatus', e.target.value)} 
                                            fullWidth
                                        >
                                            <MenuItem value="">Select Status</MenuItem>
                                            <MenuItem value="single">Single</MenuItem>
                                            <MenuItem value="married">Married</MenuItem>
                                            <MenuItem value="divorced">Divorced</MenuItem>
                                            <MenuItem value="widowed">Widowed</MenuItem>
                                        </TextField>
                                    </Grid>
                                </Grid>

                                <TextField 
                                    id="create-user-nationality"
                                    select 
                                    label="Nationality" 
                                    value={formData.personalInfo.nationality} 
                                    onChange={(e) => handleChange('personalInfo.nationality', e.target.value)} 
                                    fullWidth
                                >
                                    <MenuItem value="">Select Nationality</MenuItem>
                                    <MenuItem value="Egyptian">Egyptian</MenuItem>
                                    <MenuItem value="Saudi">Saudi</MenuItem>
                                    <MenuItem value="Emirati">Emirati</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                </TextField>

                                <TextField 
                                    id="create-user-phone"
                                    label="Phone Number" 
                                    value={formData.personalInfo.phone} 
                                    onChange={(e) => handleChange('personalInfo.phone', e.target.value)} 
                                    fullWidth
                                    placeholder="+20 123 456 7890"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PhoneIcon color="action" />
                                            </InputAdornment>
                                        )
                                    }}
                                />

                                <TextField 
                                    id="create-user-address"
                                    label="Address" 
                                    value={formData.personalInfo.address} 
                                    onChange={(e) => handleChange('personalInfo.address', e.target.value)} 
                                    fullWidth
                                    multiline
                                    rows={2}
                                    placeholder="Full address"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                                                <LocationIcon color="action" />
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            </Stack>
                        </Box>
                    </Fade>
                );
            case 2:
                return (
                    <Fade in timeout={500}>
                        <Box>
                            <Stack spacing={3}>
                                <TextField 
                                    id="create-user-main-department"
                                    select 
                                    label="Main Department" 
                                    value={formData.department} 
                                    onChange={(e) => {
                                        handleChange('department', e.target.value);
                                        // Reset sub-department when main department changes
                                        handleChange('subDepartment', '');
                                    }} 
                                    fullWidth
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <BusinessIcon color="action" />
                                            </InputAdornment>
                                        )
                                    }}
                                >
                                    <MenuItem value="">Select Main Department</MenuItem>
                                    {(Array.isArray(departments) ? departments : []).filter(dept => !dept.parentDepartment).map((dept) => (
                                        <MenuItem 
                                            key={dept._id} 
                                            value={dept._id}
                                        >
                                            {dept.name}
                                            {dept.code ? ` (${dept.code})` : ''}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                {/* Sub-Department Dropdown - Only show if main department is selected */}
                                {formData.department && (Array.isArray(departments) ? departments : []).filter(dept => 
                                    dept.parentDepartment && 
                                    (typeof dept.parentDepartment === 'object' ? dept.parentDepartment._id : dept.parentDepartment) === formData.department
                                ).length > 0 && (
                                    <TextField
                                        id="create-user-sub-department"
                                        select
                                        label="Sub-Department (Optional)"
                                        value={formData.subDepartment || ''}
                                        onChange={(e) => handleChange('subDepartment', e.target.value)}
                                        fullWidth
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <BusinessIcon color="action" />
                                                </InputAdornment>
                                            )
                                        }}
                                    >
                                        <MenuItem value="">None - Use Main Department Only</MenuItem>
                                        {(Array.isArray(departments) ? departments : [])
                                            .filter(dept => 
                                                dept.parentDepartment && 
                                                (typeof dept.parentDepartment === 'object' ? dept.parentDepartment._id : dept.parentDepartment) === formData.department
                                            )
                                            .map((dept) => (
                                                <MenuItem 
                                                    key={dept._id} 
                                                    value={dept._id}
                                                >
                                                    {dept.name}
                                                    {dept.code ? ` (${dept.code})` : ''}
                                                </MenuItem>
                                            ))
                                        }
                                    </TextField>
                                )}

                                <TextField 
                                    id="create-user-position"
                                    select 
                                    label="Position" 
                                    value={formData.position} 
                                    onChange={(e) => handleChange('position', e.target.value)} 
                                    fullWidth
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <WorkIcon color="action" />
                                            </InputAdornment>
                                        )
                                    }}
                                >
                                    <MenuItem value="">Select Position</MenuItem>
                                    {(Array.isArray(positions) ? positions : []).map((pos) => (
                                        <MenuItem key={pos._id} value={pos._id}>{pos.title}</MenuItem>
                                    ))}
                                </TextField>

                                <TextField 
                                    id="create-user-hire-date"
                                    label="Hire Date" 
                                    type="date" 
                                    value={formData.employment.hireDate} 
                                    onChange={(e) => handleChange('employment.hireDate', e.target.value)} 
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <CalendarIcon color="action" />
                                            </InputAdornment>
                                        )
                                    }}
                                />

                                <TextField 
                                    id="create-user-contract-type"
                                    select 
                                    label="Contract Type" 
                                    value={formData.employment.contractType} 
                                    onChange={(e) => handleChange('employment.contractType', e.target.value)} 
                                    fullWidth
                                >
                                    <MenuItem value="">Select Type</MenuItem>
                                    <MenuItem value="full-time">Full Time</MenuItem>
                                    <MenuItem value="part-time">Part Time</MenuItem>
                                    <MenuItem value="contract">Contract</MenuItem>
                                    <MenuItem value="probation">Probation</MenuItem>
                                </TextField>

                                <TextField 
                                    id="create-user-employment-status"
                                    select 
                                    label="Employment Status" 
                                    value={formData.employment.employmentStatus} 
                                    onChange={(e) => handleChange('employment.employmentStatus', e.target.value)} 
                                    fullWidth
                                >
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="on-leave">On Leave</MenuItem>
                                    <MenuItem value="terminated">Terminated</MenuItem>
                                    <MenuItem value="resigned">Resigned</MenuItem>
                                </TextField>

                                {/* Summary Card */}
                                <Card sx={{ mt: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05) }}>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                                            Summary
                                        </Typography>
                                        <Stack spacing={1}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="text.secondary">Username:</Typography>
                                                <Typography variant="body2" fontWeight={600}>{formData.username || '-'}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="text.secondary">Email:</Typography>
                                                <Typography variant="body2" fontWeight={600}>{formData.email || '-'}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="text.secondary">Full Name:</Typography>
                                                <Typography variant="body2" fontWeight={600}>{formData.personalInfo.fullName || '-'}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="text.secondary">Role:</Typography>
                                                <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>{formData.role}</Typography>
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Stack>
                        </Box>
                    </Fade>
                );
            default:
                return null;
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
            {/* Header */}
            <Box sx={{ 
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                pt: 3,
                pb: 6
            }}>
                <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton 
                            onClick={() => navigate(getCompanyRoute('/users'))} 
                            sx={{ 
                                color: 'white',
                                bgcolor: 'rgba(255,255,255,0.1)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Create New User
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Follow the steps to add a new employee
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Form Container */}
            <Box sx={{ 
                maxWidth: 900, 
                mx: 'auto', 
                px: { xs: 2, sm: 3, md: 4 },
                mt: -3
            }}>
                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 4, 
                        borderRadius: 3
                    }}
                >
                    {/* Stepper */}
                    <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                        {steps.map((label, index) => (
                            <Step key={label}>
                                <StepLabel
                                    StepIconProps={{
                                        sx: {
                                            '&.Mui-completed': {
                                                color: 'success.main',
                                            },
                                            '&.Mui-active': {
                                                color: 'primary.main',
                                            }
                                        }
                                    }}
                                >
                                    {label}
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {/* Form Content */}
                    <form onSubmit={handleSubmit}>
                        <Box sx={{ minHeight: 400 }}>
                            {renderStepContent(activeStep)}
                        </Box>

                        {/* Navigation Buttons */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Button
                                disabled={activeStep === 0}
                                onClick={handleBack}
                                startIcon={<BackIcon />}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Back
                            </Button>
                            
                            {activeStep === steps.length - 1 ? (
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    startIcon={<CheckIcon />}
                                    sx={{ 
                                        textTransform: 'none', 
                                        fontWeight: 600,
                                        px: 4
                                    }}
                                >
                                    Create User
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    onClick={handleNext}
                                    endIcon={<NextIcon />}
                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                >
                                    Next
                                </Button>
                            )}
                        </Box>
                    </form>
                </Paper>
            </Box>
        </Box>
    );
};

export default CreateUserPage;

