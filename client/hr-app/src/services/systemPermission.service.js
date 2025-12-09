import api from './api';

const systemPermissionService = {
    getAll: async () => {
        const response = await api.get('/system-permissions');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/system-permissions/${id}`);
        return response.data;
    },

    getByRole: async (role) => {
        const response = await api.get(`/system-permissions/role/${role}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/system-permissions', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/system-permissions/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/system-permissions/${id}`);
        return response.data;
    },

    checkPermission: async (userId, resource, action) => {
        const response = await api.post('/system-permissions/check', {
            userId,
            resource,
            action,
        });
        return response.data;
    },
};

export default systemPermissionService;
