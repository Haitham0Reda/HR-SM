import api from './api';
import { withRetry } from '../utils/retryRequest';

/**
 * Role Service
 * 
 * Handles all API calls related to role management:
 * - CRUD operations for roles
 * - Permission management
 * - Role statistics
 * - System role synchronization
 * 
 * All methods include automatic retry logic for failed requests
 */
const roleService = {
    /**
     * Get all roles with optional filtering
     * @param {Object} params - Query parameters (type, search, etc.)
     * @returns {Promise} Array of roles
     */
    getAll: withRetry(
        async (params) => {
            return await api.get('/roles', { params });
        },
        { maxRetries: 2 }
    ),

    /**
     * Get a single role by ID
     * @param {string} id - Role ID
     * @returns {Promise} Role object with full details
     */
    getById: withRetry(
        async (id) => {
            return await api.get(`/roles/${id}`);
        },
        { maxRetries: 2 }
    ),

    /**
     * Create a new role
     * @param {Object} roleData - Role data (name, displayName, description, permissions)
     * @returns {Promise} Created role object
     */
    create: async (roleData) => {
        return await api.post('/roles', roleData);
    },

    /**
     * Update an existing role
     * @param {string} id - Role ID
     * @param {Object} roleData - Updated role data (displayName, description, permissions)
     * @returns {Promise} Updated role object
     */
    update: async (id, roleData) => {
        return await api.put(`/roles/${id}`, roleData);
    },

    /**
     * Delete a role
     * @param {string} id - Role ID
     * @returns {Promise} Deletion confirmation
     */
    delete: async (id) => {
        return await api.delete(`/roles/${id}`);
    },

    /**
     * Get role statistics
     * @returns {Promise} Statistics object (total, system, custom counts)
     */
    getStats: withRetry(
        async () => {
            return await api.get('/roles/stats');
        },
        { maxRetries: 2 }
    ),

    /**
     * Get all available permissions organized by categories
     * @returns {Promise} Permissions object with categories
     */
    getAllPermissions: withRetry(
        async () => {
            return await api.get('/roles/permissions');
        },
        { maxRetries: 2 }
    ),

    /**
     * Trigger synchronization of system roles from permission.system.js
     * @returns {Promise} Sync result
     */
    syncSystemRoles: async () => {
        return await api.post('/roles/sync');
    },

    /**
     * Get user count for a specific role
     * @param {string} id - Role ID
     * @returns {Promise} Object with userCount and sampleUsers
     */
    getUserCount: withRetry(
        async (id) => {
            return await api.get(`/roles/${id}/users/count`);
        },
        { maxRetries: 2 }
    ),
};

export default roleService;
