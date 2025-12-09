import api from './api';

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
        const data = await api.get('/vacations', { params });
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
        // Check if data is FormData (for file uploads)
        const config = data instanceof FormData ? {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        } : {};
        const result = await api.post('/vacations', data, config);
        return result;
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

export default vacationService;
