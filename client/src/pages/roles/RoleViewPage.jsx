import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    Button,
    Box,
    Breadcrumbs,
    Link,
    Divider,
    Chip,
    Card,
    CardContent,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    alpha,
    Avatar,
    Stack
} from '@mui/material';
import {
    Home as HomeIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Security as SecurityIcon,
    CheckCircle as CheckCircleIcon,
    NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import roleService from '../../services/role.service';
import PermissionCategoryAccordion from '../../components/roles/PermissionCategoryAccordion';
import RoleViewSkeleton from '../../components/roles/RoleViewSkeleton';
import RoleTypeBadge from '../../components/roles/RoleTypeBadge';
import { useNotification } from '../../context/NotificationContext';

const RoleViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    // State
    const [role, setRole] = useState(null);
    const [allPermissions, setAllPermissions] = useState({});
    const [permissionCategories, setPermissionCategories] = useState({});
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [userCount, setUserCount] = useState(0);
    const [sampleUsers, setSampleUsers] = useState([]);
    const [checkingUsers, setCheckingUsers] = useState(false);

    // Keyboard shortcuts handler
    const handleKeyDown = useCallback((event) => {
        // E: Edit role
        if (event.key === 'e' || event.key === 'E') {
            if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                // Only trigger if not in an input field
                const target = event.target;
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                    event.preventDefault();
                    handleEdit();
                }
            }
        }
        // Delete: Delete role (if not system role)
        if (event.key === 'Delete' && role && !role.isSystemRole) {
            event.preventDefault();
            handleDeleteClick();
        }
        // Escape: Go back to roles list
        if (event.key === 'Escape') {
            event.preventDefault();
            navigate('/app/roles');
        }
    }, [role, navigate]);

    // Add keyboard event listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    // Load role data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                // Load role details
                const role = await roleService.getById(id);
                setRole(role);

                // Load all permissions for descriptions
                const permissionsResponse = await roleService.getAllPermissions();
                setAllPermissions(permissionsResponse.permissions || {});
                setPermissionCategories(permissionsResponse.categories || {});
            } catch (error) {
                console.error('Error loading role:', error);
                showNotification('Failed to load role details', 'error');
                navigate('/app/roles');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, navigate, showNotification]);

    // Handle edit
    const handleEdit = () => {
        navigate(`/app/roles/${id}/edit`);
    };

    // Handle delete click - check for user assignments first
    const handleDeleteClick = async () => {
        setDeleteDialogOpen(true);
        setUserCount(0);
        setSampleUsers([]);
        
        // Fetch user count for this role
        try {
            setCheckingUsers(true);
            const data = await roleService.getUserCount(id);
            setUserCount(data.userCount);
            setSampleUsers(data.sampleUsers || []);
        } catch (error) {
            console.error('Failed to fetch user count:', error);
            // Continue with deletion attempt - backend will handle validation
        } finally {
            setCheckingUsers(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        // If there are assigned users, just close the dialog
        if (userCount > 0) {
            setDeleteDialogOpen(false);
            return;
        }

        // Store role data for potential error display
        const roleToDelete = { ...role };

        try {
            setDeleting(true);
            
            // Close dialog immediately for better UX
            setDeleteDialogOpen(false);
            
            // Show loading notification
            showNotification('Deleting role...', 'info');
            
            // Navigate immediately (optimistic)
            navigate('/app/roles');
            
            // Make API call
            await roleService.delete(id);
            
            // Show success notification after API confirms
            showNotification('Role deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting role:', error);
            
            // On error, navigate back to the role view page
            navigate(`/app/roles/${id}`);
            
            // API interceptor transforms errors to have message, status, and data at top level
            const errorData = error.data || {};
            const { details } = errorData;
            
            // Check if error is due to assigned users
            if (details && details.userCount) {
                setUserCount(details.userCount);
                showNotification(
                    `Cannot delete role: ${details.userCount} user${details.userCount > 1 ? 's are' : ' is'} currently assigned to this role`,
                    'error'
                );
            } else {
                showNotification(error.message || 'Failed to delete role', 'error');
            }
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return <RoleViewSkeleton />;
    }

    if (!role) {
        return null;
    }

    // Count total permissions assigned
    const permissionCount = role.permissions?.length || 0;

    return (
        <Box sx={{ 
            minHeight: '100vh',
            bgcolor: 'background.default',
            p: { xs: 2, sm: 3, md: 4 }
        }}>
            {/* Breadcrumbs */}
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }} aria-label="breadcrumb navigation">
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
                <Link
                    underline="hover"
                    color="inherit"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate('/app/roles')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate('/app/roles');
                        }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label="Navigate to roles list"
                >
                    Roles
                </Link>
                <Typography color="text.primary" aria-current="page">
                    {role.displayName}
                </Typography>
            </Breadcrumbs>

            {/* Page Header */}
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
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ 
                            bgcolor: 'rgba(255,255,255,0.2)', 
                            width: 56, 
                            height: 56,
                            backdropFilter: 'blur(10px)'
                        }} aria-hidden="true">
                            <SecurityIcon sx={{ fontSize: 32 }} />
                        </Avatar>
                        <Box>
                            <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {role.displayName}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                    label={role.isSystemRole ? 'System Role' : 'Custom Role'}
                                    size="small"
                                    aria-label={`Role type: ${role.isSystemRole ? 'System Role' : 'Custom Role'}`}
                                    sx={{
                                        bgcolor: role.isSystemRole 
                                            ? 'rgba(255,255,255,0.2)' 
                                            : alpha('#2e7d32', 0.3),
                                        color: 'white',
                                        fontWeight: 600,
                                        backdropFilter: 'blur(10px)'
                                    }}
                                />
                                <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'monospace' }} aria-label={`System identifier: ${role.name}`}>
                                    {role.name}
                                </Typography>
                            </Stack>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
                        <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={handleEdit}
                            aria-label="Edit this role (E)"
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.15)',
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.3)',
                                borderRadius: 2.5,
                                textTransform: 'none',
                                px: 3,
                                py: 1.2,
                                fontSize: '1rem',
                                fontWeight: 600,
                                backdropFilter: 'blur(10px)',
                                flex: { xs: 1, sm: 'initial' },
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.25)',
                                    borderColor: 'rgba(255,255,255,0.5)',
                                    boxShadow: 2
                                }
                            }}
                        >
                            Edit
                        </Button>
                        {!role.isSystemRole && (
                            <Button
                                variant="outlined"
                                startIcon={<DeleteIcon />}
                                onClick={handleDeleteClick}
                                aria-label="Delete this role (Delete)"
                                sx={{
                                    bgcolor: alpha('#d32f2f', 0.15),
                                    color: 'white',
                                    borderColor: alpha('#d32f2f', 0.3),
                                    borderRadius: 2.5,
                                    textTransform: 'none',
                                    px: 3,
                                    py: 1.2,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    backdropFilter: 'blur(10px)',
                                    flex: { xs: 1, sm: 'initial' },
                                    '&:hover': {
                                        bgcolor: alpha('#d32f2f', 0.25),
                                        borderColor: alpha('#d32f2f', 0.5),
                                        boxShadow: 2
                                    }
                                }}
                            >
                                Delete
                            </Button>
                        )}
                    </Box>
                </Box>
            </Paper>

            {/* Role Metadata */}
            <Paper 
                elevation={0}
                sx={{ 
                    p: 3, 
                    mb: 3,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Typography component="h2" variant="h6" sx={{ fontWeight: 600 }} gutterBottom>
                    Role Information
                </Typography>
                <Divider sx={{ mb: 3 }} role="presentation" />

                <Grid container spacing={2.5}>
                    <Grid item xs={12} md={6}>
                        <Paper 
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 2.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.default'
                            }}
                        >
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 600 }}>
                                DISPLAY NAME
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {role.displayName}
                            </Typography>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper 
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 2.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.default'
                            }}
                        >
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 600 }}>
                                SYSTEM IDENTIFIER
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                                {role.name}
                            </Typography>
                        </Paper>
                    </Grid>

                    <Grid item xs={12}>
                        <Paper 
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 2.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.default'
                            }}
                        >
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 600 }}>
                                DESCRIPTION
                            </Typography>
                            <Typography variant="body1">
                                {role.description || 'No description provided'}
                            </Typography>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper 
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 2.5,
                                border: '1px solid',
                                borderColor: 'divider',
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
                                    <CheckCircleIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 600 }}>
                                        PERMISSION COUNT
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                        {role.permissions?.length || 0}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper 
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 2.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                transition: 'all 0.3s',
                                '&:hover': {
                                    borderColor: role.isSystemRole ? 'error.main' : 'success.main',
                                    boxShadow: 2
                                }
                            }}
                        >
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ 
                                    bgcolor: role.isSystemRole ? alpha('#d32f2f', 0.1) : alpha('#2e7d32', 0.1),
                                    color: role.isSystemRole ? 'error.main' : 'success.main',
                                    width: 48,
                                    height: 48
                                }}>
                                    <SecurityIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 600 }}>
                                        ROLE TYPE
                                    </Typography>
                                    <RoleTypeBadge 
                                        isSystemRole={role.isSystemRole} 
                                        size="medium"
                                    />
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>

            {/* Permissions */}
            <Paper 
                elevation={0}
                sx={{ 
                    p: 3, 
                    mb: 3,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                    <Typography component="h2" variant="h6" sx={{ fontWeight: 600 }}>
                        Permissions
                    </Typography>
                    <Chip
                        icon={<CheckCircleIcon aria-hidden="true" />}
                        label={`${permissionCount} permission${permissionCount !== 1 ? 's' : ''} assigned`}
                        aria-label={`${permissionCount} permission${permissionCount !== 1 ? 's' : ''} assigned to this role`}
                        sx={{
                            fontWeight: 600,
                            bgcolor: alpha('#1976d2', 0.1),
                            color: 'primary.main',
                            border: '1px solid',
                            borderColor: alpha('#1976d2', 0.3)
                        }}
                    />
                </Box>
                <Divider sx={{ mb: 3 }} role="presentation" />

                {permissionCount === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }} role="status" aria-live="polite">
                        <Typography variant="body1" color="text.secondary">
                            No permissions assigned to this role
                        </Typography>
                    </Box>
                ) : (
                    Object.entries(permissionCategories).map(([category, permissions]) => {
                        // Only show categories that have at least one selected permission
                        const selectedInCategory = permissions.filter(p => 
                            role.permissions?.includes(p)
                        );

                        if (selectedInCategory.length === 0) {
                            return null;
                        }

                        return (
                            <PermissionCategoryAccordion
                                key={category}
                                category={category}
                                permissions={permissions}
                                permissionDescriptions={allPermissions}
                                selectedPermissions={role.permissions || []}
                                readOnly={true}
                            />
                        );
                    })
                )}
            </Paper>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
                PaperProps={{
                    sx: {
                        borderRadius: 2.5,
                        minWidth: { xs: '90%', sm: 400 }
                    }
                }}
            >
                <DialogTitle id="delete-dialog-title" sx={{ fontWeight: 600 }}>
                    {userCount > 0 ? "Cannot Delete Role" : "Delete Role"}
                </DialogTitle>
                <DialogContent>
                    {checkingUsers ? (
                        <DialogContentText id="delete-dialog-description">
                            Checking for users assigned to "{role.displayName}"...
                        </DialogContentText>
                    ) : userCount > 0 ? (
                        <Box>
                            <DialogContentText id="delete-dialog-description" gutterBottom>
                                Cannot delete role <strong>"{role.displayName}"</strong> because <strong>{userCount}</strong> user{userCount > 1 ? 's are' : ' is'} currently assigned to this role.
                            </DialogContentText>
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
                            <DialogContentText sx={{ mt: 2 }}>
                                Please reassign {userCount > 1 ? 'these users' : 'this user'} to a different role before deleting.
                            </DialogContentText>
                        </Box>
                    ) : (
                        <DialogContentText id="delete-dialog-description">
                            Are you sure you want to delete the role "{role.displayName}"?
                            This action cannot be undone.
                        </DialogContentText>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    {userCount > 0 ? (
                        <Button 
                            onClick={() => setDeleteDialogOpen(false)} 
                            color="warning" 
                            variant="contained"
                            aria-label="Close dialog"
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                px: 3,
                                py: 1,
                                fontWeight: 600
                            }}
                        >
                            OK
                        </Button>
                    ) : (
                        <>
                            <Button 
                                onClick={() => setDeleteDialogOpen(false)} 
                                disabled={deleting}
                                aria-label="Cancel deletion"
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    px: 3,
                                    py: 1,
                                    fontWeight: 600
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDelete}
                                color="error"
                                variant="contained"
                                disabled={deleting}
                                aria-label="Confirm deletion"
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    px: 3,
                                    py: 1,
                                    fontWeight: 600,
                                    boxShadow: 2,
                                    '&:hover': {
                                        boxShadow: 3
                                    }
                                }}
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RoleViewPage;
