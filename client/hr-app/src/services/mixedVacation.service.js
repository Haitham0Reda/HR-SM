import api from './api';

const mixedVacationService = {
    getAll: async (params = {}) => {
        const response = await api.get('/mixed-vacations', { params });
        return response;
    },

    getById: async (id) => {
        const response = await api.get(`/mixed-vacations/${id}`);
        return response;
    },

    create: async (data) => {
        const response = await api.post('/mixed-vacations', data);
        return response;
    },

    update: async (id, data) => {
        const response = await api.put(`/mixed-vacations/${id}`, data);
        return response;
    },

    delete: async (id) => {
        const response = await api.delete(`/mixed-vacations/${id}`);
        return response;
    },

    getActive: async () => {
        const response = await api.get('/mixed-vacations/active');
        return response;
    },

    getUpcoming: async (days = 30) => {
        const response = await api.get('/mixed-vacations/upcoming', { params: { days } });
        return response;
    },

    activate: async (id) => {
        const response = await api.post(`/mixed-vacations/${id}/activate`);
        return response;
    },

    cancel: async (id) => {
        const response = await api.post(`/mixed-vacations/${id}/cancel`);
        return response;
    },

    applyToEmployee: async (id, employeeId) => {
        const response = await api.post(`/mixed-vacations/${id}/apply/${employeeId}`);
        return response;
    },

    applyToAll: async (id) => {
        const response = await api.post(`/mixed-vacations/${id}/apply-all`);
        return response;
    },

    testOnEmployee: async (id, employeeId) => {
        const response = await api.post(`/mixed-vacations/${id}/test/${employeeId}`);
        return response;
    },

    getPolicyBreakdown: async (id, employeeId) => {
        const response = await api.get(`/mixed-vacations/${id}/breakdown/${employeeId}`);
        return response;
    },

    getEmployeeApplications: async (employeeId) => {
        const response = await api.get(`/mixed-vacations/employee/${employeeId}/applications`);
        return response;
    },
};

export default mixedVacationService;
