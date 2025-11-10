import api from './api';

const backupService = {
    getAll: async (params) => await api.get('/backups', { params }),
    getById: async (id) => await api.get(`/backups/${id}`),
    create: async (data) => await api.post('/backups', data),
    execute: async (id) => await api.post(`/backups/${id}/execute`),
    getHistory: async (id) => await api.get(`/backups/${id}/history`),
};

export default backupService;
