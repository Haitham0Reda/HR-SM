import api from './api';

const dashboardService = {
    // Get dashboard configuration
    getConfig: async () => {
        return await api.get('/dashboard/config');
    },

    // Update dashboard configuration
    updateConfig: async (data) => {
        return await api.put('/dashboard/config', data);
    },

    // Get employee of the month
    getEmployeeOfTheMonth: async () => {
        return await api.get('/dashboard/employee-of-month');
    },

    // Set employee of the month
    setEmployeeOfTheMonth: async (data) => {
        return await api.post('/dashboard/employee-of-month', data);
    },

    // Get dashboard statistics
    getStatistics: async () => {
        return await api.get('/dashboard/statistics');
    },
};

export default dashboardService;
