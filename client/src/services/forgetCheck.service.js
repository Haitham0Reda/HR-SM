import api from './api';

const forgetCheckService = {
    getAll: async (params) => {
        const data = await api.get('/forget-checks', { params });
        return data;
    },
    getById: async (id) => {
        const data = await api.get(`/forget-checks/${id}`);
        return data;
    },
    create: async (data) => {
        const result = await api.post('/forget-checks', data);
        return result;
    },
    update: async (id, data) => {
        const result = await api.put(`/forget-checks/${id}`, data);
        return result;
    },
    delete: async (id) => {
        const result = await api.delete(`/forget-checks/${id}`);
        return result;
    },
    approve: async (id) => {
        const result = await api.post(`/forget-checks/${id}/approve`);
        await new Promise(resolve => setTimeout(resolve, 500));
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    },
    reject: async (id, reason) => {
        const result = await api.post(`/forget-checks/${id}/reject`, { reason });
        await new Promise(resolve => setTimeout(resolve, 500));
        window.dispatchEvent(new CustomEvent('notificationUpdate'));
        return result;
    }
};

export default forgetCheckService;
