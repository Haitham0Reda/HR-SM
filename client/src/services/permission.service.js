import api from './api';

const permissionService = {
    getAll: async (params) => await api.get('/permissions', { params }),
    getById: async (id) => await api.get(`/permissions/${id}`),
    create: async (data) => await api.post('/permissions', data),
    update: async (id, data) => {
        const result = await api.put(`/permissions/${id}`, data);
        // If status is being updated, dispatch notification update event
        if (data && (data.status === 'approved' || data.status === 'rejected')) {
            // Add a small delay to ensure server has time to create notification
            await new Promise(resolve => setTimeout(resolve, 500));
            // Dispatch notification update event
            window.dispatchEvent(new CustomEvent('notificationUpdate'));
        }
        return result;
    },
    delete: async (id) => await api.delete(`/permissions/${id}`),
    approve: async (id, comments) => {
        const result = await api.post(`/permissions/${id}/approve`, { comments });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
    reject: async (id, reason) => {
        const result = await api.post(`/permissions/${id}/reject`, { reason });
        // Add a small delay to ensure server has time to create notification
        await new Promise(resolve => setTimeout(resolve, 500));
        // Dispatch notification update event
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
};

export default permissionService;