/**
 * Permission Validation Utility
 * 
 * Provides validation functions for role permissions
 */

import { PERMISSIONS } from '../platform/system/models/permission.system.js';

/**
 * Validate permissions array
 * @param {Array} permissions - Array of permission keys to validate
 * @returns {Object} - { valid: boolean, errors: Array, invalidPermissions: Array }
 */
export const validatePermissions = (permissions) => {
    const errors = [];
    const invalidPermissions = [];
    
    // Check if permissions is an array
    if (!Array.isArray(permissions)) {
        errors.push('Permissions must be an array');
        return { valid: false, errors, invalidPermissions };
    }
    
    // Check for empty array
    if (permissions.length === 0) {
        errors.push('At least one permission must be assigned');
        return { valid: false, errors, invalidPermissions };
    }
    
    // Check for invalid permission keys
    permissions.forEach(permission => {
        if (!PERMISSIONS[permission]) {
            invalidPermissions.push(permission);
        }
    });
    
    if (invalidPermissions.length > 0) {
        errors.push(`Invalid permissions: ${invalidPermissions.join(', ')}`);
    }
    
    // Check for duplicate permissions
    const uniquePermissions = [...new Set(permissions)];
    if (uniquePermissions.length !== permissions.length) {
        errors.push('Duplicate permissions detected');
    }
    
    // Check for non-string values
    const nonStringPermissions = permissions.filter(p => typeof p !== 'string');
    if (nonStringPermissions.length > 0) {
        errors.push('All permissions must be strings');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        invalidPermissions
    };
};

/**
 * Get all valid permission keys
 * @returns {Array} - Array of all valid permission keys
 */
export const getValidPermissions = () => {
    return Object.keys(PERMISSIONS);
};

/**
 * Check if a single permission is valid
 * @param {string} permission - Permission key to check
 * @returns {boolean} - True if permission exists
 */
export const isValidPermission = (permission) => {
    return Boolean(PERMISSIONS[permission]);
};

/**
 * Filter out invalid permissions from an array
 * @param {Array} permissions - Array of permission keys
 * @returns {Array} - Array with only valid permissions
 */
export const filterValidPermissions = (permissions) => {
    if (!Array.isArray(permissions)) {
        return [];
    }
    return permissions.filter(p => PERMISSIONS[p]);
};

/**
 * Get permission description
 * @param {string} permission - Permission key
 * @returns {string} - Permission description or empty string
 */
export const getPermissionDescription = (permission) => {
    return PERMISSIONS[permission] || '';
};
