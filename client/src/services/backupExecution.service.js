import api from './api';

const backupExecutionService = {
    getAll: async (params) => {
        const response = await api.get('/backup-executions', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/backup-executions/${id}`);
        return response.data;
    },

    getByBackupId: async (backupId) => {
        const response = await api.get(`/backup-executions/backup/${backupId}`);
        return response.data;
    },

    execute: async (backupId) => {
        const response = await api.post(`/backup-executions/execute/${backupId}`);
        return response.data;
    },

    getLatest: async () => {
        const response = await api.get('/backup-executions/latest');
        return response.data;
    },
};

export default backupExecutionService;
