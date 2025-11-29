import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Avatar,
    Chip,
    Button,
    Stack
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Work as WorkIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    AdminPanelSettings as AdminIcon,
    History as HistoryIcon,
    Cake as CakeIcon,
    Wc as GenderIcon,
    Public as NationalityIcon,
    Badge as BadgeIcon,
    CalendarToday as CalendarIcon,
    Print as PrintIcon,
    Favorite as MaritalIcon
} from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import userService from '../../services/user.service';
import { useNotification } from '../../context/NotificationContext';
import { generateUserIDCard } from '../../components/users/UserIDCard';

const UserDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchUser = async () => {
        try {
            setLoading(true);
            console.log('Fetching user with ID:', id);
            const response = await userService.getById(id);
            console.log('Raw API response:', response);
            
            // Handle different response structures
            const userData = response.data || response;
            console.log('User data:', userData);
            
            setUser(userData);
        } catch (error) {
            console.error('Error fetching user:', error);
            showNotification(error.message || 'Failed to fetch user details', 'error');
            navigate('/app/users');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        console.log('Loading user data...');
        return <Loading />;
    }
    
    if (!user) {
        console.log('No user data available');
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography>No user data found</Typography>
                <Button onClick={() => navigate('/app/users')} sx={{ mt: 2 }}>
                    Back to Users
                </Button>
            </Box>
        );
    }
    
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, sm: 3, md: 4 } }}>
            {/* Header Banner */}
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
                            onClick={() => navigate('/app/users')}
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
                                {user.personalInfo?.fullName || user.username}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                ID: {user.employeeId || user._id}
                            </Typography>
                        </Box>
                    </Box>
                    <Stack direction="row" spacing={1.5}>
                        <Button
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={() => navigate(`/app/users/${id}/edit`)}
                            sx={{ 
                                textTransform: 'none', 
                                fontWeight: 600, 
                                borderRadius: 2,
                                bgcolor: 'white',
                                color: 'primary.main',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                            }}
                        >
                            Edit Profile
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<PrintIcon />}
                            onClick={async () => {
                                try {
                                    showNotification('Generating ID card...', 'info');
                                    const success = await generateUserIDCard(user);
                                    if (success) {
                                        showNotification('ID card generated successfully!', 'success');
                                    } else {
                                        showNotification('Failed to generate ID card', 'error');
                                    }
                                } catch (error) {
                                    console.error('Error generating ID card:', error);
                                    showNotification('Error generating ID card', 'error');
                                }
                            }}
                            sx={{ 
                                textTransform: 'none', 
                                fontWeight: 600, 
                                borderRadius: 2,
                                bgcolor: 'white',
                                color: 'primary.main',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                            }}
                        >
                            Print ID
                        </Button>
                    </Stack>
                </Box>
            </Paper>

            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                {/* Left Column - Profile Card */}
                <Box sx={{ flex: { xs: '1', md: '0 0 350px' } }}>
                    <Stack spacing={3}>
                        {/* Profile Card */}
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                            <Avatar
                                src={user.personalInfo?.profilePicture}
                                sx={{
                                    width: 120,
                                    height: 120,
                                    fontSize: '3rem',
                                    fontWeight: 700,
                                    bgcolor: user.role === 'admin' ? 'error.main' : 'success.main',
                                    mx: 'auto',
                                    mb: 2,
                                    boxShadow: 3,
                                    position: 'relative'
                                }}
                            >
                                {user.username?.charAt(0).toUpperCase()}
                                <Box 
                                    sx={{ 
                                        position: 'absolute', 
                                        bottom: 5, 
                                        right: 5, 
                                        width: 20, 
                                        height: 20, 
                                        borderRadius: '50%', 
                                        bgcolor: 'success.main',
                                        border: '3px solid',
                                        borderColor: 'background.paper'
                                    }} 
                                />
                            </Avatar>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {user.personalInfo?.fullName || user.username}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                @{user.username}
                            </Typography>
                            <Chip
                                label="Active"
                                color="success"
                                size="small"
                                sx={{ fontWeight: 600 }}
                            />
                        </Paper>

                        {/* Quick Stats Card */}
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box 
                                    sx={{ 
                                        display: 'flex',
                                        '@keyframes rotate': {
                                            '0%': { transform: 'rotate(0deg)' },
                                            '100%': { transform: 'rotate(360deg)' }
                                        },
                                        animation: 'rotate 2s linear infinite'
                                    }}
                                >
                                    <HistoryIcon fontSize="small" />
                                </Box>
                                Quick Stats
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                <Box 
                                    sx={{ 
                                        flex: '1 1 calc(50% - 8px)', 
                                        minWidth: 120, 
                                        textAlign: 'center', 
                                        p: 2, 
                                        bgcolor: 'primary.main', 
                                        color: 'white', 
                                        borderRadius: 2,
                                        transition: 'transform 0.3s ease',
                                        '&:hover': { transform: 'scale(1.05)' }
                                    }}
                                >
                                    <CakeIcon sx={{ mb: 1 }} />
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        {user.personalInfo?.dateOfBirth ? 
                                            Math.floor((new Date() - new Date(user.personalInfo.dateOfBirth)) / 31557600000) : 
                                            'N/A'}
                                    </Typography>
                                    <Typography variant="caption">Age</Typography>
                                </Box>
                                <Box 
                                    sx={{ 
                                        flex: '1 1 calc(50% - 8px)', 
                                        minWidth: 120, 
                                        textAlign: 'center', 
                                        p: 2, 
                                        bgcolor: 'success.main', 
                                        color: 'white', 
                                        borderRadius: 2,
                                        transition: 'transform 0.3s ease',
                                        '&:hover': { transform: 'scale(1.05)' }
                                    }}
                                >
                                    <WorkIcon sx={{ mb: 1 }} />
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        {user.employment?.hireDate ? 
                                            Math.floor((new Date() - new Date(user.employment.hireDate)) / 31557600000) : 
                                            'N/A'}
                                    </Typography>
                                    <Typography variant="caption">Years</Typography>
                                </Box>
                                <Box 
                                    sx={{ 
                                        flex: '1 1 calc(50% - 8px)', 
                                        minWidth: 120, 
                                        textAlign: 'center', 
                                        p: 2, 
                                        bgcolor: 'info.main', 
                                        color: 'white', 
                                        borderRadius: 2,
                                        transition: 'transform 0.3s ease',
                                        '&:hover': { transform: 'scale(1.05)' }
                                    }}
                                >
                                    <PersonIcon sx={{ mb: 1 }} />
                                    <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                                        {user.role || 'N/A'}
                                    </Typography>
                                    <Typography variant="caption">Role</Typography>
                                </Box>
                                <Box 
                                    sx={{ 
                                        flex: '1 1 calc(50% - 8px)', 
                                        minWidth: 120, 
                                        textAlign: 'center', 
                                        p: 2, 
                                        bgcolor: 'warning.main', 
                                        color: 'white', 
                                        borderRadius: 2,
                                        transition: 'transform 0.3s ease',
                                        '&:hover': { transform: 'scale(1.05)' }
                                    }}
                                >
                                    <BusinessIcon sx={{ mb: 1 }} />
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {user.employment?.contractType || 'N/A'}
                                    </Typography>
                                    <Typography variant="caption">Job Type</Typography>
                                </Box>
                            </Box>
                        </Paper>
                    </Stack>
                </Box>

                {/* Right Column - Details */}
                <Box sx={{ flex: 1 }}>
                    <Stack spacing={3}>
                        {/* Personal Information Card */}
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 3, 
                                borderRadius: 3, 
                                border: '1px solid', 
                                borderColor: 'divider'
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box 
                                    sx={{ 
                                        display: 'flex',
                                        '@keyframes pulse': {
                                            '0%, 100%': { transform: 'scale(1)' },
                                            '50%': { transform: 'scale(1.2)' }
                                        },
                                        animation: 'pulse 2s ease-in-out infinite'
                                    }}
                                >
                                    <PersonIcon color="primary" />
                                </Box>
                                Personal Information
                            </Typography>
                            <Stack spacing={2.5}>
                                <DetailRow 
                                    icon={<PersonIcon />} 
                                    label="FULL NAME" 
                                    value={user.personalInfo?.fullName || 'Not provided'} 
                                />
                                {user.personalInfo?.arabicName && (
                                    <DetailRow 
                                        icon={<PersonIcon />} 
                                        label="ARABIC NAME" 
                                        value={user.personalInfo.arabicName} 
                                    />
                                )}
                                <DetailRow 
                                    icon={<CakeIcon />} 
                                    label="BIRTHDAY" 
                                    value={user.personalInfo?.dateOfBirth ? new Date(user.personalInfo.dateOfBirth).toLocaleDateString() : 'Not provided'} 
                                />
                                <DetailRow 
                                    icon={<GenderIcon />} 
                                    label="GENDER" 
                                    value={user.personalInfo?.gender || 'Not provided'} 
                                />
                                <DetailRow 
                                    icon={<NationalityIcon />} 
                                    label="NATIONALITY" 
                                    value={user.personalInfo?.nationality || 'Not provided'} 
                                />
                                <DetailRow 
                                    icon={<BadgeIcon />} 
                                    label="NATIONAL ID" 
                                    value={user.personalInfo?.nationalId || 'Not provided'} 
                                />
                                {user.personalInfo?.maritalStatus && (
                                    <DetailRow 
                                        icon={<MaritalIcon />} 
                                        label="MARITAL STATUS" 
                                        value={user.personalInfo.maritalStatus.charAt(0).toUpperCase() + user.personalInfo.maritalStatus.slice(1)} 
                                    />
                                )}
                            </Stack>
                        </Paper>

                        {/* Contact Information Card */}
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 3, 
                                borderRadius: 3, 
                                border: '1px solid', 
                                borderColor: 'divider'
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box 
                                    sx={{ 
                                        display: 'flex',
                                        '@keyframes bounce': {
                                            '0%, 100%': { transform: 'translateY(0)' },
                                            '50%': { transform: 'translateY(-8px)' }
                                        },
                                        animation: 'bounce 1.5s ease-in-out infinite'
                                    }}
                                >
                                    <EmailIcon color="info" />
                                </Box>
                                Contact Information
                            </Typography>
                            <Stack spacing={2.5}>
                                <DetailRow 
                                    icon={<EmailIcon />} 
                                    label="EMAIL" 
                                    value={user.email || 'Not provided'} 
                                />
                                <DetailRow 
                                    icon={<PhoneIcon />} 
                                    label="PHONE" 
                                    value={user.personalInfo?.phone || 'Not provided'} 
                                />
                                {user.personalInfo?.address && (
                                    <DetailRow 
                                        icon={<BusinessIcon />} 
                                        label="ADDRESS" 
                                        value={user.personalInfo.address} 
                                    />
                                )}
                            </Stack>
                        </Paper>

                        {/* Employment Information Card */}
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 3, 
                                borderRadius: 3, 
                                border: '1px solid', 
                                borderColor: 'divider'
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box 
                                    sx={{ 
                                        display: 'flex',
                                        '@keyframes swing': {
                                            '0%, 100%': { transform: 'rotate(0deg)' },
                                            '25%': { transform: 'rotate(-15deg)' },
                                            '75%': { transform: 'rotate(15deg)' }
                                        },
                                        animation: 'swing 2s ease-in-out infinite'
                                    }}
                                >
                                    <WorkIcon color="success" />
                                </Box>
                                Employment Information
                            </Typography>
                            <Stack spacing={2.5}>
                                {user.employment?.hireDate && (
                                    <DetailRow icon={<CalendarIcon />} label="HIRE DATE" value={new Date(user.employment.hireDate).toLocaleDateString()} />
                                )}
                                {user.department?.name && (
                                    <>
                                        {user.department.parentDepartment ? (
                                            // User is in a sub-department, show both main and sub
                                            <>
                                                <DetailRow 
                                                    icon={<BusinessIcon />} 
                                                    label="MAIN DEPARTMENT" 
                                                    value={
                                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                            {user.department.parentDepartment.name}
                                                            {user.department.parentDepartment.code && ` (${user.department.parentDepartment.code})`}
                                                        </Typography>
                                                    } 
                                                />
                                                <DetailRow 
                                                    icon={<BusinessIcon sx={{ ml: 2 }} />} 
                                                    label="SUB-DEPARTMENT" 
                                                    value={
                                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                            {user.department.name}
                                                            {user.department.code && ` (${user.department.code})`}
                                                        </Typography>
                                                    } 
                                                />
                                            </>
                                        ) : (
                                            // User is in a main department only
                                            <DetailRow 
                                                icon={<BusinessIcon />} 
                                                label="DEPARTMENT" 
                                                value={
                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                        {user.department.name}
                                                        {user.department.code && ` (${user.department.code})`}
                                                    </Typography>
                                                } 
                                            />
                                        )}
                                    </>
                                )}
                                {user.position?.title && (
                                    <DetailRow icon={<WorkIcon />} label="POSITION" value={user.position.title} />
                                )}
                                {user.employment?.contractType && (
                                    <DetailRow icon={<PersonIcon />} label="CONTRACT TYPE" value={user.employment.contractType} />
                                )}
                                {!user.employment?.hireDate && !user.department?.name && !user.position?.title && !user.employment?.contractType && (
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                        No information available
                                    </Typography>
                                )}
                            </Stack>
                        </Paper>

                        {/* Account Information Card */}
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 3, 
                                borderRadius: 3, 
                                border: '1px solid', 
                                borderColor: 'divider'
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box 
                                    sx={{ 
                                        display: 'flex',
                                        '@keyframes spin3d': {
                                            '0%': { transform: 'rotateY(0deg)' },
                                            '100%': { transform: 'rotateY(360deg)' }
                                        },
                                        animation: 'spin3d 3s ease-in-out infinite'
                                    }}
                                >
                                    <AdminIcon color="error" />
                                </Box>
                                Account Information
                            </Typography>
                            <Stack spacing={2.5}>
                                <DetailRow icon={<PersonIcon />} label="USERNAME" value={user.username} />
                                <DetailRow icon={<AdminIcon />} label="ROLE" value={user.role} />
                                {user.createdAt && (
                                    <DetailRow icon={<CalendarIcon />} label="ACCOUNT CREATED" value={new Date(user.createdAt).toLocaleDateString()} />
                                )}
                                {user.updatedAt && (
                                    <DetailRow icon={<CalendarIcon />} label="LAST UPDATED" value={new Date(user.updatedAt).toLocaleDateString()} />
                                )}
                            </Stack>
                        </Paper>
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
};

// Detail Row Component (for info sections)
const DetailRow = ({ icon, label, value }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box 
                sx={{ 
                    color: 'primary.main', 
                    display: 'flex', 
                    fontSize: 20,
                    '@keyframes float': {
                        '0%, 100%': { transform: 'translateY(0px)' },
                        '50%': { transform: 'translateY(-3px)' }
                    },
                    animation: 'float 3s ease-in-out infinite'
                }}
            >
                {icon}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                {label}
            </Typography>
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {value}
        </Typography>
    </Box>
);

export default UserDetailsPage;
