import api from './api';

/**
 * Overtime Service
 * 
 * Handles all API calls related to overtime management including:
 * - CRUD operations for overtime records
 * - Approval and rejection workflows
 * - Compensation type tracking
 * - Notification event dispatching
 */
const overtimeService = {
    /**
     * Get all overtime records with optional filtering
     * @param {Object} params - Query parameters for filtering (status, employee, department, compensationType, date, etc.)
     * @returns {Promise<Object>} Response containing overtime records array and metadata
     */
    getAll: async (params) => {
        const data = await api.get('/overtime', { params });
        return data;
    },

    /**
     * Get a single overtime record by ID
     * @param {string} id - Overtime ID
     * @returns {Promise<Object>} Overtime object
     */
    getById: async (id) => {
        const data = await api.get(`/overtime/${id}`);
        return data;
    },

    /**
     * Create a new overtime record
     * @param {Object} data - Overtime data (date, startTime, endTime, duration, reason, compensationType)
     * @returns {Promise<Object>} Created overtime object
     */
    create: async (data) => {
        const result = await api.post('/overtime', data);
        return result;
    },

    /**
     * Update an existing overtime record
     * @param {string} id - Overtime ID
     * @param {Object} data - Updated overtime data
     * @returns {Promise<Object>} Updated overtime object
     */
    update: async (id, data) => {
        const result = await api.put(`/overtime/${id}`, data);
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
     * Delete an overtime record
     * @param {string} id - Overtime ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    delete: async (id) => {
        const result = await api.delete(`/overtime/${id}`);
        return result;
    },

    /**
     * Approve an overtime record
     * @param {string} id - Overtime ID
     * @param {string} notes - Optional approval notes
     * @returns {Promise<Object>} Approved overtime object
     */
    approve: async (id, notes = '') => {
        const result = await api.post(`/overtime/${id}/approve`, { notes });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },

    /**
     * Reject an overtime record
     * @param {string} id - Overtime ID
     * @param {string} reason - Rejection reason (required)
     * @returns {Promise<Object>} Rejected overtime object
     */
    reject: async (id, reason) => {
        const result = await api.post(`/overtime/${id}/reject`, { reason });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
};

export default overtimeService;
