import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import {
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    Breadcrumbs,
    Link,
    Alert,
    CircularProgress,
    Divider,
    Stack,
    alpha,
    Avatar
} from '@mui/material';
import { 
    Home as HomeIcon, 
    Save as SaveIcon, 
    Clear as ClearIcon,
    Security as SecurityIcon,
    NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import roleService from '../../services/role.service';
import PermissionCategoryAccordion from '../../components/roles/PermissionCategoryAccordion';
import RoleTypeBadge from '../../components/roles/RoleTypeBadge';
import { useNotification } from '../../context/NotificationContext.js';

const RoleEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { showNotification } = useNotification();
    const isEditMode = Boolean(id);

    // Form state
    const [roleData, setRoleData] = useState({
        name: '',
        displayName: '',
        description: '',
        permissions: []
    });

    // Permission data
    const [allPermissions, setAllPermissions] = useState({});
    const [permissionCategories, setPermissionCategories] = useState({});
    
    // UI state
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const [isSystemRole, setIsSystemRole] = useState(false);
    const [existingRoles, setExistingRoles] = useState([]);

    // Calculate total selected permissions count
    const selectedPermissionCount = useMemo(() => {
        return roleData.permissions.length;
    }, [roleData.permissions]);

    // Calculate total available permissions count
    const totalPermissionCount = useMemo(() => {
        return Object.keys(allPermissions).length;
    }, [allPermissions]);

    // Check if form is valid (for disabling submit button)
    const isFormValid = useMemo(() => {
        // Check required fields
        if (!roleData.displayName.trim()) {
            return false;
        }

        // Check name field for create mode
        if (!isEditMode) {
            if (!roleData.name.trim()) {
                return false;
            }

            // Check kebab-case format
            const kebabCaseRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
            if (!kebabCaseRegex.test(roleData.name)) {
                return false;
            }

            // Check for duplicates
            const isDuplicate = existingRoles.some(role => role.name === roleData.name);
            if (isDuplicate) {
                return false;
            }
        }

        // Check at least one permission is selected
        if (roleData.permissions.length === 0) {
            return false;
        }

        // Check for any existing errors
        if (Object.keys(errors).some(key => errors[key])) {
            return false;
        }

        return true;
    }, [roleData, isEditMode, existingRoles, errors]);

    // Keyboard shortcuts handler
    const handleKeyDown = useCallback((event) => {
        // Ctrl/Cmd + S: Save form
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            document.getElementById('role-form-submit-button')?.click();
        }
        // Escape: Cancel and go back
        if (event.key === 'Escape') {
            event.preventDefault();
            navigate(getCompanyRoute('/roles'));
        }
    }, [navigate]);

    // Add keyboard event listener
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    // Load permissions and role data
    useEffect(() => {
        const loadData = async () => {
            try {
                setInitialLoading(true);
                
                // Load all available permissions
                const permissionsResponse = await roleService.getAllPermissions();
                setAllPermissions(permissionsResponse.permissions || {});
                setPermissionCategories(permissionsResponse.categories || {});

                // Load all existing roles for duplicate checking
                const rolesResponse = await roleService.getAll();
                setExistingRoles(rolesResponse.roles || []);

                // If editing, load role data
                if (isEditMode) {
                    const role = await roleService.getById(id);
                    setRoleData({
                        name: role.name || '',
                        displayName: role.displayName || '',
                        description: role.description || '',
                        permissions: role.permissions || []
                    });
                    setIsSystemRole(role.isSystemRole || false);
                }
            } catch (error) {

                showNotification('Failed to load data', 'error');
            } finally {
                setInitialLoading(false);
            }
        };

        loadData();
    }, [id, isEditMode, showNotification]);

    // Handle form field changes
    const handleFieldChange = (field) => (event) => {
        const value = event.target.value;
        
        setRoleData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
        
        // Real-time validation for name field
        if (field === 'name' && !isEditMode && value.trim()) {
            const kebabCaseRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
            if (!kebabCaseRegex.test(value)) {
                setErrors(prev => ({
                    ...prev,
                    name: 'Role name must be in kebab-case format (lowercase, hyphens only)'
                }));
            } else {
                // Check for duplicates
                const isDuplicate = existingRoles.some(role => role.name === value);
                if (isDuplicate) {
                    setErrors(prev => ({
                        ...prev,
                        name: 'A role with this name already exists'
                    }));
                }
            }
        }
    };

    // Handle individual permission toggle
    const handlePermissionToggle = (permission, checked) => {
        setRoleData(prev => ({
            ...prev,
            permissions: checked
                ? [...prev.permissions, permission]
                : prev.permissions.filter(p => p !== permission)
        }));
        
        // Clear permission error when user selects at least one permission
        if (checked && errors.permissions) {
            setErrors(prev => ({
                ...prev,
                permissions: null,
                invalidPermissions: null
            }));
        }
    };

    // Handle "Select All" for a category
    const handleSelectAllCategory = (category, categoryPermissions, selectAll) => {
        setRoleData(prev => {
            let newPermissions = [...prev.permissions];
            
            if (selectAll) {
                // Add all permissions from this category that aren't already selected
                categoryPermissions.forEach(perm => {
                    if (!newPermissions.includes(perm)) {
                        newPermissions.push(perm);
                    }
                });
            } else {
                // Remove all permissions from this category
                newPermissions = newPermissions.filter(
                    perm => !categoryPermissions.includes(perm)
                );
            }
            
            return {
                ...prev,
                permissions: newPermissions
            };
        });
        
        // Clear permission error when user selects permissions
        if (selectAll && errors.permissions) {
            setErrors(prev => ({
                ...prev,
                permissions: null,
                invalidPermissions: null
            }));
        }
    };

    // Handle "Clear All" - deselect all permissions
    const handleClearAll = () => {
        setRoleData(prev => ({
            ...prev,
            permissions: []
        }));
        showNotification('All permissions cleared', 'info');
    };

    // Handle "Select All" - select all available permissions
    const handleSelectAllPermissions = () => {
        const allPermissionKeys = Object.keys(allPermissions);
        setRoleData(prev => ({
            ...prev,
            permissions: allPermissionKeys
        }));
        showNotification(`Selected all ${allPermissionKeys.length} permissions`, 'success');
    };

    // Validate permissions against available permissions
    const validatePermissions = (permissions) => {
        const validationErrors = [];
        const invalidPerms = [];
        
        if (!Array.isArray(permissions)) {
            validationErrors.push('Permissions must be an array');
            return { valid: false, errors: validationErrors, invalidPermissions: invalidPerms };
        }
        
        if (permissions.length === 0) {
            validationErrors.push('At least one permission must be selected');
            return { valid: false, errors: validationErrors, invalidPermissions: invalidPerms };
        }
        
        // Check for invalid permission keys
        const validPermissionKeys = Object.keys(allPermissions);
        permissions.forEach(perm => {
            if (!validPermissionKeys.includes(perm)) {
                invalidPerms.push(perm);
            }
        });
        
        if (invalidPerms.length > 0) {
            validationErrors.push(`Invalid permissions detected: ${invalidPerms.join(', ')}`);
        }
        
        // Check for duplicates
        const uniquePermissions = [...new Set(permissions)];
        if (uniquePermissions.length !== permissions.length) {
            validationErrors.push('Duplicate permissions detected');
        }
        
        return {
            valid: validationErrors.length === 0,
            errors: validationErrors,
            invalidPermissions: invalidPerms
        };
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Validate display name (required)
        if (!roleData.displayName.trim()) {
            newErrors.displayName = 'Display name is required';
        }

        // Validate role name (required for create mode only)
        if (!isEditMode) {
            if (!roleData.name.trim()) {
                newErrors.name = 'Role name is required';
            } else {
                // Validate kebab-case format
                const kebabCaseRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
                if (!kebabCaseRegex.test(roleData.name)) {
                    newErrors.name = 'Role name must be in kebab-case format (lowercase, hyphens only)';
                } else {
                    // Check for duplicate role names
                    const isDuplicate = existingRoles.some(role => role.name === roleData.name);
                    if (isDuplicate) {
                        newErrors.name = 'A role with this name already exists';
                    }
                }
            }
        }

        // Validate permissions
        const permissionValidation = validatePermissions(roleData.permissions);
        if (!permissionValidation.valid) {
            newErrors.permissions = permissionValidation.errors.join('; ');
            if (permissionValidation.invalidPermissions.length > 0) {
                newErrors.invalidPermissions = permissionValidation.invalidPermissions;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validateForm()) {
            showNotification('Please fix the errors in the form', 'error');
            return;
        }

        // Store original data for potential rollback
        const originalData = { ...roleData };

        try {
            setLoading(true);

            // Navigate immediately for optimistic UI (user sees instant response)
            const successMessage = isEditMode ? 'Role updated successfully' : 'Role created successfully';
            
            // Show loading notification
            showNotification(
                isEditMode ? 'Updating role...' : 'Creating role...', 
                'info'
            );

            if (isEditMode) {
                // Update existing role
                await roleService.update(id, {
                    displayName: roleData.displayName,
                    description: roleData.description,
                    permissions: roleData.permissions
                });
            } else {
                // Create new role
                await roleService.create(roleData);
            }

            // Show success notification after API confirms
            showNotification(successMessage, 'success');
            
            // Navigate after successful API call
            navigate(getCompanyRoute('/roles'));
        } catch (error) {

            // Rollback to original data on error
            setRoleData(originalData);
            
            // Handle validation errors from backend
            // API interceptor transforms errors to have message, status, and data at top level
            const errorData = error.data || {};
            const { details } = errorData;
            
            // Display detailed error message
            let displayMessage = error.message || 'Failed to save role';
            
            // If there are invalid permissions, show them
            if (details?.invalidPermissions && details.invalidPermissions.length > 0) {
                displayMessage += `\nInvalid permissions: ${details.invalidPermissions.join(', ')}`;
                
                // Set form errors to highlight the issue
                setErrors(prev => ({
                    ...prev,
                    permissions: details.errors?.join('; ') || 'Invalid permissions detected',
                    invalidPermissions: details.invalidPermissions
                }));
            }
            
            showNotification(displayMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        navigate(getCompanyRoute('/roles'));
    };

    if (initialLoading) {
        return (
            <Box sx={{ 
                minHeight: '100vh',
                bgcolor: 'background.default',
                p: { xs: 2, sm: 3, md: 4 }
            }}>
                <Box 
                    display="flex" 
                    justifyContent="center" 
                    alignItems="center" 
                    minHeight="400px"
                    role="status"
                    aria-live="polite"
                    aria-label="Loading role form"
                >
                    <CircularProgress aria-hidden="true" />
                </Box>
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
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }} aria-label="breadcrumb navigation">
                <Link
                    underline="hover"
                    sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    color="inherit"
                    onClick={() => navigate(getCompanyRoute('/dashboard'))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(getCompanyRoute('/dashboard'));
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
                    onClick={() => navigate(getCompanyRoute('/roles'))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(getCompanyRoute('/roles'));
                        }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label="Navigate to roles list"
                >
                    Roles
                </Link>
                <Typography color="text.primary" aria-current="page">
                    {isEditMode ? 'Edit Role' : 'Create Role'}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
                            <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
                                {isEditMode ? 'Edit Role' : 'Create New Role'}
                            </Typography>
                            {isEditMode && (
                                <Box sx={{ 
                                    '& .MuiChip-root': {
                                        bgcolor: isSystemRole 
                                            ? 'rgba(255,255,255,0.2)' 
                                            : alpha('#2e7d32', 0.3),
                                        color: 'white',
                                        fontWeight: 600,
                                        backdropFilter: 'blur(10px)',
                                        border: 'none'
                                    }
                                }}>
                                    <RoleTypeBadge isSystemRole={isSystemRole} />
                                </Box>
                            )}
                        </Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            {isEditMode 
                                ? 'Update role information and permissions' 
                                : 'Create a new custom role with specific permissions'}
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {isSystemRole && (
                <Alert 
                    severity="warning" 
                    sx={{ 
                        mb: 3,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'warning.main'
                    }}
                >
                    This is a system role. You can modify permissions but cannot change the role name.
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                {/* Basic Information */}
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
                        Basic Information
                    </Typography>
                    <Divider sx={{ mb: 3 }} role="presentation" />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextField
                            label="Role Name (System Identifier)"
                            value={roleData.name}
                            onChange={handleFieldChange('name')}
                            disabled={isEditMode}
                            error={Boolean(errors.name)}
                            helperText={
                                errors.name || 
                                'Lowercase with hyphens (e.g., custom-manager). Must be unique.'
                            }
                            required={!isEditMode}
                            fullWidth
                            slotProps={{
                                input: {
                                    sx: { borderRadius: 2 },
                                    'aria-label': 'Role name system identifier',
                                    'aria-describedby': 'role-name-helper-text',
                                    'aria-invalid': Boolean(errors.name)
                                }
                            }}
                        />

                        <TextField
                            label="Display Name"
                            value={roleData.displayName}
                            onChange={handleFieldChange('displayName')}
                            error={Boolean(errors.displayName)}
                            helperText={errors.displayName || 'Human-readable name (e.g., Custom Manager)'}
                            required
                            fullWidth
                            slotProps={{
                                input: {
                                    sx: { borderRadius: 2 },
                                    'aria-label': 'Role display name',
                                    'aria-describedby': 'display-name-helper-text',
                                    'aria-invalid': Boolean(errors.displayName)
                                }
                            }}
                        />

                        <TextField
                            label="Description"
                            value={roleData.description}
                            onChange={handleFieldChange('description')}
                            multiline
                            rows={3}
                            helperText="Optional description of this role"
                            fullWidth
                            slotProps={{
                                input: {
                                    sx: { borderRadius: 2 },
                                    'aria-label': 'Role description',
                                    'aria-describedby': 'description-helper-text'
                                }
                            }}
                        />
                    </Box>
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
                        
                        {/* Permission Count Indicator */}
                        <Paper 
                            elevation={0}
                            role="status"
                            aria-live="polite"
                            aria-label={`${selectedPermissionCount} of ${totalPermissionCount} permissions selected`}
                            sx={{ 
                                minWidth: 200,
                                p: 2.5,
                                borderRadius: 2.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: alpha('#1976d2', 0.05)
                            }}
                        >
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Selected Permissions
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                {selectedPermissionCount} / {totalPermissionCount}
                            </Typography>
                        </Paper>
                    </Box>

                    {/* Bulk Action Buttons */}
                    <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleSelectAllPermissions}
                            disabled={selectedPermissionCount === totalPermissionCount}
                            aria-label="Select all available permissions"
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600
                            }}
                        >
                            Select All Permissions
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            color="secondary"
                            startIcon={<ClearIcon />}
                            onClick={handleClearAll}
                            disabled={selectedPermissionCount === 0}
                            aria-label="Clear all selected permissions"
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600
                            }}
                        >
                            Clear All
                        </Button>
                    </Stack>

                    <Divider sx={{ mb: 3 }} role="presentation" />

                    {errors.permissions && (
                        <Alert 
                            severity="error"
                            role="alert"
                            aria-live="assertive"
                            sx={{ 
                                mb: 2,
                                borderRadius: 2.5,
                                border: '1px solid',
                                borderColor: 'error.main'
                            }}
                        >
                            <Typography variant="body2" fontWeight="bold" gutterBottom>
                                Permission Validation Error
                            </Typography>
                            <Typography variant="body2">
                                {errors.permissions}
                            </Typography>
                            {errors.invalidPermissions && errors.invalidPermissions.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" display="block">
                                        Invalid permissions:
                                    </Typography>
                                    <Typography variant="caption" component="ul" sx={{ pl: 2, mb: 0 }}>
                                        {errors.invalidPermissions.map(perm => (
                                            <li key={perm}>{perm}</li>
                                        ))}
                                    </Typography>
                                </Box>
                            )}
                        </Alert>
                    )}

                    {/* Permission Categories */}
                    {Object.entries(permissionCategories).map(([categoryName, permissions]) => (
                        <PermissionCategoryAccordion
                            key={categoryName}
                            category={categoryName}
                            permissions={permissions}
                            permissionDescriptions={allPermissions}
                            selectedPermissions={roleData.permissions}
                            onPermissionToggle={handlePermissionToggle}
                            onSelectAll={handleSelectAllCategory}
                            readOnly={false}
                        />
                    ))}
                </Paper>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        onClick={handleCancel}
                        disabled={loading}
                        aria-label="Cancel and return to roles list (Escape)"
                        sx={{
                            borderRadius: 2.5,
                            textTransform: 'none',
                            px: 3,
                            py: 1.2,
                            fontSize: '1rem',
                            fontWeight: 600
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        id="role-form-submit-button"
                        type="submit"
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                        disabled={loading || !isFormValid}
                        aria-label={`${isEditMode ? 'Update' : 'Create'} role (Ctrl+S)`}
                        sx={{
                            borderRadius: 2.5,
                            textTransform: 'none',
                            px: 3,
                            py: 1.2,
                            fontSize: '1rem',
                            fontWeight: 600,
                            boxShadow: 3,
                            '&:hover': {
                                boxShadow: 4
                            }
                        }}
                    >
                        {loading ? 'Saving...' : (isEditMode ? 'Update Role' : 'Create Role')}
                    </Button>
                </Box>
            </form>
        </Box>
    );
};

export default RoleEditPage;
