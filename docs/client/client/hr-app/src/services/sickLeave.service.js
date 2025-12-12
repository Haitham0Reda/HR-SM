import api from './api';

/**
 * SickLeave Service
 * 
 * Handles all API calls related to sick leave management including:
 * - CRUD operations for sick leaves
 * - Two-step approval workflow (supervisor then doctor)
 * - Medical document upload support
 * - Notification event dispatching
 */
const sickLeaveService = {
    /**
     * Get all sick leaves with optional filtering
     * @param {Object} params - Query parameters for filtering (status, employee, department, workflow status, etc.)
     * @returns {Promise<Object>} Response containing sick leaves array and metadata
     */
    getAll: async (params) => {
        const data = await api.get('/sick-leaves', { params });
        return data;
    },

    /**
     * Get a single sick leave by ID
     * @param {string} id - SickLeave ID
     * @returns {Promise<Object>} SickLeave object
     */
    getById: async (id) => {
        const data = await api.get(`/sick-leaves/${id}`);
        return data;
    },

    /**
     * Create a new sick leave request
     * Supports FormData for medical document uploads
     * @param {Object|FormData} data - SickLeave data or FormData with medical documents
     * @returns {Promise<Object>} Created sick leave object
     */
    create: async (data) => {
        // Check if data is FormData (for medical document uploads)
        const config = data instanceof FormData ? {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        } : {};
        const result = await api.post('/sick-leaves', data, config);
        return result;
    },

    /**
     * Update an existing sick leave
     * @param {string} id - SickLeave ID
     * @param {Object} data - Updated sick leave data
     * @returns {Promise<Object>} Updated sick leave object
     */
    update: async (id, data) => {
        const result = await api.put(`/sick-leaves/${id}`, data);
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
     * Delete a sick leave
     * @param {string} id - SickLeave ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    delete: async (id) => {
        const result = await api.delete(`/sick-leaves/${id}`);
        return result;
    },

    /**
     * Approve sick leave by supervisor (first step of two-step workflow)
     * Advances workflow to doctor review step
     * @param {string} id - SickLeave ID
     * @param {string} notes - Optional approval notes
     * @returns {Promise<Object>} Updated sick leave object
     */
    approveBySupervisor: async (id, notes = '') => {
        const result = await api.post(`/sick-leaves/${id}/approve-supervisor`, { notes });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },

    /**
     * Approve sick leave by doctor (second step of two-step workflow)
     * Completes the approval workflow
     * @param {string} id - SickLeave ID
     * @param {string} notes - Optional approval notes
     * @returns {Promise<Object>} Approved sick leave object
     */
    approveByDoctor: async (id, notes = '') => {
        const result = await api.post(`/sick-leaves/${id}/approve-doctor`, { notes });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },

    /**
     * Reject sick leave by supervisor
     * Ends the workflow with rejection
     * @param {string} id - SickLeave ID
     * @param {string} reason - Rejection reason (required)
     * @returns {Promise<Object>} Rejected sick leave object
     */
    rejectBySupervisor: async (id, reason) => {
        const result = await api.post(`/sick-leaves/${id}/reject-supervisor`, { reason });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },

    /**
     * Reject sick leave by doctor
     * Ends the workflow with rejection
     * @param {string} id - SickLeave ID
     * @param {string} reason - Rejection reason (required)
     * @returns {Promise<Object>} Rejected sick leave object
     */
    rejectByDoctor: async (id, reason) => {
        const result = await api.post(`/sick-leaves/${id}/reject-doctor`, { reason });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },

    /**
     * Get sick leaves pending doctor review
     * Only accessible by users with doctor role
     * @returns {Promise<Object>} Response containing sick leaves pending doctor review
     */
    getPendingDoctorReview: async () => {
        const data = await api.get('/sick-leaves/pending-doctor-review');
        return data;
    },
};

export default sickLeaveService;
