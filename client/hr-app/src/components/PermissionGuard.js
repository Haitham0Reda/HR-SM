/**
 * PermissionGuard Component
 * Conditionally renders children based on user permissions
 */
import React from 'react';
import PropTypes from 'prop-types';
import { usePermissions } from '../hooks/usePermissions';

/**
 * Guard component that checks permissions before rendering children
 * @param {Object} props - Component props
 * @param {string|Array} props.permission - Single permission or array of permissions to check
 * @param {string} props.mode - Check mode: 'any' (default) or 'all'
 * @param {React.ReactNode} props.children - Content to render if permission check passes
 * @param {React.ReactNode} props.fallback - Content to render if permission check fails
 * @returns {React.ReactNode} - Children or fallback based on permission check
 */
export const PermissionGuard = ({ 
    permission, 
    mode = 'any', 
    children, 
    fallback = null 
}) => {
    const { can, canAny, canAll } = usePermissions();

    // Handle single permission
    if (typeof permission === 'string') {
        return can(permission) ? children : fallback;
    }

    // Handle array of permissions
    if (Array.isArray(permission)) {
        const hasPermission = mode === 'all' 
            ? canAll(permission) 
            : canAny(permission);
        
        return hasPermission ? children : fallback;
    }

    // If no permission specified, don't render
    return fallback;
};

PermissionGuard.propTypes = {
    permission: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string)
    ]).isRequired,
    mode: PropTypes.oneOf(['any', 'all']),
    children: PropTypes.node.isRequired,
    fallback: PropTypes.node
};

export default PermissionGuard;
