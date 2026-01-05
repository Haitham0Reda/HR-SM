import api from './api';

// Force cache bust with unique identifier
const SERVICE_VERSION = '2026-01-03-vacations-' + Math.random().toString(36).substr(2, 9);
console.log(`🔄 Vacation Service v${SERVICE_VERSION} loading...`);

/**
 * Vacation Service
 * 
 * Handles all API calls related to vacation management including:
 * - CRUD operations for vacations
 * - Approval, rejection, and cancellation workflows
 * - File upload support for vacation attachments
 * - Vacation balance tracking
 * - Notification event dispatching
 */
const vacationService = {
    /**
     * Get all vacations with optional filtering
     * @param {Object} params - Query parameters for filtering (status, employee, department, vacationType, etc.)
     * @returns {Promise<Object>} Response containing vacations array and metadata
     */
    getAll: async (params) => {
        console.log(`🔍 [${SERVICE_VERSION}] Vacation Service - getAll called`);
        // Add cache-busting parameter to ensure fresh data
        const cacheBustParams = { 
            ...params, 
            _t: Date.now(),
            v: SERVICE_VERSION 
        };
        const data = await api.get('/vacations', { params: cacheBustParams });
        return data;
    },

    /**
     * Get a single vacation by ID
     * @param {string} id - Vacation ID
     * @returns {Promise<Object>} Vacation object
     */
    getById: async (id) => {
        const data = await api.get(`/vacations/${id}`);
        return data;
    },

    /**
     * Create a new vacation request
     * Supports FormData for file uploads (attachments)
     * @param {Object|FormData} data - Vacation data or FormData with files
     * @returns {Promise<Object>} Created vacation object
     */
    create: async (data) => {
        console.log(`🔍 [${SERVICE_VERSION}] Vacation Service - create called`);
        console.log(`🔍 [${SERVICE_VERSION}] Request data:`, data instanceof FormData ? 'FormData' : JSON.stringify(data, null, 2));
        
        try {
            // Check if data is FormData (for file uploads)
            const config = data instanceof FormData ? {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            } : {};
            const result = await api.post('/vacations', data, config);
            console.log(`✅ [${SERVICE_VERSION}] Vacation Service - create successful`);
            return result;
        } catch (error) {
            console.error(`❌ [${SERVICE_VERSION}] Vacation Service - create failed:`, error);
            throw error;
        }
    },

    /**
     * Update an existing vacation
     * @param {string} id - Vacation ID
     * @param {Object} data - Updated vacation data
     * @returns {Promise<Object>} Updated vacation object
     */
    update: async (id, data) => {
        const result = await api.put(`/vacations/${id}`, data);
        // If status is being updated, dispatch notification update event
        if (data && (data.status === 'approved' || data.status === 'rejected' || data.status === 'cancelled')) {
            // Add a small delay to ensure server has time to create notification
            await new Promise(resolve => setTimeout(resolve, 500));
            // Dispatch notification update event
            window.dispatchEvent(new CustomEvent('notificationUpdate'));
        }
        return result;
    },

    /**
     * Delete a vacation
     * @param {string} id - Vacation ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    delete: async (id) => {
        const result = await api.delete(`/vacations/${id}`);
        return result;
    },

    /**
     * Approve a vacation
     * @param {string} id - Vacation ID
     * @param {string} notes - Optional approval notes
     * @returns {Promise<Object>} Approved vacation object
     */
    approve: async (id, notes = '') => {
        const result = await api.post(`/vacations/${id}/approve`, { notes });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },

    /**
     * Reject a vacation
     * @param {string} id - Vacation ID
     * @param {string} reason - Rejection reason (required)
     * @returns {Promise<Object>} Rejected vacation object
     */
    reject: async (id, reason) => {
        const result = await api.post(`/vacations/${id}/reject`, { reason });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },

    /**
     * Cancel a vacation
     * @param {string} id - Vacation ID
     * @param {string} reason - Cancellation reason (required)
     * @returns {Promise<Object>} Cancelled vacation object
     */
    cancel: async (id, reason) => {
        const result = await api.post(`/vacations/${id}/cancel`, { reason });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
};

// Add version identifier
vacationService._version = SERVICE_VERSION;
console.log(`✅ Vacation Service v${SERVICE_VERSION} loaded successfully`);

export default vacationService;
