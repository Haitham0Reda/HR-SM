import api from './api';

// Force cache bust with unique identifier
const SERVICE_VERSION = '2026-01-03-missions-' + Math.random().toString(36).substr(2, 9);
// console.log(`🔄 Mission Service v${SERVICE_VERSION} loading...`);

/**
 * Mission Service
 * 
 * Handles all API calls related to mission management including:
 * - CRUD operations for missions
 * - Approval and rejection workflows
 * - File upload support for mission attachments
 * - Notification event dispatching
 */
const missionService = {
    /**
     * Get all missions with optional filtering
     * @param {Object} params - Query parameters for filtering (status, employee, department, etc.)
     * @returns {Promise<Object>} Response containing missions array and metadata
     */
    getAll: async (params) => {
        // console.log(`🔍 [${SERVICE_VERSION}] Mission Service - getAll called`);
        // Add cache-busting parameter to ensure fresh data
        const cacheBustParams = { 
            ...params, 
            _t: Date.now(),
            v: SERVICE_VERSION,
            _r: Math.random().toString(36).substr(2, 9) // Additional randomness
        };
        console.log('🔍 Cache-bust params:', cacheBustParams);
        const data = await api.get('/missions', { params: cacheBustParams });
        console.log('🔍 API response received:', data);
        return data;
    },

    /**
     * Get a single mission by ID
     * @param {string} id - Mission ID
     * @returns {Promise<Object>} Mission object
     */
    getById: async (id) => {
        const data = await api.get(`/missions/${id}`);
        return data;
    },

    /**
     * Create a new mission
     * Supports FormData for file uploads (attachments)
     * @param {Object|FormData} data - Mission data or FormData with files
     * @returns {Promise<Object>} Created mission object
     */
    create: async (data) => {
        // console.log(`🔍 [${SERVICE_VERSION}] Mission Service - create called`);
        // console.log(`🔍 [${SERVICE_VERSION}] Request data:`, data instanceof FormData ? 'FormData' : JSON.stringify(data, null, 2));
        
        try {
            // Check if data is FormData (for file uploads)
            const config = data instanceof FormData ? {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            } : {};
            const result = await api.post('/missions', data, config);
            // console.log(`✅ [${SERVICE_VERSION}] Mission Service - create successful`);
            return result;
        } catch (error) {
            console.error(`❌ [${SERVICE_VERSION}] Mission Service - create failed:`, error);
            throw error;
        }
    },

    /**
     * Update an existing mission
     * @param {string} id - Mission ID
     * @param {Object} data - Updated mission data
     * @returns {Promise<Object>} Updated mission object
     */
    update: async (id, data) => {
        // console.log(`🔍 [${SERVICE_VERSION}] Mission Service - update called for ID: ${id}`);
        const result = await api.put(`/missions/${id}`, data);
        // If status is being updated, dispatch notification update event
        if (data && (data.status === 'approved' || data.status === 'rejected')) {
            // Add a small delay to ensure server has time to create notification
            await new Promise(resolve => setTimeout(resolve, 500));
            // Dispatch notification update event
            window.dispatchEvent(new CustomEvent('notificationUpdate'));
        }
        // console.log(`✅ [${SERVICE_VERSION}] Mission Service - update successful`);
        return result;
    },

    /**
     * Delete a mission
     * @param {string} id - Mission ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    delete: async (id) => {
        const result = await api.delete(`/missions/${id}`);
        return result;
    },

    /**
     * Approve a mission
     * @param {string} id - Mission ID
     * @param {string} notes - Optional approval notes
     * @returns {Promise<Object>} Approved mission object
     */
    approve: async (id, notes = '') => {
        const result = await api.post(`/missions/${id}/approve`, { notes });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },

    /**
     * Reject a mission
     * @param {string} id - Mission ID
     * @param {string} reason - Rejection reason (required)
     * @returns {Promise<Object>} Rejected mission object
     */
    reject: async (id, reason) => {
        const result = await api.post(`/missions/${id}/reject`, { reason });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
};

// Add version identifier
missionService._version = SERVICE_VERSION;
// console.log(`✅ Mission Service v${SERVICE_VERSION} loaded successfully`);

export default missionService;
