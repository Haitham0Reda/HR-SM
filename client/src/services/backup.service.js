import api from './api';

const backupService = {
    // Get all backup configurations
    getAll: async (params) => {
        return await api.get('/backups', { params });
    },
    
    // Get backup by ID
    getById: async (id) => {
        return await api.get(`/backups/${id}`);
    },
    
    // Create new backup configuration
    create: async (data) => {
        return await api.post('/backups', data);
    },
    
    // Update backup configuration
    update: async (id, data) => {
        return await api.put(`/backups/${id}`, data);
    },
    
    // Delete backup configuration
    delete: async (id) => {
        return await api.delete(`/backups/${id}`);
    },
    
    // Execute backup manually
    execute: async (id) => {
        return await api.post(`/backups/${id}/execute`);
    },
    
    // Get execution history
    getHistory: async (id, params) => {
        return await api.get(`/backups/${id}/history`, { params });
    },
    
    // Get backup statistics
    getStatistics: async (id, days = 30) => {
        return await api.get(`/backups/${id}/statistics`, { params: { days } });
    },
    
    // Restore from backup
    restore: async (executionId) => {
        return await api.post(`/backups/restore/${executionId}`);
    },
    
    // Update schedule settings
    updateSchedule: async (id, scheduleData) => {
        return await api.put(`/backups/${id}`, {
            schedule: {
                enabled: scheduleData.autoBackup,
                frequency: scheduleData.frequency,
                time: scheduleData.time
            },
            settings: {
                retention: {
                    enabled: true,
                    days: scheduleData.retention
                }
            }
        });
    }
};

export default backupService;
