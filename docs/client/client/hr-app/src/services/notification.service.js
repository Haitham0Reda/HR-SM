import api from './api';

const notificationService = {
    getAll: async (params) => await api.get('/notifications', { params }),
    getById: async (id) => await api.get(`/notifications/${id}`),
    markAsRead: async (id) => await api.put(`/notifications/${id}/read`),
    markAllAsRead: async () => await api.put('/notifications/read-all'),
    delete: async (id) => await api.delete(`/notifications/${id}`),
};

export default notificationService;
