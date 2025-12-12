/**
 * usePermissions Hook
 * Custom hook for checking user permissions in components
 */
import { useMemo } from 'react';
import { useAuth } from './useAuth';
import {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissionCategories,
    getPermissionsByRole,
    canAssignPermissions,
    canRoleHaveCustomPermissions,
    getAllAvailablePermissions
} from '../utils/permissions';

/**
 * Hook for checking user permissions
 * @returns {Object} - Permission checking functions and user permissions
 */
export const usePermissions = () => {
    const { user } = useAuth();

    // Memoize user permissions to avoid recalculation
    const userPermissions = useMemo(() => {
        if (!user) return [];
        return user.permissions || getPermissionsByRole(user.role);
    }, [user]);

    // Memoize permission categories
    const permissionCategories = useMemo(() => {
        return getUserPermissionCategories(user);
    }, [user]);

    // Check if user has a specific permission
    const can = (permission) => {
        return hasPermission(user, permission);
    };

    // Check if user has any of the specified permissions
    const canAny = (permissions) => {
        return hasAnyPermission(user, permissions);
    };

    // Check if user has all of the specified permissions
    const canAll = (permissions) => {
        return hasAllPermissions(user, permissions);
    };

    // Check if user is admin
    const isAdmin = user?.role === 'admin';

    // Check if user is HR
    const isHR = user?.role === 'hr' || user?.role === 'admin';

    // Check if user is Manager
    const isManager = user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin';

    // Check if user is Employee
    const isEmployee = user?.role === 'employee';

    // Check if user can assign permissions to roles
    const canAssign = canAssignPermissions(user);

    // Get all available permissions (for admin to assign)
    const allPermissions = useMemo(() => {
        return isAdmin ? getAllAvailablePermissions() : [];
    }, [isAdmin]);

    return {
        // Permission checking functions
        can,
        canAny,
        canAll,
        
        // Role checking
        isAdmin,
        isHR,
        isManager,
        isEmployee,
        
        // Admin functions
        canAssignPermissions: canAssign,
        canRoleHaveCustomPermissions,
        allAvailablePermissions: allPermissions,
        
        // User permissions and categories
        permissions: userPermissions,
        categories: permissionCategories,
        
        // User info
        user,
        role: user?.role
    };
};

export default usePermissions;
