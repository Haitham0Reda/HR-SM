/**
 * RolePageTemplate - Example Implementation
 * 
 * This is a template showing how to implement loading and error states
 * for role management pages. Use this as a reference when creating
 * RoleEditPage and RoleViewPage components.
 * 
 * DO NOT USE THIS FILE DIRECTLY - It's for reference only
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    TextField,
    Typography,
    Button,
    Breadcrumbs,
    Link
} from '@mui/material';
import { LoadingButton, ErrorBoundary } from '../common';
import RoleFormSkeleton from './RoleFormSkeleton';
import useFormValidation from '../../hooks/useFormValidation';
import roleService from '../../services/role.service';
import { useNotification } from '../../context/NotificationContext';

const RolePageTemplate = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    
    // Loading states
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Form data
    const [formData, setFormData] = useState({
        name: '',
        displayName: '',
        description: '',
        permissions: []
    });
    
    // Form validation
    const {
        errors,
        setError,
        clearError,
        setApiErrors,
        clearAllErrors,
        hasAnyError
    } = useFormValidation();

    // Fetch role data on mount (for edit mode)
    useEffect(() => {
        if (id) {
            fetchRole();
        } else {
            setLoading(false);
        }
    }, [id]);

    /**
     * Fetch role data with loading state and error handling
     */
    const fetchRole = async () => {
        try {
            setLoading(true);
            const data = await roleService.getById(id);
            setFormData(data);
        } catch (error) {
            showNotification(
                error.message || 'Failed to load role',
                'error'
            );
            // Optionally redirect on error
            // navigate('/app/roles');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Validate form fields
     * Returns true if valid, false otherwise
     */
    const validateForm = () => {
        clearAllErrors();
        let isValid = true;

        // Validate name
        if (!formData.name) {
            setError('name', 'Role name is required');
            isValid = false;
        } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
            setError('name', 'Role name must be lowercase with hyphens only');
            isValid = false;
        }

        // Validate display name
        if (!formData.displayName) {
            setError('displayName', 'Display name is required');
            isValid = false;
        }

        // Validate permissions
        if (formData.permissions.length === 0) {
            setError('permissions', 'At least one permission must be selected');
            isValid = false;
        }

        return isValid;
    };

    /**
     * Handle form submission with loading state and error handling
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            showNotification('Please fix the errors in the form', 'error');
            return;
        }

        try {
            setSubmitting(true);

            if (id) {
                // Update existing role
                await roleService.update(id, formData);
                showNotification('Role updated successfully', 'success');
            } else {
                // Create new role
                await roleService.create(formData);
                showNotification('Role created successfully', 'success');
            }

            // Navigate back to roles list
            navigate('/app/roles');
        } catch (error) {
            // Handle API errors
            setApiErrors(error);
            showNotification(
                error.message || 'Failed to save role',
                'error'
            );
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Handle field changes and clear errors
     */
    const handleFieldChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error when user starts typing
        clearError(field);
    };

    /**
     * Show skeleton loader during initial load
     */
    if (loading) {
        return <RoleFormSkeleton />;
    }

    return (
        <ErrorBoundary>
            <Box sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
                p: { xs: 2, sm: 3, md: 4 }
            }}>
                {/* Breadcrumbs */}
                <Breadcrumbs sx={{ mb: 3 }}>
                    <Link
                        color="inherit"
                        href="/app"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate('/app');
                        }}
                    >
                        Home
                    </Link>
                    <Link
                        color="inherit"
                        href="/app/roles"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate('/app/roles');
                        }}
                    >
                        Roles
                    </Link>
                    <Typography color="text.primary">
                        {id ? 'Edit Role' : 'Create Role'}
                    </Typography>
                </Breadcrumbs>

                {/* Header */}
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
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {id ? 'Edit Role' : 'Create New Role'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                        {id ? 'Update role information and permissions' : 'Define a new role with specific permissions'}
                    </Typography>
                </Paper>

                {/* Form */}
                <Paper
                    component="form"
                    onSubmit={handleSubmit}
                    elevation={0}
                    sx={{
                        p: 4,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider'
                    }}
                >
                    {/* Basic Information */}
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                        Basic Information
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
                        <TextField
                            label="Role Name"
                            name="name"
                            value={formData.name}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            error={!!errors.name}
                            helperText={errors.name || 'Lowercase with hyphens (e.g., project-manager)'}
                            disabled={submitting || !!id} // Disable in edit mode
                            required
                            fullWidth
                        />

                        <TextField
                            label="Display Name"
                            name="displayName"
                            value={formData.displayName}
                            onChange={(e) => handleFieldChange('displayName', e.target.value)}
                            error={!!errors.displayName}
                            helperText={errors.displayName || 'Human-readable name (e.g., Project Manager)'}
                            disabled={submitting}
                            required
                            fullWidth
                        />

                        <TextField
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            error={!!errors.description}
                            helperText={errors.description}
                            disabled={submitting}
                            multiline
                            rows={3}
                            fullWidth
                        />
                    </Box>

                    {/* Permissions Section would go here */}
                    {/* See PermissionCategoryAccordion component */}

                    {/* Action Buttons */}
                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        justifyContent: 'flex-end',
                        mt: 4,
                        pt: 3,
                        borderTop: '1px solid',
                        borderColor: 'divider'
                    }}>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/app/roles')}
                            disabled={submitting}
                            sx={{ minWidth: 120 }}
                        >
                            Cancel
                        </Button>
                        <LoadingButton
                            type="submit"
                            variant="contained"
                            loading={submitting}
                            loadingText="Saving..."
                            disabled={hasAnyError()}
                            sx={{ minWidth: 120 }}
                        >
                            {id ? 'Update Role' : 'Create Role'}
                        </LoadingButton>
                    </Box>
                </Paper>
            </Box>
        </ErrorBoundary>
    );
};

export default RolePageTemplate;
