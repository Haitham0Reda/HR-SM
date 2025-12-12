import api from './api';

const permissionAuditService = {
    getAll: async (params) => {
        const response = await api.get('/permission-audits', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/permission-audits/${id}`);
        return response.data;
    },

    getByUser: async (userId) => {
        const response = await api.get(`/permission-audits/user/${userId}`);
        return response.data;
    },

    getByResource: async (resource) => {
        const response = await api.get(`/permission-audits/resource/${resource}`);
        return response.data;
    },
};

export default permissionAuditService;
