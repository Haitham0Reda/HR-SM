/**
 * useModuleNavigation Hook
 * 
 * Provides utilities for filtering navigation items based on enabled modules.
 */

import { useCallback } from 'react';
import { useModules } from '../contexts/ModuleContext';

// Map navigation item IDs to module IDs
const MODULE_MAPPING = {
    // Tasks module
    'tasks': 'tasks',
    
    // Email Service module
    'email-settings': 'email-service',
    
    // Payroll module
    'payroll': 'payroll',
    
    // Documents module
    'documents': 'documents',
    'hard-copies': 'documents',
    'templates': 'documents',
    
    // Reports module
    'reports': 'reports',
    'analytics': 'reports',
    
    // Notifications module
    'notifications': 'notifications',
    
    // Clinic module
    'clinic': 'clinic',
    'medical-profiles': 'clinic',
    'appointments': 'clinic',
    'prescriptions': 'clinic',
    
    // Core HR - always enabled (no module key needed)
    'dashboard': null,
    'departments': null,
    'positions': null,
    'users': null,
    'attendance': null,
    'missions': null,
    'sick-leaves': null,
    'permissions': null,
    'overtime': null,
    'vacation-requests': null,
    'requests': null,
    'holidays': null,
    'vacations': null,
    'roles': null,
    'settings': null,
    'security': null,
    'backups': null,
    'resigned': null,
    'announcements': null,
    'events': null,
    'surveys': null,
};

export const useModuleNavigation = () => {
    const { isModuleEnabled } = useModules();

    /**
     * Get module ID for a navigation item
     * @param {string} itemId - Navigation item ID
     * @returns {string|null} - Module ID or null if Core HR
     */
    const getModuleForItem = useCallback((itemId) => {
        return MODULE_MAPPING[itemId] || null;
    }, []);

    /**
     * Check if a navigation item should be shown
     * @param {string} itemId - Navigation item ID
     * @returns {boolean} - Whether the item should be shown
     */
    const shouldShowItem = useCallback((itemId) => {
        const moduleId = getModuleForItem(itemId);
        
        // If no module ID, it's Core HR - always show
        if (!moduleId) {
            return true;
        }
        
        // Check if module is enabled
        return isModuleEnabled(moduleId);
    }, [getModuleForItem, isModuleEnabled]);

    /**
     * Check if a navigation item should be locked (shown but disabled)
     * @param {string} itemId - Navigation item ID
     * @returns {boolean} - Whether the item should be locked
     */
    const isItemLocked = useCallback((itemId) => {
        const moduleId = getModuleForItem(itemId);
        
        // If no module ID, it's Core HR - never locked
        if (!moduleId) {
            return false;
        }
        
        // Item is locked if module is not enabled
        return !isModuleEnabled(moduleId);
    }, [getModuleForItem, isModuleEnabled]);

    /**
     * Filter navigation items based on enabled modules
     * @param {Array} items - Navigation items array
     * @returns {Array} - Filtered navigation items
     */
    const filterNavigationItems = useCallback((items) => {
        return items.filter(item => {
            // If item has an ID, check if it should be shown
            if (item.id) {
                return shouldShowItem(item.id);
            }
            
            // If item has children, filter them recursively
            if (item.children) {
                const filteredChildren = filterNavigationItems(item.children);
                // Only show parent if it has visible children
                return filteredChildren.length > 0;
            }
            
            // Show items without ID or children (dividers, headers)
            return true;
        }).map(item => {
            // If item has children, filter them
            if (item.children) {
                return {
                    ...item,
                    children: filterNavigationItems(item.children)
                };
            }
            return item;
        });
    }, [shouldShowItem]);

    return {
        getModuleForItem,
        shouldShowItem,
        isItemLocked,
        filterNavigationItems,
    };
};

export default useModuleNavigation;
