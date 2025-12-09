import api from './api';

const securityService = {
    getSettings: async () => await api.get('/security/settings'),
    updateSettings: async (data) => await api.put('/security/settings', data),
    getAuditLogs: async (params) => await api.get('/security/audit', { params }),
    getPermissionAudit: async (params) => await api.get('/permission-audit', { params }),
};

export default securityService;
