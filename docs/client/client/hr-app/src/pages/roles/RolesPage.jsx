import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Button,
    TextField,
    IconButton,
    Typography,
    Chip,
    MenuItem,
    Paper,
    InputAdornment,
    Fade,
    Tooltip,
    Avatar,
    Stack,
    alpha,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Breadcrumbs,
    Link
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    FilterList as FilterListIcon,
    Clear as ClearIcon,
    AdminPanelSettings as AdminIcon,
    Security as SecurityIcon,
    Category as CategoryIcon,
    Sync as SyncIcon,
    Home as HomeIcon
} from '@mui/icons-material';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import RolesTableSkeleton from '../../components/roles/RolesTableSkeleton';
import RoleTypeBadge from '../../components/roles/RoleTypeBadge';
import roleService from '../../services/role.service';
import { useNotification } from '../../context/NotificationContext';

const RolesPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [roles, setRoles] = useState([]);
    const [stats, setStats] = useState({ total: 0, system: 0, custom: 0 });
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [userCount, setUserCount] = useState(0);
    const [sampleUsers, setSampleUsers] = useState([]);
    const [checkingUsers, setCheckingUsers] = useState(false);
    const { showNotification } = useNotification();

    // Debounced search
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchParams.get('search') || '');

    // Keyboard shortcuts handler
    const handleKeyDown = useCallback((event) => {
        // Ctrl/Cmd + K: Focus search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            document.getElementById('roles-search-input')?.focus();
        }
        // Ctrl/Cmd + N: Create new role
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            navigate('/app/roles/create');
        }
        // Escape: Clear search and filters
        if (event.key === 'Escape' && (searchTerm || typeFilter !== 'all')) {
            event.preventDefault();
            setSearchTerm('');
            setTypeFilter('all');
        }
    }, [navigate, searchTerm, typeFilter]);

    // Add keyboard event listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    // Update URL query parameters when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (searchTerm) {
            params.set('search', searchTerm);
        }
        if (typeFilter !== 'all') {
            params.set('type', typeFilter);
        }
        setSearchParams(params, { replace: true });
    }, [searchTerm, typeFilter, setSearchParams]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchRoles();
        fetchStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const data = await roleService.getAll();
            setRoles(data);
        } catch (error) {
            showNotification(error.message || 'Failed to fetch roles', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await roleService.getStats();
            setStats(data);
        } catch (error) {

        }
    };

    const handleDeleteClick = async (role) => {
        setSelectedRole(role);
        setUserCount(0);
        setSampleUsers([]);
        setOpenConfirm(true);
        
        // Fetch user count for this role
        try {
            setCheckingUsers(true);
            const data = await roleService.getUserCount(role._id);
            setUserCount(data.userCount);
            setSampleUsers(data.sampleUsers || []);
        } catch (error) {

            // Continue with deletion attempt - backend will handle validation
        } finally {
            setCheckingUsers(false);
        }
    };

    const handleDeleteConfirm = async () => {
        // If there are assigned users, just close the dialog (it's showing a warning)
        if (userCount > 0) {
            setOpenConfirm(false);
            setSelectedRole(null);
            setUserCount(0);
            setSampleUsers([]);
            return;
        }

        // Store the role being deleted for potential rollback
        const roleToDelete = selectedRole;
        const previousRoles = [...roles];
        const previousStats = { ...stats };

        try {
            setDeleting(true);
            
            // Optimistic update: Remove role from UI immediately
            setRoles(prevRoles => prevRoles.filter(r => r._id !== roleToDelete._id));
            setStats(prevStats => ({
                total: prevStats.total - 1,
                system: roleToDelete.isSystemRole ? prevStats.system - 1 : prevStats.system,
                custom: !roleToDelete.isSystemRole ? prevStats.custom - 1 : prevStats.custom
            }));
            
            // Close dialog immediately for better UX
            setOpenConfirm(false);
            setSelectedRole(null);
            setUserCount(0);
            setSampleUsers([]);
            
            // Make API call
            await roleService.delete(roleToDelete._id);
            
            // Show success notification after API confirms
            showNotification('Role deleted successfully', 'success');
        } catch (error) {
            // Rollback optimistic update on error
            setRoles(previousRoles);
            setStats(previousStats);
            
            // Check if error is due to assigned users
            if (error.details && error.details.userCount) {
                setUserCount(error.details.userCount);
                showNotification(
                    `Cannot delete role: ${error.details.userCount} user${error.details.userCount > 1 ? 's are' : ' is'} currently assigned to this role`,
                    'error'
                );
            } else {
                showNotification(error.message || 'Failed to delete role', 'error');
            }
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setOpenConfirm(false);
        setSelectedRole(null);
        setUserCount(0);
        setSampleUsers([]);
    };

    const handleSyncSystemRoles = async () => {
        // Store previous state for potential rollback
        const previousRoles = [...roles];
        const previousStats = { ...stats };

        try {
            setSyncing(true);
            
            // Show loading notification immediately
            showNotification('Syncing system roles...', 'info');
            
            // Make API call
            const result = await roleService.syncSystemRoles();
            
            // Refresh roles list and stats after sync
            await fetchRoles();
            await fetchStats();
            
            // Show success notification with details
            showNotification(
                `System roles synced successfully. Created: ${result.created}, Updated: ${result.updated}`,
                'success'
            );
        } catch (error) {
            // Rollback to previous state on error
            setRoles(previousRoles);
            setStats(previousStats);
            
            showNotification(error.message || 'Failed to sync system roles', 'error');
        } finally {
            setSyncing(false);
        }
    };

    const filteredRoles = useMemo(() => {
        return roles.filter(role => {
            const matchesSearch = debouncedSearchTerm === '' ||
                role.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                role.displayName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                (role.description && role.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

            const matchesType = typeFilter === 'all' ||
                (typeFilter === 'system' && role.isSystemRole) ||
                (typeFilter === 'custom' && !role.isSystemRole);

            return matchesSearch && matchesType;
        });
    }, [roles, debouncedSearchTerm, typeFilter]);

    if (loading) {
        return (
            <Box sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
                p: { xs: 2, sm: 3, md: 4 }
            }}>
                <RolesTableSkeleton rows={5} />
            </Box>
        );
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            p: { xs: 2, sm: 3, md: 4 }
        }}>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 3 }} aria-label="breadcrumb navigation">
                <Link
                    underline="hover"
                    sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    color="inherit"
                    onClick={() => navigate('/app/dashboard')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate('/app/dashboard');
                        }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label="Navigate to home"
                >
                    <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" aria-hidden="true" />
                    Home
                </Link>
                <Typography color="text.primary" aria-current="page">
                    Roles
                </Typography>
            </Breadcrumbs>

            {/* Header Section */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, sm: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    color: 'white'
                }}
            >
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
                        <Avatar sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            width: { xs: 48, sm: 56 },
                            height: { xs: 48, sm: 56 },
                            backdropFilter: 'blur(10px)'
                        }}>
                            <SecurityIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
                        </Avatar>
                        <Box>
                            <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5, fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
                                Roles
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                Manage system roles and permissions
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ 
                        display: 'flex', 
                        gap: { xs: 1, sm: 2 }, 
                        width: { xs: '100%', sm: 'auto' },
                        flexDirection: { xs: 'column', sm: 'row' }
                    }}>
                        <Button
                            variant="outlined"
                            startIcon={<SyncIcon />}
                            onClick={handleSyncSystemRoles}
                            disabled={syncing}
                            aria-label="Sync system roles from configuration"
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.15)',
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.3)',
                                borderRadius: 2.5,
                                textTransform: 'none',
                                px: { xs: 2, sm: 2.5 },
                                py: { xs: 1, sm: 1.2 },
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                fontWeight: 600,
                                backdropFilter: 'blur(10px)',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.25)',
                                    borderColor: 'rgba(255,255,255,0.5)',
                                    boxShadow: 2
                                },
                                '&.Mui-disabled': {
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.5)',
                                    borderColor: 'rgba(255,255,255,0.2)'
                                }
                            }}
                        >
                            {syncing ? 'Syncing...' : 'Sync System Roles'}
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/app/roles/create')}
                            aria-label="Create new role (Ctrl+N)"
                            sx={{
                                bgcolor: 'white',
                                color: 'primary.main',
                                borderRadius: 2.5,
                                textTransform: 'none',
                                px: { xs: 2, sm: 3 },
                                py: { xs: 1, sm: 1.2 },
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                fontWeight: 600,
                                boxShadow: 3,
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.9)',
                                    boxShadow: 4
                                }
                            }}
                        >
                            Create Role
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Stats Cards */}
            <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: { 
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)'
                },
                gap: { xs: 2, sm: 2.5 },
                mb: 4
            }}>
                <Paper
                    elevation={0}
                    component="button"
                    sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.3s',
                        cursor: 'pointer',
                        bgcolor: 'background.paper',
                        width: '100%',
                        textAlign: 'left',
                        '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: 2
                        },
                        '&:focus': {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                            outlineOffset: '2px'
                        }
                    }}
                    onClick={() => {
                        setTypeFilter('all');
                        setSearchTerm('');
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setTypeFilter('all');
                            setSearchTerm('');
                        }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label="Show all roles"
                >
                    <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="center">
                        <Avatar sx={{
                            bgcolor: alpha('#1976d2', 0.1),
                            color: 'primary.main',
                            width: { xs: 40, sm: 48 },
                            height: { xs: 40, sm: 48 }
                        }}>
                            <CategoryIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                Total Roles
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                                {stats.total}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
                <Paper
                    elevation={0}
                    component="button"
                    sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.3s',
                        cursor: 'pointer',
                        bgcolor: 'background.paper',
                        width: '100%',
                        textAlign: 'left',
                        '&:hover': {
                            borderColor: 'error.main',
                            boxShadow: 2
                        },
                        '&:focus': {
                            outline: '2px solid',
                            outlineColor: 'error.main',
                            outlineOffset: '2px'
                        }
                    }}
                    onClick={() => setTypeFilter('system')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setTypeFilter('system');
                        }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label="Filter to show system roles only"
                >
                    <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="center">
                        <Avatar sx={{
                            bgcolor: alpha('#d32f2f', 0.1),
                            color: 'error.main',
                            width: { xs: 40, sm: 48 },
                            height: { xs: 40, sm: 48 }
                        }}>
                            <AdminIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                System Roles
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main', fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                                {stats.system}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
                <Paper
                    elevation={0}
                    component="button"
                    sx={{
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.3s',
                        cursor: 'pointer',
                        bgcolor: 'background.paper',
                        width: '100%',
                        textAlign: 'left',
                        '&:hover': {
                            borderColor: 'success.main',
                            boxShadow: 2
                        },
                        '&:focus': {
                            outline: '2px solid',
                            outlineColor: 'success.main',
                            outlineOffset: '2px'
                        },
                        // On small screens with 2 columns, span both columns for the third card
                        gridColumn: { xs: '1', sm: 'span 1' }
                    }}
                    onClick={() => setTypeFilter('custom')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setTypeFilter('custom');
                        }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label="Filter to show custom roles only"
                >
                    <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="center">
                        <Avatar sx={{
                            bgcolor: alpha('#2e7d32', 0.1),
                            color: 'success.main',
                            width: { xs: 40, sm: 48 },
                            height: { xs: 40, sm: 48 }
                        }}>
                            <SecurityIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                Custom Roles
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main', fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                                {stats.custom}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
            </Box>

            {/* Search and Filter */}
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    flexDirection: { xs: 'column', sm: 'row' }
                }}>
                    <TextField
                        id="roles-search-input"
                        size="small"
                        placeholder="Search roles... (Ctrl+K)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Search roles by name or description"
                        sx={{ flex: { xs: '1', sm: '1 1 300px' }, minWidth: { xs: '100%', sm: 200 } }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'text.secondary', fontSize: { xs: '1.25rem', sm: '1.5rem' } }} aria-hidden="true" />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton 
                                            size="small" 
                                            onClick={() => setSearchTerm('')}
                                            aria-label="Clear search"
                                        >
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }
                        }}
                        InputProps={{
                            sx: {
                                borderRadius: 2,
                                bgcolor: 'background.default',
                                fontSize: { xs: '0.875rem', sm: '1rem' }
                            }
                        }}
                    />
                    <TextField
                        select
                        size="small"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        aria-label="Filter roles by type"
                        sx={{ flex: { xs: '1', sm: '0 1 200px' }, minWidth: { xs: '100%', sm: 150 } }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FilterListIcon fontSize="small" sx={{ color: 'text.secondary' }} aria-hidden="true" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        InputProps={{
                            sx: {
                                borderRadius: 2,
                                bgcolor: 'background.default',
                                fontSize: { xs: '0.875rem', sm: '1rem' }
                            }
                        }}
                    >
                        <MenuItem value="all">All Types</MenuItem>
                        <MenuItem value="system">System Roles</MenuItem>
                        <MenuItem value="custom">Custom Roles</MenuItem>
                    </TextField>
                </Box>
            </Paper>

            {/* Results Info */}
            <Box sx={{ 
                mb: 2, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1
            }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {filteredRoles.length} {filteredRoles.length === 1 ? 'role' : 'roles'} found
                </Typography>
                {(searchTerm || typeFilter !== 'all') && (
                    <Button
                        size="small"
                        startIcon={<ClearIcon />}
                        onClick={() => {
                            setSearchTerm('');
                            setTypeFilter('all');
                        }}
                        aria-label="Clear all filters (Escape)"
                        sx={{ 
                            textTransform: 'none',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}
                    >
                        Clear filters
                    </Button>
                )}
            </Box>

            {/* Roles Table */}
            {filteredRoles.length === 0 ? (
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
                    <SecurityIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} aria-hidden="true" />
                    <Typography component="h2" variant="h6" color="text.secondary" gutterBottom>
                        No roles found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {searchTerm || typeFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Create your first role to get started'}
                    </Typography>
                </Paper>
            ) : (
                <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'auto',
                        // Enable horizontal scrolling on tablets
                        overflowX: { xs: 'auto', md: 'hidden' }
                    }}
                    role="region"
                    aria-label="Roles table"
                >
                    <Table sx={{ minWidth: { xs: 800, md: 650 } }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', minWidth: { xs: 120, md: 'auto' } }} scope="col">Name</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', minWidth: { xs: 140, md: 'auto' } }} scope="col">Display Name</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', minWidth: { xs: 200, md: 'auto' }, display: { xs: 'none', lg: 'table-cell' } }} scope="col">Description</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', minWidth: { xs: 100, md: 'auto' } }} scope="col">Permissions</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', minWidth: { xs: 100, md: 'auto' } }} scope="col">Type</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.875rem', minWidth: { xs: 120, md: 'auto' } }} scope="col">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredRoles.map((role, index) => (
                                <Fade in timeout={200 + (index * 30)} key={role._id}>
                                    <TableRow
                                        sx={{
                                            '&:hover': {
                                                bgcolor: 'action.hover'
                                            },
                                            transition: 'background-color 0.2s'
                                        }}
                                    >
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontFamily: 'monospace',
                                                    color: 'text.primary',
                                                    fontSize: { xs: '0.75rem', md: '0.875rem' }
                                                }}
                                            >
                                                {role.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                                {role.displayName}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    maxWidth: 300,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {role.description || 'No description'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={role.permissions?.length || 0}
                                                size="small"
                                                aria-label={`${role.permissions?.length || 0} permissions`}
                                                sx={{
                                                    fontWeight: 600,
                                                    bgcolor: alpha('#1976d2', 0.1),
                                                    color: 'primary.main',
                                                    fontSize: { xs: '0.7rem', md: '0.8125rem' }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <RoleTypeBadge isSystemRole={role.isSystemRole} />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', gap: { xs: 0.5, md: 1 }, justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                <Tooltip title="View Details" arrow>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => navigate(`/app/roles/${role._id}`)}
                                                        aria-label={`View details for ${role.displayName}`}
                                                        sx={{
                                                            color: 'info.main',
                                                            '&:hover': {
                                                                bgcolor: alpha('#0288d1', 0.1)
                                                            },
                                                            p: { xs: 0.5, md: 1 }
                                                        }}
                                                    >
                                                        <VisibilityIcon sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }} aria-hidden="true" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Edit Role" arrow>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => navigate(`/app/roles/${role._id}/edit`)}
                                                        aria-label={`Edit ${role.displayName}`}
                                                        sx={{
                                                            color: 'primary.main',
                                                            '&:hover': {
                                                                bgcolor: alpha('#1976d2', 0.1)
                                                            },
                                                            p: { xs: 0.5, md: 1 }
                                                        }}
                                                    >
                                                        <EditIcon sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }} aria-hidden="true" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={role.isSystemRole ? 'Cannot delete system role' : 'Delete Role'} arrow>
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeleteClick(role)}
                                                            disabled={role.isSystemRole}
                                                            aria-label={role.isSystemRole ? `Cannot delete system role ${role.displayName}` : `Delete ${role.displayName}`}
                                                            sx={{
                                                                color: 'error.main',
                                                                '&:hover': {
                                                                    bgcolor: alpha('#d32f2f', 0.1)
                                                                },
                                                                '&.Mui-disabled': {
                                                                    color: 'action.disabled'
                                                                },
                                                                p: { xs: 0.5, md: 1 }
                                                            }}
                                                        >
                                                            <DeleteIcon sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }} aria-hidden="true" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                </Fade>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={openConfirm}
                title={userCount > 0 ? "Cannot Delete Role" : "Delete Role"}
                message={
                    checkingUsers
                        ? `Checking for users assigned to "${selectedRole?.displayName}"...`
                        : userCount > 0
                        ? (
                            <Box>
                                <Typography variant="body1" gutterBottom>
                                    Cannot delete role <strong>"{selectedRole?.displayName}"</strong> because <strong>{userCount}</strong> user{userCount > 1 ? 's are' : ' is'} currently assigned to this role.
                                </Typography>
                                {sampleUsers.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            {userCount <= 5 ? 'Assigned users:' : `Sample of assigned users (showing ${sampleUsers.length} of ${userCount}):`}
                                        </Typography>
                                        <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                                            {sampleUsers.map(user => (
                                                <Typography component="li" key={user.id} variant="body2" sx={{ mb: 0.5 }}>
                                                    {user.fullName} ({user.username})
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                    Please reassign {userCount > 1 ? 'these users' : 'this user'} to a different role before deleting.
                                </Typography>
                            </Box>
                        )
                        : `Are you sure you want to delete the role "${selectedRole?.displayName}" (${selectedRole?.name})? This action cannot be undone.`
                }
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                confirmText={userCount > 0 ? "OK" : "Delete"}
                cancelText={userCount > 0 ? null : "Cancel"}
                confirmColor={userCount > 0 ? "warning" : "error"}
                loading={deleting}
            />
        </Box>
    );
};

export default RolesPage;
