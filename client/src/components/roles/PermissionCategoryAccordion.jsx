import { useState, useMemo } from 'react';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Typography,
    Box,
    Tooltip,
    Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

/**
 * PermissionCategoryAccordion Component
 * 
 * Displays permissions for a category in an expandable accordion
 * Supports bulk selection with "Select All" checkbox
 * 
 * @param {Object} props
 * @param {string} props.category - Category name
 * @param {Array} props.permissions - Array of permission keys in this category
 * @param {Object} props.permissionDescriptions - Map of permission keys to descriptions
 * @param {Array} props.selectedPermissions - Array of currently selected permission keys
 * @param {Function} props.onPermissionToggle - Callback when individual permission is toggled
 * @param {Function} props.onSelectAll - Callback when "Select All" is clicked
 * @param {boolean} props.readOnly - If true, checkboxes are disabled
 */
const PermissionCategoryAccordion = ({
    category,
    permissions = [],
    permissionDescriptions = {},
    selectedPermissions = [],
    onPermissionToggle,
    onSelectAll,
    readOnly = false
}) => {
    const [expanded, setExpanded] = useState(false);

    // Calculate how many permissions in this category are selected
    const selectedCount = useMemo(() => {
        return permissions.filter(perm => selectedPermissions.includes(perm)).length;
    }, [permissions, selectedPermissions]);

    // Check if all permissions in this category are selected
    const allSelected = useMemo(() => {
        return permissions.length > 0 && selectedCount === permissions.length;
    }, [permissions.length, selectedCount]);

    // Check if some (but not all) permissions are selected
    const indeterminate = useMemo(() => {
        return selectedCount > 0 && selectedCount < permissions.length;
    }, [selectedCount, permissions.length]);

    const handleAccordionChange = (_event, isExpanded) => {
        setExpanded(isExpanded);
    };

    const handleSelectAll = (event) => {
        event.stopPropagation();
        if (onSelectAll) {
            onSelectAll(category, permissions, !allSelected);
        }
    };

    const handlePermissionToggle = (permission) => (event) => {
        if (onPermissionToggle) {
            onPermissionToggle(permission, event.target.checked);
        }
    };

    return (
        <Accordion 
            expanded={expanded} 
            onChange={handleAccordionChange}
            elevation={0}
            sx={{
                '&:before': {
                    display: 'none',
                },
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px !important',
                mb: 1.5,
                '&:first-of-type': {
                    borderRadius: '8px !important'
                },
                '&:last-of-type': {
                    borderRadius: '8px !important'
                }
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-label={`${category} permissions category`}
                aria-expanded={expanded}
                sx={{
                    borderRadius: 2,
                    '&:hover': {
                        backgroundColor: 'action.hover'
                    },
                    '&:focus': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: '2px'
                    },
                    '& .MuiAccordionSummary-content': {
                        my: 1.5
                    }
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                    {!readOnly && (
                        <Tooltip 
                            title={allSelected ? "Deselect all" : "Select all"}
                            enterDelay={300}
                            leaveDelay={200}
                        >
                            <Checkbox
                                checked={allSelected}
                                indeterminate={indeterminate}
                                onChange={handleSelectAll}
                                onClick={(e) => e.stopPropagation()}
                                disabled={readOnly}
                                sx={{ p: 0 }}
                                aria-label={`${allSelected ? 'Deselect' : 'Select'} all permissions in ${category} category`}
                            />
                        </Tooltip>
                    )}
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }} id={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}>
                        {category}
                    </Typography>
                    <Chip 
                        label={`${selectedCount}/${permissions.length}`}
                        size="small"
                        aria-label={`${selectedCount} of ${permissions.length} permissions selected in ${category}`}
                        sx={{
                            fontWeight: 600,
                            bgcolor: selectedCount > 0 
                                ? 'rgba(25, 118, 210, 0.1)' 
                                : 'transparent',
                            color: selectedCount > 0 ? 'primary.main' : 'text.secondary',
                            border: '1px solid',
                            borderColor: selectedCount > 0 
                                ? 'rgba(25, 118, 210, 0.3)' 
                                : 'divider'
                        }}
                    />
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, pb: 2 }} role="group" aria-labelledby={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}>
                <FormGroup>
                    {permissions.map((permission) => {
                        const description = permissionDescriptions[permission] || permission;
                        const isChecked = selectedPermissions.includes(permission);
                        
                        return (
                            <Tooltip 
                                key={permission} 
                                title={description}
                                placement="right"
                                arrow
                                enterDelay={300}
                                leaveDelay={200}
                                enterNextDelay={100}
                            >
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={isChecked}
                                            onChange={handlePermissionToggle(permission)}
                                            disabled={readOnly}
                                            size="small"
                                            aria-label={`${permission}: ${description}`}
                                            aria-describedby={`permission-desc-${permission.replace(/\./g, '-')}`}
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {permission}
                                            </Typography>
                                            <Typography 
                                                variant="caption" 
                                                color="text.secondary"
                                                sx={{ display: 'block', fontSize: '0.75rem' }}
                                                id={`permission-desc-${permission.replace(/\./g, '-')}`}
                                            >
                                                {description}
                                            </Typography>
                                        </Box>
                                    }
                                    sx={{
                                        ml: 0,
                                        mb: 0.5,
                                        p: 1.5,
                                        borderRadius: 2,
                                        border: '1px solid transparent',
                                        '&:hover': {
                                            backgroundColor: 'action.hover',
                                            borderColor: 'divider'
                                        },
                                        '&:focus-within': {
                                            backgroundColor: 'action.hover',
                                            borderColor: 'primary.main',
                                            outline: '2px solid',
                                            outlineColor: 'primary.main',
                                            outlineOffset: '2px'
                                        },
                                        transition: 'all 0.2s'
                                    }}
                                />
                            </Tooltip>
                        );
                    })}
                </FormGroup>
            </AccordionDetails>
        </Accordion>
    );
};

export default PermissionCategoryAccordion;
