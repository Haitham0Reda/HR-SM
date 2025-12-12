import api from './api';

const holidayService = {
    // Get holiday settings
    getSettings: async () => {
        return await api.get('/holidays/settings');
    },

    // Update holiday settings
    updateSettings: async (data) => {
        return await api.put('/holidays/settings', data);
    },

    // Add official holidays
    addHolidays: async (data) => {
        return await api.post('/holidays/official', data);
    },

    // Remove official holiday
    removeHoliday: async (holidayId) => {
        return await api.delete(`/holidays/official/${holidayId}`);
    },

    // Add weekend work days
    addWeekendWorkDays: async (data) => {
        return await api.post('/holidays/weekend-work', data);
    },

    // Remove weekend work day
    removeWeekendWorkDay: async (workDayId) => {
        return await api.delete(`/holidays/weekend-work/${workDayId}`);
    },

    // Get holiday suggestions
    getSuggestions: async (params) => {
        return await api.get('/holidays/suggestions', { params });
    },

    // Add holidays from suggestions
    addFromSuggestions: async (data) => {
        return await api.post('/holidays/suggestions', data);
    },

    // Check if date is working day
    checkWorkingDay: async (params) => {
        return await api.get('/holidays/check-working-day', { params });
    },

    // Get Egypt holidays from date-holidays package
    getEgyptHolidays: async (params) => {
        return await api.get('/holidays/egypt-holidays', { params });
    },

    // Import Egypt holidays to database
    importEgyptHolidays: async (data) => {
        return await api.post('/holidays/import-egypt-holidays', data);
    },
};

export default holidayService;