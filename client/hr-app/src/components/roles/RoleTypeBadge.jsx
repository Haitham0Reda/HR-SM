import { Chip, alpha } from '@mui/material';
import { AdminPanelSettings as AdminIcon, Security as SecurityIcon } from '@mui/icons-material';

/**
 * RoleTypeBadge Component
 * 
 * A reusable badge component to display role type (System vs Custom)
 * with consistent styling across all views.
 * 
 * @param {Object} props
 * @param {boolean} props.isSystemRole - Whether the role is a system role
 * @param {string} props.size - Size of the badge ('small' | 'medium')
 * @param {boolean} props.showIcon - Whether to show an icon in the badge
 * @param {string} props.variant - Variant of the badge ('filled' | 'outlined')
 */
const RoleTypeBadge = ({ 
    isSystemRole, 
    size = 'small', 
    showIcon = false,
    variant = 'filled'
}) => {
    const isSystem = Boolean(isSystemRole);
    
    // Color configuration
    const colors = {
        system: {
            bg: alpha('#d32f2f', 0.1),
            color: 'error.main',
            border: alpha('#d32f2f', 0.3)
        },
        custom: {
            bg: alpha('#2e7d32', 0.1),
            color: 'success.main',
            border: alpha('#2e7d32', 0.3)
        }
    };
    
    const colorScheme = isSystem ? colors.system : colors.custom;
    const label = isSystem ? 'System' : 'Custom';
    const icon = showIcon ? (isSystem ? <AdminIcon /> : <SecurityIcon />) : undefined;
    
    return (
        <Chip
            icon={icon}
            label={label}
            size={size}
            aria-label={`Role type: ${isSystem ? 'System Role' : 'Custom Role'}`}
            sx={{
                fontWeight: 600,
                bgcolor: variant === 'filled' ? colorScheme.bg : 'transparent',
                color: colorScheme.color,
                border: '1px solid',
                borderColor: colorScheme.border,
                fontSize: size === 'small' ? { xs: '0.7rem', md: '0.8125rem' } : '0.875rem',
                ...(variant === 'outlined' && {
                    bgcolor: 'transparent',
                    borderWidth: '1.5px'
                })
            }}
        />
    );
};

export default RoleTypeBadge;
