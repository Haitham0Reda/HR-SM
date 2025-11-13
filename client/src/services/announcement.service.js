import api from './api';

const announcementService = {
    getAll: async (params) => {
        console.log('Fetching announcements from API...');
        const response = await api.get('/announcements', { params });
        console.log('API response for announcements:', response);
        return response;
    },
    getById: async (id) => await api.get(`/announcements/${id}`),
    create: async (data) => await api.post('/announcements', data),
    update: async (id, data) => await api.put(`/announcements/${id}`, data),
    delete: async (id) => await api.delete(`/announcements/${id}`),
};

export default announcementService;
