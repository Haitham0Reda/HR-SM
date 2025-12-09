/**
 * RoleGuard Component
 * Conditionally renders children based on user role
 */
import React from 'react';
import PropTypes from 'prop-types';
import { usePermissions } from '../hooks/usePermissions';

/**
 * Guard component that checks user role before rendering children
 * @param {Object} props - Component props
 * @param {string|Array} props.role - Single role or array of roles to check
 * @param {React.ReactNode} props.children - Content to render if role check passes
 * @param {React.ReactNode} props.fallback - Content to render if role check fails
 * @returns {React.ReactNode} - Children or fallback based on role check
 */
export const RoleGuard = ({ 
    role, 
    children, 
    fallback = null 
}) => {
    const { user } = usePermissions();

    if (!user) {
        return fallback;
    }

    // Handle single role
    if (typeof role === 'string') {
        return user.role === role ? children : fallback;
    }

    // Handle array of roles
    if (Array.isArray(role)) {
        return role.includes(user.role) ? children : fallback;
    }

    // If no role specified, don't render
    return fallback;
};

RoleGuard.propTypes = {
    role: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string)
    ]).isRequired,
    children: PropTypes.node.isRequired,
    fallback: PropTypes.node
};

export default RoleGuard;
