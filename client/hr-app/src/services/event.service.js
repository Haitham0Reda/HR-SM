import api from './api';

const eventService = {
    getAll: async (params) => await api.get('/events', { params }),
    getById: async (id) => await api.get(`/events/${id}`),
    create: async (data) => await api.post('/events', data),
    update: async (id, data) => await api.put(`/events/${id}`, data),
    delete: async (id) => await api.delete(`/events/${id}`),
};

export default eventService;
