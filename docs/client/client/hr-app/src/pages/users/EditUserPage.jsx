import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Stack,
    MenuItem,
    Avatar
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    Person as PersonIcon,
    Work as WorkIcon,
    AdminPanelSettings as AdminIcon,
    CameraAlt as CameraIcon
} from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import userService from '../../services/user.service';
import departmentService from '../../services/department.service';
import positionService from '../../services/position.service';
import { useNotification } from '../../context/NotificationContext';

const EditUserPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [profilePicture, setProfilePicture] = useState(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState('');
    
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        role: 'user',
        employeeId: '',
        department: '',
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
            maritalStatus: '',
            profilePicture: ''
        },
        employment: {
            hireDate: '',
            contractType: '',
            employmentStatus: 'active'
        }
    });

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Fetch user data
            const response = await userService.getById(id);

            const userData = response.data || response;

            // Fetch departments and positions
            let deptData = [];
            let posData = [];
            
            try {
                deptData = await departmentService.getAll();

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
                
                deptData = sortedDepts;
            } catch (err) {

            }
            
            try {
                posData = await positionService.getAll();

            } catch (err) {

            }
            
            setDepartments(deptData);
            setPositions(posData);
            
            // Set profile picture preview if exists
            if (userData.personalInfo?.profilePicture) {
                setProfilePicturePreview(userData.personalInfo.profilePicture);
            }
            
            // Determine if the selected department is a main or sub-department
            let mainDept = '';
            let subDept = '';
            if (userData.department?._id) {
                const userDept = deptData.find(d => d._id === userData.department._id);
                if (userDept) {
                    if (userDept.parentDepartment) {
                        // User is assigned to a sub-department
                        subDept = userDept._id;
                        mainDept = typeof userDept.parentDepartment === 'object' ? userDept.parentDepartment._id : userDept.parentDepartment;
                    } else {
                        // User is assigned to a main department
                        mainDept = userDept._id;
                    }
                }
            }
            
            setFormData({
                username: userData.username || '',
                email: userData.email || '',
                role: userData.role || 'user',
                employeeId: userData.employeeId || '',
                department: mainDept,
                subDepartment: subDept,
                position: userData.position?._id || '',
                personalInfo: {
                    fullName: userData.personalInfo?.fullName || '',
                    firstName: userData.personalInfo?.firstName || '',
                    medName: userData.personalInfo?.medName || '',
                    lastName: userData.personalInfo?.lastName || '',
                    arabicName: userData.personalInfo?.arabicName || '',
                    dateOfBirth: userData.personalInfo?.dateOfBirth ? userData.personalInfo.dateOfBirth.split('T')[0] : '',
                    gender: userData.personalInfo?.gender || '',
                    nationality: userData.personalInfo?.nationality || '',
                    nationalId: userData.personalInfo?.nationalId || '',
                    phone: userData.personalInfo?.phone || '',
                    address: userData.personalInfo?.address || '',
                    maritalStatus: userData.personalInfo?.maritalStatus || '',
                    profilePicture: userData.personalInfo?.profilePicture || ''
                },
                employment: {
                    hireDate: userData.employment?.hireDate ? userData.employment.hireDate.split('T')[0] : '',
                    contractType: userData.employment?.contractType || '',
                    employmentStatus: userData.employment?.employmentStatus || 'active'
                }
            });
        } catch (error) {

            showNotification(error.response?.data?.message || 'Failed to fetch user data', 'error');
            navigate('/app/users');
        } finally {
            setLoading(false);
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
            
            // Special handling for fullName - auto-split into first, middle, last
            if (field === 'personalInfo.fullName') {
                const nameParts = value.trim().split(/\s+/);
                const updates = {
                    fullName: value
                };
                
                if (nameParts.length === 1) {
                    // Only one name - treat as first name
                    updates.firstName = nameParts[0];
                    updates.medName = '';
                    updates.lastName = '';
                } else if (nameParts.length === 2) {
                    // Two names - first and last
                    updates.firstName = nameParts[0];
                    updates.medName = '';
                    updates.lastName = nameParts[1];
                } else if (nameParts.length >= 3) {
                    // Three or more names - first, middle(s), last
                    updates.firstName = nameParts[0];
                    updates.medName = nameParts.slice(1, -1).join(' ');
                    updates.lastName = nameParts[nameParts.length - 1];
                }
                
                setFormData(prev => ({
                    ...prev,
                    [parent]: {
                        ...prev[parent],
                        ...updates
                    }
                }));
            }
            // Special handling for nationalId - auto-extract birth date
            else if (field === 'personalInfo.nationalId') {
                const updates = {
                    nationalId: value
                };
                
                // If NID is 14 digits, extract birth date
                if (value.length === 14) {
                    const birthDate = getBirthDateFromNID(value);
                    if (birthDate) {
                        updates.dateOfBirth = birthDate;
                        showNotification('Birth date extracted from National ID', 'success');
                    }
                }
                
                setFormData(prev => ({
                    ...prev,
                    [parent]: {
                        ...prev[parent],
                        ...updates
                    }
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    [parent]: {
                        ...prev[parent],
                        [child]: value
                    }
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleProfilePictureChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showNotification('Please select an image file', 'error');
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Image size should be less than 5MB', 'error');
                return;
            }
            
            setProfilePicture(file);
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicturePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            
            // If there's a new profile picture, include it in the update
            if (profilePicturePreview && profilePicturePreview !== formData.personalInfo.profilePicture) {
                formData.personalInfo.profilePicture = profilePicturePreview;
            }
            
            // Prepare data for submission
            const submitData = {
                ...formData,
                // Use sub-department if selected, otherwise use main department
                department: formData.subDepartment || formData.department
            };
            
            // Remove subDepartment field as it's not part of the user model
            delete submitData.subDepartment;
            
            await userService.update(id, submitData);
            showNotification('User updated successfully', 'success');
            navigate(`/app/users/${id}`);
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to update user', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, sm: 3, md: 4 } }}>
            {/* Header */}
            <Paper 
                elevation={0} 
                sx={{ 
                    p: 3, 
                    mb: 3, 
                    borderRadius: 3, 
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: 'white'
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate(`/app/users/${id}`)}
                            sx={{ 
                                textTransform: 'none', 
                                fontWeight: 600,
                                color: 'white',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                            }}
                        >
                            Back
                        </Button>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                Edit User Profile
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Update user information
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            <form onSubmit={handleSubmit}>
                <Stack spacing={3}>
                    {/* Profile Picture */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                            Profile Picture
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Avatar
                                src={profilePicturePreview}
                                sx={{
                                    width: 120,
                                    height: 120,
                                    fontSize: '3rem',
                                    fontWeight: 700,
                                    bgcolor: 'primary.main'
                                }}
                            >
                                {formData.username?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                                <input
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    id="profile-picture-upload"
                                    type="file"
                                    onChange={handleProfilePictureChange}
                                />
                                <label htmlFor="profile-picture-upload">
                                    <Button
                                        variant="outlined"
                                        component="span"
                                        startIcon={<CameraIcon />}
                                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                                    >
                                        Change Picture
                                    </Button>
                                </label>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                    Allowed: JPG, PNG, GIF (Max 5MB)
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>

                    {/* Account Information */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AdminIcon color="error" />
                            Account Information
                        </Typography>
                        <Stack spacing={2.5}>
                            <TextField
                                label="Username"
                                value={formData.username}
                                onChange={(e) => handleChange('username', e.target.value)}
                                fullWidth
                                required
                            />
                            <TextField
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                fullWidth
                                required
                            />
                            <TextField
                                label="Employee ID"
                                value={formData.employeeId}
                                fullWidth
                                disabled
                                helperText="Auto-generated and cannot be changed"
                            />
                            <TextField
                                label="Role"
                                select
                                value={formData.role}
                                onChange={(e) => handleChange('role', e.target.value)}
                                fullWidth
                                required
                            >
                                <MenuItem value="employee">Employee</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                                <MenuItem value="hr">HR</MenuItem>
                                <MenuItem value="manager">Manager</MenuItem>
                                <MenuItem value="id-card-admin">ID Card Admin</MenuItem>
                                <MenuItem value="supervisor">Supervisor</MenuItem>
                                <MenuItem value="head-of-department">Head of Department</MenuItem>
                                <MenuItem value="dean">Dean</MenuItem>
                                <MenuItem value="doctor">Doctor</MenuItem>
                            </TextField>
                        </Stack>
                    </Paper>

                    {/* Personal Information */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon color="primary" />
                            Personal Information
                        </Typography>
                        <Stack spacing={2.5}>
                            <TextField
                                label="Full Name"
                                value={formData.personalInfo.fullName}
                                onChange={(e) => handleChange('personalInfo.fullName', e.target.value)}
                                fullWidth
                                helperText="Complete name as it appears on official documents"
                            />
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    label="First Name"
                                    value={formData.personalInfo.firstName}
                                    onChange={(e) => handleChange('personalInfo.firstName', e.target.value)}
                                    fullWidth
                                />
                                <TextField
                                    label="Middle Name"
                                    value={formData.personalInfo.medName}
                                    onChange={(e) => handleChange('personalInfo.medName', e.target.value)}
                                    fullWidth
                                />
                                <TextField
                                    label="Last Name"
                                    value={formData.personalInfo.lastName}
                                    onChange={(e) => handleChange('personalInfo.lastName', e.target.value)}
                                    fullWidth
                                />
                            </Box>
                            <TextField
                                label="Arabic Name"
                                value={formData.personalInfo.arabicName}
                                onChange={(e) => handleChange('personalInfo.arabicName', e.target.value)}
                                fullWidth
                                helperText="Name in Arabic (optional)"
                            />
                            <TextField
                                label="Date of Birth"
                                type="date"
                                value={formData.personalInfo.dateOfBirth}
                                onChange={(e) => handleChange('personalInfo.dateOfBirth', e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Gender"
                                select
                                value={formData.personalInfo.gender}
                                onChange={(e) => handleChange('personalInfo.gender', e.target.value)}
                                fullWidth
                            >
                                <MenuItem value="">Select Gender</MenuItem>
                                <MenuItem value="Male">Male</MenuItem>
                                <MenuItem value="Female">Female</MenuItem>
                                <MenuItem value="Other">Other</MenuItem>
                            </TextField>
                            <TextField
                                label="Nationality"
                                select
                                value={formData.personalInfo.nationality}
                                onChange={(e) => handleChange('personalInfo.nationality', e.target.value)}
                                fullWidth
                            >
                                <MenuItem value="">Select Nationality</MenuItem>
                                <MenuItem value="Afghan">Afghan</MenuItem>
                                <MenuItem value="Albanian">Albanian</MenuItem>
                                <MenuItem value="Algerian">Algerian</MenuItem>
                                <MenuItem value="American">American</MenuItem>
                                <MenuItem value="Andorran">Andorran</MenuItem>
                                <MenuItem value="Angolan">Angolan</MenuItem>
                                <MenuItem value="Argentine">Argentine</MenuItem>
                                <MenuItem value="Armenian">Armenian</MenuItem>
                                <MenuItem value="Australian">Australian</MenuItem>
                                <MenuItem value="Austrian">Austrian</MenuItem>
                                <MenuItem value="Azerbaijani">Azerbaijani</MenuItem>
                                <MenuItem value="Bahamian">Bahamian</MenuItem>
                                <MenuItem value="Bahraini">Bahraini</MenuItem>
                                <MenuItem value="Bangladeshi">Bangladeshi</MenuItem>
                                <MenuItem value="Barbadian">Barbadian</MenuItem>
                                <MenuItem value="Belarusian">Belarusian</MenuItem>
                                <MenuItem value="Belgian">Belgian</MenuItem>
                                <MenuItem value="Belizean">Belizean</MenuItem>
                                <MenuItem value="Beninese">Beninese</MenuItem>
                                <MenuItem value="Bhutanese">Bhutanese</MenuItem>
                                <MenuItem value="Bolivian">Bolivian</MenuItem>
                                <MenuItem value="Bosnian">Bosnian</MenuItem>
                                <MenuItem value="Brazilian">Brazilian</MenuItem>
                                <MenuItem value="British">British</MenuItem>
                                <MenuItem value="Bruneian">Bruneian</MenuItem>
                                <MenuItem value="Bulgarian">Bulgarian</MenuItem>
                                <MenuItem value="Burkinabe">Burkinabe</MenuItem>
                                <MenuItem value="Burmese">Burmese</MenuItem>
                                <MenuItem value="Burundian">Burundian</MenuItem>
                                <MenuItem value="Cambodian">Cambodian</MenuItem>
                                <MenuItem value="Cameroonian">Cameroonian</MenuItem>
                                <MenuItem value="Canadian">Canadian</MenuItem>
                                <MenuItem value="Cape Verdean">Cape Verdean</MenuItem>
                                <MenuItem value="Central African">Central African</MenuItem>
                                <MenuItem value="Chadian">Chadian</MenuItem>
                                <MenuItem value="Chilean">Chilean</MenuItem>
                                <MenuItem value="Chinese">Chinese</MenuItem>
                                <MenuItem value="Colombian">Colombian</MenuItem>
                                <MenuItem value="Comoran">Comoran</MenuItem>
                                <MenuItem value="Congolese">Congolese</MenuItem>
                                <MenuItem value="Costa Rican">Costa Rican</MenuItem>
                                <MenuItem value="Croatian">Croatian</MenuItem>
                                <MenuItem value="Cuban">Cuban</MenuItem>
                                <MenuItem value="Cypriot">Cypriot</MenuItem>
                                <MenuItem value="Czech">Czech</MenuItem>
                                <MenuItem value="Danish">Danish</MenuItem>
                                <MenuItem value="Djiboutian">Djiboutian</MenuItem>
                                <MenuItem value="Dominican">Dominican</MenuItem>
                                <MenuItem value="Dutch">Dutch</MenuItem>
                                <MenuItem value="East Timorese">East Timorese</MenuItem>
                                <MenuItem value="Ecuadorean">Ecuadorean</MenuItem>
                                <MenuItem value="Egyptian">Egyptian</MenuItem>
                                <MenuItem value="Emirati">Emirati</MenuItem>
                                <MenuItem value="Equatorial Guinean">Equatorial Guinean</MenuItem>
                                <MenuItem value="Eritrean">Eritrean</MenuItem>
                                <MenuItem value="Estonian">Estonian</MenuItem>
                                <MenuItem value="Ethiopian">Ethiopian</MenuItem>
                                <MenuItem value="Fijian">Fijian</MenuItem>
                                <MenuItem value="Filipino">Filipino</MenuItem>
                                <MenuItem value="Finnish">Finnish</MenuItem>
                                <MenuItem value="French">French</MenuItem>
                                <MenuItem value="Gabonese">Gabonese</MenuItem>
                                <MenuItem value="Gambian">Gambian</MenuItem>
                                <MenuItem value="Georgian">Georgian</MenuItem>
                                <MenuItem value="German">German</MenuItem>
                                <MenuItem value="Ghanaian">Ghanaian</MenuItem>
                                <MenuItem value="Greek">Greek</MenuItem>
                                <MenuItem value="Grenadian">Grenadian</MenuItem>
                                <MenuItem value="Guatemalan">Guatemalan</MenuItem>
                                <MenuItem value="Guinean">Guinean</MenuItem>
                                <MenuItem value="Guyanese">Guyanese</MenuItem>
                                <MenuItem value="Haitian">Haitian</MenuItem>
                                <MenuItem value="Honduran">Honduran</MenuItem>
                                <MenuItem value="Hungarian">Hungarian</MenuItem>
                                <MenuItem value="Icelandic">Icelandic</MenuItem>
                                <MenuItem value="Indian">Indian</MenuItem>
                                <MenuItem value="Indonesian">Indonesian</MenuItem>
                                <MenuItem value="Iranian">Iranian</MenuItem>
                                <MenuItem value="Iraqi">Iraqi</MenuItem>
                                <MenuItem value="Irish">Irish</MenuItem>
                                <MenuItem value="Israeli">Israeli</MenuItem>
                                <MenuItem value="Italian">Italian</MenuItem>
                                <MenuItem value="Ivorian">Ivorian</MenuItem>
                                <MenuItem value="Jamaican">Jamaican</MenuItem>
                                <MenuItem value="Japanese">Japanese</MenuItem>
                                <MenuItem value="Jordanian">Jordanian</MenuItem>
                                <MenuItem value="Kazakh">Kazakh</MenuItem>
                                <MenuItem value="Kenyan">Kenyan</MenuItem>
                                <MenuItem value="Kuwaiti">Kuwaiti</MenuItem>
                                <MenuItem value="Kyrgyz">Kyrgyz</MenuItem>
                                <MenuItem value="Laotian">Laotian</MenuItem>
                                <MenuItem value="Latvian">Latvian</MenuItem>
                                <MenuItem value="Lebanese">Lebanese</MenuItem>
                                <MenuItem value="Liberian">Liberian</MenuItem>
                                <MenuItem value="Libyan">Libyan</MenuItem>
                                <MenuItem value="Liechtensteiner">Liechtensteiner</MenuItem>
                                <MenuItem value="Lithuanian">Lithuanian</MenuItem>
                                <MenuItem value="Luxembourger">Luxembourger</MenuItem>
                                <MenuItem value="Macedonian">Macedonian</MenuItem>
                                <MenuItem value="Malagasy">Malagasy</MenuItem>
                                <MenuItem value="Malawian">Malawian</MenuItem>
                                <MenuItem value="Malaysian">Malaysian</MenuItem>
                                <MenuItem value="Maldivian">Maldivian</MenuItem>
                                <MenuItem value="Malian">Malian</MenuItem>
                                <MenuItem value="Maltese">Maltese</MenuItem>
                                <MenuItem value="Mauritanian">Mauritanian</MenuItem>
                                <MenuItem value="Mauritian">Mauritian</MenuItem>
                                <MenuItem value="Mexican">Mexican</MenuItem>
                                <MenuItem value="Moldovan">Moldovan</MenuItem>
                                <MenuItem value="Monacan">Monacan</MenuItem>
                                <MenuItem value="Mongolian">Mongolian</MenuItem>
                                <MenuItem value="Montenegrin">Montenegrin</MenuItem>
                                <MenuItem value="Moroccan">Moroccan</MenuItem>
                                <MenuItem value="Mozambican">Mozambican</MenuItem>
                                <MenuItem value="Namibian">Namibian</MenuItem>
                                <MenuItem value="Nepalese">Nepalese</MenuItem>
                                <MenuItem value="New Zealander">New Zealander</MenuItem>
                                <MenuItem value="Nicaraguan">Nicaraguan</MenuItem>
                                <MenuItem value="Nigerian">Nigerian</MenuItem>
                                <MenuItem value="Nigerien">Nigerien</MenuItem>
                                <MenuItem value="North Korean">North Korean</MenuItem>
                                <MenuItem value="Norwegian">Norwegian</MenuItem>
                                <MenuItem value="Omani">Omani</MenuItem>
                                <MenuItem value="Pakistani">Pakistani</MenuItem>
                                <MenuItem value="Panamanian">Panamanian</MenuItem>
                                <MenuItem value="Papua New Guinean">Papua New Guinean</MenuItem>
                                <MenuItem value="Paraguayan">Paraguayan</MenuItem>
                                <MenuItem value="Peruvian">Peruvian</MenuItem>
                                <MenuItem value="Polish">Polish</MenuItem>
                                <MenuItem value="Portuguese">Portuguese</MenuItem>
                                <MenuItem value="Qatari">Qatari</MenuItem>
                                <MenuItem value="Romanian">Romanian</MenuItem>
                                <MenuItem value="Russian">Russian</MenuItem>
                                <MenuItem value="Rwandan">Rwandan</MenuItem>
                                <MenuItem value="Saint Lucian">Saint Lucian</MenuItem>
                                <MenuItem value="Salvadoran">Salvadoran</MenuItem>
                                <MenuItem value="Samoan">Samoan</MenuItem>
                                <MenuItem value="Saudi">Saudi</MenuItem>
                                <MenuItem value="Senegalese">Senegalese</MenuItem>
                                <MenuItem value="Serbian">Serbian</MenuItem>
                                <MenuItem value="Seychellois">Seychellois</MenuItem>
                                <MenuItem value="Sierra Leonean">Sierra Leonean</MenuItem>
                                <MenuItem value="Singaporean">Singaporean</MenuItem>
                                <MenuItem value="Slovak">Slovak</MenuItem>
                                <MenuItem value="Slovenian">Slovenian</MenuItem>
                                <MenuItem value="Somali">Somali</MenuItem>
                                <MenuItem value="South African">South African</MenuItem>
                                <MenuItem value="South Korean">South Korean</MenuItem>
                                <MenuItem value="Spanish">Spanish</MenuItem>
                                <MenuItem value="Sri Lankan">Sri Lankan</MenuItem>
                                <MenuItem value="Sudanese">Sudanese</MenuItem>
                                <MenuItem value="Surinamese">Surinamese</MenuItem>
                                <MenuItem value="Swazi">Swazi</MenuItem>
                                <MenuItem value="Swedish">Swedish</MenuItem>
                                <MenuItem value="Swiss">Swiss</MenuItem>
                                <MenuItem value="Syrian">Syrian</MenuItem>
                                <MenuItem value="Taiwanese">Taiwanese</MenuItem>
                                <MenuItem value="Tajik">Tajik</MenuItem>
                                <MenuItem value="Tanzanian">Tanzanian</MenuItem>
                                <MenuItem value="Thai">Thai</MenuItem>
                                <MenuItem value="Togolese">Togolese</MenuItem>
                                <MenuItem value="Tongan">Tongan</MenuItem>
                                <MenuItem value="Trinidadian">Trinidadian</MenuItem>
                                <MenuItem value="Tunisian">Tunisian</MenuItem>
                                <MenuItem value="Turkish">Turkish</MenuItem>
                                <MenuItem value="Turkmen">Turkmen</MenuItem>
                                <MenuItem value="Ugandan">Ugandan</MenuItem>
                                <MenuItem value="Ukrainian">Ukrainian</MenuItem>
                                <MenuItem value="Uruguayan">Uruguayan</MenuItem>
                                <MenuItem value="Uzbek">Uzbek</MenuItem>
                                <MenuItem value="Venezuelan">Venezuelan</MenuItem>
                                <MenuItem value="Vietnamese">Vietnamese</MenuItem>
                                <MenuItem value="Yemeni">Yemeni</MenuItem>
                                <MenuItem value="Zambian">Zambian</MenuItem>
                                <MenuItem value="Zimbabwean">Zimbabwean</MenuItem>
                            </TextField>
                            <TextField
                                label="National ID"
                                value={formData.personalInfo.nationalId}
                                onChange={(e) => handleChange('personalInfo.nationalId', e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Marital Status"
                                select
                                value={formData.personalInfo.maritalStatus}
                                onChange={(e) => handleChange('personalInfo.maritalStatus', e.target.value)}
                                fullWidth
                            >
                                <MenuItem value="">Select Marital Status</MenuItem>
                                <MenuItem value="single">Single</MenuItem>
                                <MenuItem value="married">Married</MenuItem>
                                <MenuItem value="divorced">Divorced</MenuItem>
                                <MenuItem value="widowed">Widowed</MenuItem>
                            </TextField>
                            <TextField
                                label="Phone"
                                value={formData.personalInfo.phone}
                                onChange={(e) => handleChange('personalInfo.phone', e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Address"
                                value={formData.personalInfo.address}
                                onChange={(e) => handleChange('personalInfo.address', e.target.value)}
                                fullWidth
                                multiline
                                rows={2}
                            />
                        </Stack>
                    </Paper>

                    {/* Employment Information */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WorkIcon color="success" />
                            Employment Information
                        </Typography>
                        <Stack spacing={2.5}>
                            <TextField
                                label="Main Department"
                                select
                                value={formData.department}
                                onChange={(e) => {
                                    handleChange('department', e.target.value);
                                    // Reset sub-department when main department changes
                                    handleChange('subDepartment', '');
                                }}
                                fullWidth
                            >
                                <MenuItem value="">Select Main Department</MenuItem>
                                {departments.filter(dept => !dept.parentDepartment).map((dept) => (
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
                            {formData.department && departments.filter(dept => 
                                dept.parentDepartment && 
                                (typeof dept.parentDepartment === 'object' ? dept.parentDepartment._id : dept.parentDepartment) === formData.department
                            ).length > 0 && (
                                <TextField
                                    label="Sub-Department (Optional)"
                                    select
                                    value={formData.subDepartment || ''}
                                    onChange={(e) => handleChange('subDepartment', e.target.value)}
                                    fullWidth
                                >
                                    <MenuItem value="">None - Use Main Department Only</MenuItem>
                                    {departments
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
                                label="Position"
                                select
                                value={formData.position}
                                onChange={(e) => handleChange('position', e.target.value)}
                                fullWidth
                            >
                                <MenuItem value="">Select Position</MenuItem>
                                {positions.map((pos) => (
                                    <MenuItem key={pos._id} value={pos._id}>
                                        {pos.title}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label="Hire Date"
                                type="date"
                                value={formData.employment.hireDate}
                                onChange={(e) => handleChange('employment.hireDate', e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Contract Type"
                                select
                                value={formData.employment.contractType}
                                onChange={(e) => handleChange('employment.contractType', e.target.value)}
                                fullWidth
                            >
                                <MenuItem value="">Select Contract Type</MenuItem>
                                <MenuItem value="full-time">Full Time</MenuItem>
                                <MenuItem value="part-time">Part Time</MenuItem>
                                <MenuItem value="contract">Contract</MenuItem>
                                <MenuItem value="probation">Probation</MenuItem>
                            </TextField>
                            <TextField
                                label="Employment Status"
                                select
                                value={formData.employment.employmentStatus}
                                onChange={(e) => handleChange('employment.employmentStatus', e.target.value)}
                                fullWidth
                            >
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="on-leave">On Leave</MenuItem>
                                <MenuItem value="terminated">Terminated</MenuItem>
                                <MenuItem value="resigned">Resigned</MenuItem>
                            </TextField>
                        </Stack>
                    </Paper>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button
                            variant="outlined"
                            onClick={() => navigate(`/app/users/${id}`)}
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            startIcon={<SaveIcon />}
                            disabled={saving}
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </Box>
                </Stack>
            </form>
        </Box>
    );
};

export default EditUserPage;
