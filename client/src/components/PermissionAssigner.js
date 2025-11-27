/**
 * PermissionAssigner Component
 * Allows admins to assign permissions to roles
 * Only accessible by admin users
 */
import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Typography,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    Alert,
    Button,
    Grid
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { usePermissions } from '../hooks/usePermissions';
import { getPermissionCategories } from '../utils/permissions';

/**
 * Component for assigning permissions to a role
 * @param {Object} props - Component props
 * @param {Array} props.selectedPermissions - Currently selected permissions
 * @param {Function} props.onChange - Callback when permissions change
 * @param {string} props.role - Role being edited (to check if admin)
 * @param {boolean} props.disabled - Whether the component is disabled
 */
export const PermissionAssigner = ({
    selectedPermissions = [],
    onChange,
    role = '',
    disabled = false
}) => {
    const { isAdmin, canAssignPermissions } = usePermissions();
    const [expandedCategories, setExpandedCategories] = useState({});

    const categories = useMemo(() => getPermissionCategories(), []);

    // Check if user can assign permissions
    if (!isAdmin && !canAssignPermissions) {
        return (
            <Alert severity="error">
                You do not have permission to assign permissions to roles.
            </Alert>
        );
    }

    // Admin role cannot be modified
    if (role === 'admin') {
        return (
            <Alert severity="info">
                Admin role has all permissions by default and cannot be modified.
            </Alert>
        );
    }

    // Handle category expansion
    const handleCategoryToggle = (categoryKey) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryKey]: !prev[categoryKey]
        }));
    };

    // Handle permission toggle
    const handlePermissionToggle = (permission) => {
        if (disabled) return;

        const newPermissions = selectedPermissions.includes(permission)
            ? selectedPermissions.filter(p => p !== permission)
            : [...selectedPermissions, permission];

        onChange(newPermissions);
    };

    // Handle select all in category
    const handleSelectAllInCategory = (categoryPermissions) => {
        if (disabled) return;

        const allSelected = categoryPermissions.every(p => 
            selectedPermissions.includes(p)
        );

        let newPermissions;
        if (allSelected) {
            // Deselect all in category
            newPermissions = selectedPermissions.filter(p => 
                !categoryPermissions.includes(p)
            );
        } else {
            // Select all in category
            const toAdd = categoryPermissions.filter(p => 
                !selectedPermissions.includes(p)
            );
            newPermissions = [...selectedPermissions, ...toAdd];
        }

        onChange(newPermissions);
    };

    // Handle select all permissions
    const handleSelectAll = () => {
        if (disabled) return;

        const allPermissions = Object.values(categories)
            .flatMap(cat => cat.permissions);

        if (selectedPermissions.length === allPermissions.length) {
            onChange([]);
        } else {
            onChange(allPermissions);
        }
    };

    // Calculate statistics
    const totalPermissions = Object.values(categories)
        .reduce((sum, cat) => sum + cat.permissions.length, 0);
    const selectedCount = selectedPermissions.length;

    return (
        <Box>
            {/* Header with statistics */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Assign Permissions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Select permissions for this role
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Chip 
                        label={`${selectedCount} / ${totalPermissions} selected`}
                        color={selectedCount > 0 ? 'primary' : 'default'}
                        sx={{ mb: 1 }}
                    />
                    <Box>
                        <Button
                            size="small"
                            onClick={handleSelectAll}
                            disabled={disabled}
                        >
                            {selectedCount === totalPermissions ? 'Deselect All' : 'Select All'}
                        </Button>
                    </Box>
                </Box>
            </Box>

            {/* Permission categories */}
            <Box>
                {Object.entries(categories).map(([categoryKey, category]) => {
                    const categoryPermissions = category.permissions;
                    const selectedInCategory = categoryPermissions.filter(p => 
                        selectedPermissions.includes(p)
                    ).length;
                    const allSelectedInCategory = selectedInCategory === categoryPermissions.length;

                    return (
                        <Accordion
                            key={categoryKey}
                            expanded={expandedCategories[categoryKey] || false}
                            onChange={() => handleCategoryToggle(categoryKey)}
                            disabled={disabled}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                                    <Checkbox
                                        checked={allSelectedInCategory}
                                        indeterminate={selectedInCategory > 0 && !allSelectedInCategory}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectAllInCategory(categoryPermissions);
                                        }}
                                        disabled={disabled}
                                    />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle1">
                                            {category.label}
                                            {category.adminOnly && (
                                                <Chip 
                                                    label="Admin Only" 
                                                    size="small" 
                                                    color="error" 
                                                    sx={{ ml: 1 }}
                                                />
                                            )}
                                        </Typography>
                                        {category.description && (
                                            <Typography variant="caption" color="text.secondary">
                                                {category.description}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Chip
                                        label={`${selectedInCategory}/${categoryPermissions.length}`}
                                        size="small"
                                        color={selectedInCategory > 0 ? 'primary' : 'default'}
                                    />
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <FormGroup>
                                    <Grid container spacing={1}>
                                        {categoryPermissions.map(permission => (
                                            <Grid item xs={12} sm={6} md={4} key={permission}>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={selectedPermissions.includes(permission)}
                                                            onChange={() => handlePermissionToggle(permission)}
                                                            disabled={disabled}
                                                        />
                                                    }
                                                    label={
                                                        <Typography variant="body2">
                                                            {permission}
                                                        </Typography>
                                                    }
                                                />
                                            </Grid>
                                        ))}
                                    </Grid>
                                </FormGroup>
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
            </Box>

            {/* Footer info */}
            <Box sx={{ mt: 3 }}>
                <Alert severity="info">
                    <Typography variant="body2">
                        <strong>Note:</strong> Admin role always has all permissions and cannot be modified.
                        Other roles can be customized with any combination of permissions.
                    </Typography>
                </Alert>
            </Box>
        </Box>
    );
};

PermissionAssigner.propTypes = {
    selectedPermissions: PropTypes.arrayOf(PropTypes.string),
    onChange: PropTypes.func.isRequired,
    role: PropTypes.string,
    disabled: PropTypes.bool
};

export default PermissionAssigner;
