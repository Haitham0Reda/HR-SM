import api from './api';

// Force cache bust with unique identifier
const SERVICE_VERSION = '2026-01-03-permissions-' + Math.random().toString(36).substr(2, 9);
// console.log(`🔄 Permission Service v${SERVICE_VERSION} loading...`);

/**
 * Permissions Service
 * 
 * Handles all API calls related to permissions management including:
 * - CRUD operations for permissions (late arrivals and early departures)
 * - Approval and rejection workflows
 * - Time-based tracking and validation
 * - Notification event dispatching
 */
const permissionService = {
    /**
     * Get all permissions with optional filtering
     * @param {Object} params - Query parameters for filtering (status, employee, department, permissionType, date, etc.)
     * @returns {Promise<Object>} Response containing permissions array and metadata
     */
    getAll: async (params) => {
        // console.log(`🔍 [${SERVICE_VERSION}] Permission Service - getAll called`);
        // Add cache-busting parameter to ensure fresh data
        const cacheBustParams = { 
            ...params, 
            _t: Date.now(),
            v: SERVICE_VERSION 
        };
        const data = await api.get('/permission-requests', { params: cacheBustParams });
        return data;
    },

    /**
     * Get a single permission by ID
     * @param {string} id - Permission ID
     * @returns {Promise<Object>} Permission object
     */
    getById: async (id) => {
        const data = await api.get(`/permission-requests/${id}`);
        return data;
    },

    /**
     * Create a new permission request
     * @param {Object} data - Permission data (permissionType, date, time, duration, reason)
     * @returns {Promise<Object>} Created permission object
     */
    create: async (data) => {
        // console.log(`🔍 [${SERVICE_VERSION}] Permission Service - create called`);
        // console.log(`🔍 [${SERVICE_VERSION}] Request data:`, JSON.stringify(data, null, 2));
        
        try {
            const result = await api.post('/permission-requests', data);
            // console.log(`✅ [${SERVICE_VERSION}] Permission Service - create successful`);
            return result;
        } catch (error) {
            console.error(`❌ [${SERVICE_VERSION}] Permission Service - create failed:`, error);
            throw error;
        }
    },

    /**
     * Update an existing permission
     * @param {string} id - Permission ID
     * @param {Object} data - Updated permission data
     * @returns {Promise<Object>} Updated permission object
     */
    update: async (id, data) => {
        const result = await api.put(`/permission-requests/${id}`, data);
        // If status is being updated, dispatch notification update event
        if (data && (data.status === 'approved' || data.status === 'rejected')) {
            // Add a small delay to ensure server has time to create notification
            await new Promise(resolve => setTimeout(resolve, 500));
            // Dispatch notification update event
            window.dispatchEvent(new CustomEvent('notificationUpdate'));
        }
        return result;
    },

    /**
     * Delete a permission
     * @param {string} id - Permission ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    delete: async (id) => {
        const result = await api.delete(`/permission-requests/${id}`);
        return result;
    },

    /**
     * Approve a permission
     * @param {string} id - Permission ID
     * @param {string} notes - Optional approval notes
     * @returns {Promise<Object>} Approved permission object
     */
    approve: async (id, notes = '') => {
        const result = await api.post(`/permission-requests/${id}/approve`, { notes });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },

    /**
     * Reject a permission
     * @param {string} id - Permission ID
     * @param {string} reason - Rejection reason (required)
     * @returns {Promise<Object>} Rejected permission object
     */
    reject: async (id, reason) => {
        const result = await api.post(`/permission-requests/${id}/reject`, { reason });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
};

// Add version identifier
permissionService._version = SERVICE_VERSION;
// console.log(`✅ Permission Service v${SERVICE_VERSION} loaded successfully`);

export default permissionService;