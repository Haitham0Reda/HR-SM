import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import { useAuth } from '../../contexts/AuthContext';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Typography,
    Chip,
    MenuItem,
    Card,
    CardContent,
    InputAdornment,
    Fade,
    Tooltip,
    Divider,
    Paper,
    Stack,
    alpha,
    Avatar
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    FilterList as FilterListIcon,
    Clear as ClearIcon,
    Category as CategoryIcon,
    AdminPanelSettings as AdminIcon,
    Visibility as VisibilityIcon,
    Key as KeyIcon,
    Sync as SyncIcon,
    Fingerprint as FingerprintIcon,
    Business as BusinessIcon,
    Work as WorkIcon,
    Download as DownloadIcon,
    PhotoLibrary as PhotoLibraryIcon,
    CheckCircle as CheckCircleIcon,
    BeachAccess as BeachAccessIcon,
    ExitToApp as ExitToAppIcon,
    Block as BlockIcon,
    Upload as UploadIcon,
    CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import userService from '../../services/user.service';
import { getUserProfilePicture, getUserInitials } from '../../utils/profilePicture';
import { useNotification } from '../../context/NotificationContext';
import { generateUserCredentialPDF } from '../../components/users/UserCredentialPDF';

const UsersPage = () => {
    const navigate = useNavigate();
    const { getCompanyRoute, companyName } = useCompanyRouting();
    const { tenant } = useAuth();
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [tempPassword, setTempPassword] = useState('');
    const [downloadingPhotos, setDownloadingPhotos] = useState(false);
    const [openBulkUpload, setOpenBulkUpload] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getAll();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching users:', error);
            showNotification('Failed to fetch users', 'error');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };


    const handleDelete = async () => {
        try {
            await userService.delete(selectedUser._id);
            showNotification('User deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const handleBulkUpload = async () => {
        if (!uploadFile) {
            showNotification('Please select a file', 'warning');
            return;
        }

        try {
            setUploading(true);
            showNotification('Uploading and processing file...', 'info');

            const response = await userService.bulkCreateFromExcel(uploadFile);

            if (response.created > 0) {
                showNotification(
                    `Successfully created ${response.created} user(s)${response.failed > 0 ? `, ${response.failed} failed` : ''}`,
                    response.failed > 0 ? 'warning' : 'success'
                );
            } else {
                showNotification('No users were created', 'warning');
            }

            // Show detailed errors if any
            if (response.errors && response.errors.length > 0) {

            }

            setOpenBulkUpload(false);
            setUploadFile(null);
            fetchUsers();
        } catch (error) {

            showNotification(error.response?.data?.error || 'Failed to upload file', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleBulkDownloadPhotos = async () => {
        try {
            setDownloadingPhotos(true);
            showNotification('Preparing photos for download...', 'info');

            // Get user IDs from filtered users who have photos
            const usersWithPhotos = filteredUsers.filter(user =>
                user.personalInfo?.profilePicture || user.profilePicture || user.avatar || user.photo
            );
            const userIds = usersWithPhotos.map(user => user._id);
            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('Authentication required');
            }

            if (userIds.length === 0) {
                showNotification('No users with photos found', 'warning');
                setDownloadingPhotos(false);
                return;
            }

            // Create download URL with token in query parameter
            const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
            const url = `${apiBaseUrl}/users/bulk-download-photos?token=${encodeURIComponent(token)}&userIds=${encodeURIComponent(JSON.stringify(userIds))}`;

            // Open in new window to bypass IDM
            window.open(url, '_blank');

            // Show success message
            setTimeout(() => {
                showNotification(`Downloading ${userIds.length} ${userIds.length === 1 ? 'photo' : 'photos'}!`, 'success');
                setDownloadingPhotos(false);
            }, 1000);

        } catch (error) {

            showNotification(error.message || 'Failed to download photos', 'error');
            setDownloadingPhotos(false);
        }
    };

    const filteredUsers = useMemo(() => {
        return (Array.isArray(users) ? users : []).filter(user => {
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            const matchesSearch = searchTerm === '' ||
                fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.employeeId && user.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesRole = roleFilter === 'all' || user.role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, roleFilter]);

    const stats = useMemo(() => {
        const usersArray = Array.isArray(users) ? users : [];
        return {
            total: usersArray.length,
            admins: usersArray.filter(u => u.role === 'admin').length,
            hr: usersArray.filter(u => u.role === 'hr').length,
            managers: usersArray.filter(u => u.role === 'manager').length,
            employees: usersArray.filter(u => u.role === 'employee').length,
            active: usersArray.filter(u => u.status === 'active').length,
            vacation: usersArray.filter(u => u.status === 'vacation').length,
            resigned: usersArray.filter(u => u.status === 'resigned').length,
            inactive: usersArray.filter(u => u.status === 'inactive').length
        };
    }, [users]);

    if (loading) return <Loading />;

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            p: { xs: 2, sm: 3, md: 4 }
        }}>
            {/* Header Section */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    color: 'white'
                }}
            >
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            width: 56,
                            height: 56,
                            backdropFilter: 'blur(10px)'
                        }}>
                            <PersonIcon sx={{ fontSize: 32 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {companyName || tenant?.name || 'Company'} Users
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Manage employees and their permissions for {companyName || tenant?.name || 'this company'}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            startIcon={<UploadIcon />}
                            onClick={() => setOpenBulkUpload(true)}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.3)',
                                borderRadius: 2.5,
                                textTransform: 'none',
                                px: 3,
                                py: 1.2,
                                fontSize: '1rem',
                                fontWeight: 600,
                                backdropFilter: 'blur(10px)',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    borderColor: 'rgba(255,255,255,0.5)',
                                    boxShadow: 2
                                }
                            }}
                        >
                            Bulk Upload
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={downloadingPhotos ? <SyncIcon className="spin" /> : <PhotoLibraryIcon />}
                            onClick={handleBulkDownloadPhotos}
                            disabled={downloadingPhotos || filteredUsers.length === 0}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.3)',
                                borderRadius: 2.5,
                                textTransform: 'none',
                                px: 3,
                                py: 1.2,
                                fontSize: '1rem',
                                fontWeight: 600,
                                backdropFilter: 'blur(10px)',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    borderColor: 'rgba(255,255,255,0.5)',
                                    boxShadow: 2
                                },
                                '&.Mui-disabled': {
                                    color: 'rgba(255,255,255,0.5)',
                                    borderColor: 'rgba(255,255,255,0.2)'
                                }
                            }}
                        >
                            {downloadingPhotos ? 'Downloading...' : 'Download Photos'}
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate(getCompanyRoute('/users/create'))}
                            sx={{
                                bgcolor: 'white',
                                color: 'primary.main',
                                borderRadius: 2.5,
                                textTransform: 'none',
                                px: 3,
                                py: 1.2,
                                fontSize: '1rem',
                                fontWeight: 600,
                                boxShadow: 3,
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.9)',
                                    boxShadow: 4
                                }
                            }}
                        >
                            New User
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Stats Cards */}
            <Box sx={{ display: 'flex', gap: 2.5, mb: 4, flexWrap: 'wrap' }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        flex: '1 1 250px',
                        transition: 'all 0.3s',
                        '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: 2
                        }
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{
                            bgcolor: alpha('#1976d2', 0.1),
                            color: 'primary.main',
                            width: 48,
                            height: 48
                        }}>
                            <CategoryIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Total Users
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                {stats.total}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        flex: '1 1 200px',
                        transition: 'all 0.3s',
                        '&:hover': {
                            borderColor: 'error.main',
                            boxShadow: 2
                        }
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{
                            bgcolor: alpha('#d32f2f', 0.1),
                            color: 'error.main',
                            width: 48,
                            height: 48
                        }}>
                            <AdminIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Admins
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                                {stats.admins}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        flex: '1 1 200px',
                        transition: 'all 0.3s',
                        '&:hover': {
                            borderColor: '#9c27b0',
                            boxShadow: 2
                        }
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{
                            bgcolor: alpha('#9c27b0', 0.1),
                            color: '#9c27b0',
                            width: 48,
                            height: 48
                        }}>
                            <PersonIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                HR
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0' }}>
                                {stats.hr}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        flex: '1 1 200px',
                        transition: 'all 0.3s',
                        '&:hover': {
                            borderColor: '#ff9800',
                            boxShadow: 2
                        }
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{
                            bgcolor: alpha('#ff9800', 0.1),
                            color: '#ff9800',
                            width: 48,
                            height: 48
                        }}>
                            <WorkIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Managers
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800' }}>
                                {stats.managers}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        flex: '1 1 200px',
                        transition: 'all 0.3s',
                        '&:hover': {
                            borderColor: 'success.main',
                            boxShadow: 2
                        }
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{
                            bgcolor: alpha('#2e7d32', 0.1),
                            color: 'success.main',
                            width: 48,
                            height: 48
                        }}>
                            <BusinessIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Employees
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                                {stats.employees}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>

                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        flex: '1 1 200px',
                        transition: 'all 0.3s',
                        '&:hover': {
                            borderColor: 'success.main',
                            boxShadow: 2
                        }
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{
                            bgcolor: alpha('#2e7d32', 0.1),
                            color: 'success.main',
                            width: 48,
                            height: 48
                        }}>
                            <CheckCircleIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Active
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                                {stats.active}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        flex: '1 1 200px',
                        transition: 'all 0.3s',
                        '&:hover': {
                            borderColor: 'info.main',
                            boxShadow: 2
                        }
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{
                            bgcolor: alpha('#0288d1', 0.1),
                            color: 'info.main',
                            width: 48,
                            height: 48
                        }}>
                            <BeachAccessIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Vacation
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                                {stats.vacation}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        flex: '1 1 200px',
                        transition: 'all 0.3s',
                        '&:hover': {
                            borderColor: 'error.main',
                            boxShadow: 2
                        }
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{
                            bgcolor: alpha('#d32f2f', 0.1),
                            color: 'error.main',
                            width: 48,
                            height: 48
                        }}>
                            <ExitToAppIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Resigned
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                                {stats.resigned}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        flex: '1 1 200px',
                        transition: 'all 0.3s',
                        '&:hover': {
                            borderColor: 'warning.main',
                            boxShadow: 2
                        }
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{
                            bgcolor: alpha('#ed6c02', 0.1),
                            color: 'warning.main',
                            width: 48,
                            height: 48
                        }}>
                            <BlockIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Inactive
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                {stats.inactive}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
            </Box>

            {/* Search and Filter */}
            <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                        size="small"
                        placeholder="Search by name, email, or employee ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ flex: '1 1 300px', minWidth: 200 }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearchTerm('')}>
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }
                        }}
                        InputProps={{
                            sx: {
                                borderRadius: 2,
                                bgcolor: 'background.default'
                            }
                        }}
                    />
                    <TextField
                        select
                        size="small"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        sx={{ flex: '0 1 200px', minWidth: 150 }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FilterListIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                    </InputAdornment>
                                )
                            }
                        }}
                        InputProps={{
                            sx: {
                                borderRadius: 2,
                                bgcolor: 'background.default'
                            }
                        }}
                    >
                        <MenuItem value="all">All Roles</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="hr">HR</MenuItem>
                        <MenuItem value="manager">Manager</MenuItem>
                        <MenuItem value="employee">Employee</MenuItem>
                    </TextField>
                </Box>
            </Paper>

            {/* Results Info */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
                </Typography>
                {(searchTerm || roleFilter !== 'all') && (
                    <Button
                        size="small"
                        startIcon={<ClearIcon />}
                        onClick={() => {
                            setSearchTerm('');
                            setRoleFilter('all');
                        }}
                        sx={{ textTransform: 'none' }}
                    >
                        Clear filters
                    </Button>
                )}
            </Box>

            {/* Users Grid */}
            {filteredUsers.length === 0 ? (
                <Paper
                    elevation={0}
                    sx={{
                        textAlign: 'center',
                        py: 8,
                        borderRadius: 2.5,
                        border: '2px dashed',
                        borderColor: 'divider'
                    }}
                >
                    <PersonIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No users found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {searchTerm || roleFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : `Create your first user for ${companyName || tenant?.name || 'this company'} to get started`}
                    </Typography>
                </Paper>
            ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, justifyContent: 'center' }}>
                    {filteredUsers.map((user, index) => (
                        <Fade in timeout={200 + (index * 30)} key={user._id}>
                            <Card
                                elevation={0}
                                sx={{
                                    width: 300,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderRadius: 2.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                        borderColor: user.role === 'admin' ? 'error.main' : 'success.main',
                                        boxShadow: 3,
                                        transform: 'translateY(-4px)'
                                    }
                                }}
                            >
                                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar
                                        src={getUserProfilePicture(user)}
                                        alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            border: '3px solid',
                                            borderColor: user.role === 'admin' ? 'error.main' : 'success.main',
                                            boxShadow: 2,
                                            fontSize: '2rem',
                                            fontWeight: 700,
                                            bgcolor: user.role === 'admin'
                                                ? alpha('#d32f2f', 0.1)
                                                : alpha('#2e7d32', 0.1),
                                            color: user.role === 'admin' ? 'error.main' : 'success.main'
                                        }}
                                    >
                                        {(user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ textAlign: 'center', width: '100%' }}>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: '1.1rem',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                mb: 0.5
                                            }}
                                        >
                                            {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                                display: 'block',
                                                fontSize: '0.75rem',
                                                fontWeight: 600
                                            }}
                                        >
                                            ID: {user.employeeId || 'N/A'}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Divider />
                                <CardContent sx={{ pt: 2, pb: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {/* Department */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                DEPARTMENT
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {user.department?.parentDepartment
                                                    ? user.department.parentDepartment.name
                                                    : (user.department?.name || 'Not assigned')
                                                }
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Sub-Department (if exists) */}
                                    {user.department?.parentDepartment && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary', ml: 1 }} />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                    SUB-DEPARTMENT
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: '0.85rem',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {user.department.name}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <WorkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                POSITION
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {user.position?.title || 'Not assigned'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AdminIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                ROLE
                                            </Typography>
                                            <Chip
                                                label={user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'Employee'}
                                                size="small"
                                                sx={{
                                                    height: 22,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    mt: 0.5,
                                                    bgcolor: user.role === 'admin'
                                                        ? alpha('#d32f2f', 0.1)
                                                        : user.role === 'hr'
                                                        ? alpha('#9c27b0', 0.1)
                                                        : user.role === 'manager'
                                                        ? alpha('#ff9800', 0.1)
                                                        : alpha('#2e7d32', 0.1),
                                                    color: user.role === 'admin' 
                                                        ? 'error.main' 
                                                        : user.role === 'hr'
                                                        ? '#9c27b0'
                                                        : user.role === 'manager'
                                                        ? '#ff9800'
                                                        : 'success.main',
                                                    border: '1px solid',
                                                    borderColor: user.role === 'admin'
                                                        ? alpha('#d32f2f', 0.3)
                                                        : user.role === 'hr'
                                                        ? alpha('#9c27b0', 0.3)
                                                        : user.role === 'manager'
                                                        ? alpha('#ff9800', 0.3)
                                                        : alpha('#2e7d32', 0.3)
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CategoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                STATUS
                                            </Typography>
                                            <TextField
                                                select
                                                size="small"
                                                value={user.status || 'active'}
                                                onChange={async (e) => {
                                                    try {
                                                        await userService.update(user._id, { status: e.target.value });
                                                        showNotification(`User status updated to ${e.target.value}`, 'success');
                                                        fetchUsers();
                                                    } catch (error) {
                                                        showNotification('Failed to update status', 'error');
                                                    }
                                                }}
                                                sx={{
                                                    mt: 0.5,
                                                    width: '100%',
                                                    '& .MuiOutlinedInput-root': {
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600
                                                    }
                                                }}
                                                SelectProps={{
                                                    sx: {
                                                        height: 32,
                                                        borderRadius: 1.5,
                                                        bgcolor: user.status === 'active'
                                                            ? alpha('#2e7d32', 0.1)
                                                            : user.status === 'vacation'
                                                                ? alpha('#0288d1', 0.1)
                                                                : user.status === 'resigned'
                                                                    ? alpha('#d32f2f', 0.1)
                                                                    : alpha('#ed6c02', 0.1),
                                                        color: user.status === 'active'
                                                            ? 'success.main'
                                                            : user.status === 'vacation'
                                                                ? 'info.main'
                                                                : user.status === 'resigned'
                                                                    ? 'error.main'
                                                                    : 'warning.main',
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: user.status === 'active'
                                                                ? alpha('#2e7d32', 0.3)
                                                                : user.status === 'vacation'
                                                                    ? alpha('#0288d1', 0.3)
                                                                    : user.status === 'resigned'
                                                                        ? alpha('#d32f2f', 0.3)
                                                                        : alpha('#ed6c02', 0.3)
                                                        }
                                                    }
                                                }}
                                            >
                                                <MenuItem value="active">
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                                        <Typography sx={{ fontSize: '0.75rem' }}>Active</Typography>
                                                    </Box>
                                                </MenuItem>
                                                <MenuItem value="vacation">
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <BeachAccessIcon sx={{ fontSize: 16, color: 'info.main' }} />
                                                        <Typography sx={{ fontSize: '0.75rem' }}>Vacation</Typography>
                                                    </Box>
                                                </MenuItem>
                                                <MenuItem value="resigned">
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <ExitToAppIcon sx={{ fontSize: 16, color: 'error.main' }} />
                                                        <Typography sx={{ fontSize: '0.75rem' }}>Resigned</Typography>
                                                    </Box>
                                                </MenuItem>
                                                <MenuItem value="inactive">
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <BlockIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                                        <Typography sx={{ fontSize: '0.75rem' }}>Inactive</Typography>
                                                    </Box>
                                                </MenuItem>
                                            </TextField>
                                        </Box>
                                    </Box>
                                </CardContent>
                                <Divider />
                                <Box sx={{
                                    p: 1.5,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                    bgcolor: 'action.hover'
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                        <Tooltip title="View Details" arrow>
                                            <IconButton
                                                size="small"
                                                onClick={() => navigate(getCompanyRoute(`/users/${user._id}`))}
                                                sx={{
                                                    color: 'info.main',
                                                    borderRadius: 1.5,
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: 'info.main',
                                                        color: 'white',
                                                        transform: 'scale(1.1)'
                                                    }
                                                }}
                                            >
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Generate Credentials PDF" arrow>
                                            <IconButton
                                                size="small"
                                                onClick={async () => {
                                                    setSelectedUser(user);
                                                    setTempPassword('');

                                                    // Try to fetch plain password from database
                                                    try {
                                                        const response = await userService.getPlainPassword(user._id);
                                                        if (response.plainPassword) {
                                                            // Password available, generate PDF directly
                                                            showNotification('Generating credentials PDF...', 'info');
                                                            const success = await generateUserCredentialPDF(user, response.plainPassword);
                                                            if (success) {
                                                                showNotification('Credentials PDF generated successfully!', 'success');
                                                            } else {
                                                                showNotification('Failed to generate credentials PDF', 'error');
                                                            }
                                                            return;
                                                        }
                                                    } catch (error) {
                                                        // Password not available, show dialog

                                                    }

                                                    // Show dialog if password not available
                                                    setOpenPasswordDialog(true);
                                                }}
                                                sx={{
                                                    color: 'warning.main',
                                                    borderRadius: 1.5,
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: 'warning.main',
                                                        color: 'white',
                                                        transform: 'scale(1.1)'
                                                    }
                                                }}
                                            >
                                                <KeyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Sync" arrow>
                                            <IconButton
                                                size="small"
                                                onClick={() => showNotification('Sync coming soon', 'info')}
                                                sx={{
                                                    color: 'secondary.main',
                                                    borderRadius: 1.5,
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: 'secondary.main',
                                                        color: 'white',
                                                        transform: 'scale(1.1)'
                                                    }
                                                }}
                                            >
                                                <SyncIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Attendance (Coming Soon)" arrow>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    disabled
                                                    sx={{
                                                        borderRadius: 1.5,
                                                        '&.Mui-disabled': {
                                                            color: 'action.disabled'
                                                        }
                                                    }}
                                                >
                                                    <FingerprintIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                    <Divider />
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                        <Tooltip title="Edit User" arrow>
                                            <IconButton
                                                size="small"
                                                onClick={() => navigate(getCompanyRoute(`/users/${user._id}/edit`))}
                                                sx={{
                                                    color: 'primary.main',
                                                    borderRadius: 1.5,
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: 'primary.main',
                                                        color: 'white',
                                                        transform: 'scale(1.1)'
                                                    }
                                                }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete User" arrow>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setOpenConfirm(true);
                                                }}
                                                sx={{
                                                    color: 'error.main',
                                                    borderRadius: 1.5,
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        bgcolor: 'error.main',
                                                        color: 'white',
                                                        transform: 'scale(1.1)'
                                                    }
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Card>
                        </Fade>
                    ))}
                </Box>
            )}

            <ConfirmDialog
                open={openConfirm}
                title="Delete User"
                message={`Are you sure you want to delete "${selectedUser?.firstName} ${selectedUser?.lastName}" (${selectedUser?.email})?`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedUser(null);
                }}
            />

            {/* Password Dialog for Credentials PDF */}
            <Dialog
                open={openPasswordDialog}
                onClose={() => setOpenPasswordDialog(false)}
                maxWidth="sm"
                fullWidth
                slots={{ transition: Fade }}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 2.5,
                            boxShadow: 8
                        }
                    }
                }}
            >
                <DialogTitle sx={{
                    pb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                }}>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                        <KeyIcon />
                    </Avatar>
                    <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                        Set Temporary Password
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Enter the password for <strong>{`${selectedUser?.firstName || ''} ${selectedUser?.lastName || ''}`.trim() || selectedUser?.email}</strong> to display on the credentials PDF.
                    </Typography>
                    <Box sx={{
                        p: 2,
                        bgcolor: 'info.lighter',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'info.main',
                        mb: 2
                    }}>
                        <Typography variant="body2" color="info.dark" sx={{ fontWeight: 600, mb: 1 }}>
                            ℹ Password Not Stored
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', mb: 1 }}>
                            This user was created before the plain password storage feature was implemented.
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                            <strong>Options:</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 2 }}>
                            • Enter the password manually if you know it
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 2 }}>
                            • Leave empty to auto-generate a display-only password
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 2 }}>
                            • Update the user's password to store it for future use
                        </Typography>
                    </Box>
                    <TextField
                        label="Password"
                        type="text"
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        fullWidth
                        placeholder="Enter password or leave empty to auto-generate"
                        helperText="The password entered here is for display only and won't change the user's actual password"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 2.5 }}>
                    <Button
                        onClick={() => {
                            setOpenPasswordDialog(false);
                            setTempPassword('');
                        }}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={async () => {
                            try {
                                showNotification('Generating credentials PDF...', 'info');
                                // Use manual password or auto-generate
                                const passwordToUse = tempPassword || null;
                                const success = await generateUserCredentialPDF(
                                    selectedUser,
                                    passwordToUse
                                );
                                if (success) {
                                    showNotification('Credentials PDF generated successfully!', 'success');
                                    setOpenPasswordDialog(false);
                                    setTempPassword('');
                                } else {
                                    showNotification('Failed to generate credentials PDF', 'error');
                                }
                            } catch (error) {

                                showNotification('Error generating credentials PDF', 'error');
                            }
                        }}
                        variant="contained"
                        sx={{
                            textTransform: 'none',
                            borderRadius: 2,
                            px: 3,
                            fontWeight: 600
                        }}
                    >
                        Generate PDF
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Upload Dialog */}
            <Dialog
                open={openBulkUpload}
                onClose={() => {
                    setOpenBulkUpload(false);
                    setUploadFile(null);
                }}
                maxWidth="md"
                fullWidth
                slots={{ transition: Fade }}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 2.5,
                            boxShadow: 8
                        }
                    }
                }}
            >
                <DialogTitle sx={{
                    pb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <CloudUploadIcon />
                    </Avatar>
                    <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                        Bulk Upload Users
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                            Upload an Excel file (.xlsx or .xls) containing user information to create multiple users at once.
                        </Typography>
                        <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = '/templates/bulk-users-template.xlsx';
                                link.download = 'bulk-users-template.xlsx';
                                link.click();
                            }}
                            sx={{
                                textTransform: 'none',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Download Template
                        </Button>
                    </Box>

                    <Box sx={{
                        p: 2,
                        bgcolor: 'info.lighter',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'info.main',
                        mb: 3,
                        maxHeight: 400,
                        overflowY: 'auto'
                    }}>
                        <Typography variant="body2" color="info.dark" sx={{ fontWeight: 600, mb: 1 }}>
                            📋 Excel Template Columns:
                        </Typography>

                        <Typography variant="body2" color="error.main" sx={{ fontWeight: 600, ml: 2, mt: 1, mb: 0.5 }}>
                            Required Fields:
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>username</strong> - Unique username
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>email</strong> - Email address
                        </Typography>

                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600, ml: 2, mt: 1, mb: 0.5 }}>
                            Basic Information:
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>password</strong> - User password (defaults to "DefaultPassword123")
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>role</strong> - employee, admin, hr, manager, supervisor, head-of-department, dean
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>status</strong> - active, vacation, resigned, inactive
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>employeeId</strong> - Employee ID (auto-generated if not provided)
                        </Typography>

                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600, ml: 2, mt: 1, mb: 0.5 }}>
                            Personal Information:
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>fullName</strong> - Full name
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>firstName</strong>, <strong>medName</strong>, <strong>lastName</strong> - Name parts
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>arabicName</strong> - Arabic name
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>dateOfBirth</strong> - Format: YYYY-MM-DD
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>gender</strong> - male, female
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>nationality</strong> - Nationality
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>nationalId</strong> - National ID number
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>phone</strong> - Phone number
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>address</strong> - Full address
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>maritalStatus</strong> - single, married, divorced, widowed
                        </Typography>

                        <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600, ml: 2, mt: 1, mb: 0.5 }}>
                            Employment Information:
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>hireDate</strong> - Hire date (YYYY-MM-DD)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>contractType</strong> - full-time, part-time, contract, probation
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>employmentStatus</strong> - active, on-leave, vacation, inactive, terminated, resigned
                        </Typography>

                        <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 600, ml: 2, mt: 1, mb: 0.5 }}>
                            Vacation Balance:
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>annualTotal</strong>, <strong>annualUsed</strong> - Annual vacation days
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>casualTotal</strong>, <strong>casualUsed</strong> - Casual leave days
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', ml: 3, mb: 0.5 }}>
                            • <strong>flexibleTotal</strong>, <strong>flexibleUsed</strong> - Flexible leave days
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            border: '2px dashed',
                            borderColor: uploadFile ? 'success.main' : 'divider',
                            borderRadius: 2,
                            p: 4,
                            textAlign: 'center',
                            bgcolor: uploadFile ? alpha('#2e7d32', 0.05) : 'background.default',
                            transition: 'all 0.3s',
                            cursor: 'pointer',
                            '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: alpha('#1976d2', 0.05)
                            }
                        }}
                        onClick={() => document.getElementById('bulk-upload-input').click()}
                    >
                        <input
                            id="bulk-upload-input"
                            type="file"
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    setUploadFile(e.target.files[0]);
                                }
                            }}
                        />
                        {uploadFile ? (
                            <>
                                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                    {uploadFile.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {(uploadFile.size / 1024).toFixed(2)} KB
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<ClearIcon />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setUploadFile(null);
                                    }}
                                    sx={{ mt: 2, textTransform: 'none' }}
                                >
                                    Remove file
                                </Button>
                            </>
                        ) : (
                            <>
                                <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                    Click to select Excel file
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Supports .xlsx and .xls files (max 5MB)
                                </Typography>
                            </>
                        )}
                    </Box>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 2.5 }}>
                    <Button
                        onClick={() => {
                            setOpenBulkUpload(false);
                            setUploadFile(null);
                        }}
                        disabled={uploading}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleBulkUpload}
                        variant="contained"
                        disabled={!uploadFile || uploading}
                        startIcon={uploading ? <SyncIcon className="spin" /> : <UploadIcon />}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 2,
                            px: 3,
                            fontWeight: 600
                        }}
                    >
                        {uploading ? 'Uploading...' : 'Upload & Create Users'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UsersPage;
