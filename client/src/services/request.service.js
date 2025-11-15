import api from './api';

const requestService = {
    getAll: async (params) => await api.get('/requests', { params }),
    getById: async (id) => await api.get(`/requests/${id}`),
    create: async (data) => await api.post('/requests', data),
    update: async (id, data) => {
        const result = await api.put(`/requests/${id}`, data);
        // If status is being updated, dispatch notification update event
        if (data && (data.status === 'approved' || data.status === 'rejected')) {
            // Add a small delay to ensure server has time to create notification
            await new Promise(resolve => setTimeout(resolve, 500));
            // Dispatch notification update event
            window.dispatchEvent(new CustomEvent('notificationUpdate'));
        }
        return result;
    },
    delete: async (id) => await api.delete(`/requests/${id}`),
    // Fixed: Use update method with status instead of non-existent endpoints
    approve: async (id) => {
        const result = await api.put(`/requests/${id}`, { status: 'approved' });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
    reject: async (id, reason) => {
        const result = await api.put(`/requests/${id}`, { status: 'rejected', comments: reason });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
};

export default requestService;