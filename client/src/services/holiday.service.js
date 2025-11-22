import api from './api';
import authService from './auth.service';

// Helper function to get campus ID from current user
const getCampusId = () => {
    const user = authService.getCurrentUser();
    // Handle different possible structures for school data
    if (user?.school?._id) {
        return user.school._id;
    } else if (user?.school) {
        return user.school;
    } else if (user?.schoolId) {
        return user.schoolId;
    }
    return null;
};

// Helper function to ensure campus ID is available
const ensureCampusId = () => {
    const campusId = getCampusId();
    if (!campusId) {
        throw new Error('Campus ID not found. Please login again.');
    }
    return campusId;
};

const holidayService = {
    // Get holiday settings for campus
    getSettings: async () => {
        const campusId = ensureCampusId();
        return await api.get(`/holidays/campus/${campusId}`);
    },
    
    // Update holiday settings
    updateSettings: async (data) => {
        const campusId = ensureCampusId();
        return await api.put(`/holidays/campus/${campusId}`, data);
    },
    
    // Add official holidays
    addHolidays: async (data) => {
        const campusId = ensureCampusId();
        return await api.post(`/holidays/campus/${campusId}/official`, data);
    },
    
    // Remove official holiday
    removeHoliday: async (holidayId) => {
        const campusId = ensureCampusId();
        return await api.delete(`/holidays/campus/${campusId}/official/${holidayId}`);
    },
    
    // Add weekend work days
    addWeekendWorkDays: async (data) => {
        const campusId = ensureCampusId();
        return await api.post(`/holidays/campus/${campusId}/weekend-work`, data);
    },
    
    // Remove weekend work day
    removeWeekendWorkDay: async (workDayId) => {
        const campusId = ensureCampusId();
        return await api.delete(`/holidays/campus/${campusId}/weekend-work/${workDayId}`);
    },
    
    // Get holiday suggestions
    getSuggestions: async (params) => {
        const campusId = ensureCampusId();
        return await api.get(`/holidays/campus/${campusId}/suggestions`, { params });
    },
    
    // Add holidays from suggestions
    addFromSuggestions: async (data) => {
        const campusId = ensureCampusId();
        return await api.post(`/holidays/campus/${campusId}/suggestions`, data);
    },
    
    // Check if date is working day
    checkWorkingDay: async (params) => {
        const campusId = ensureCampusId();
        return await api.get(`/holidays/campus/${campusId}/check-working-day`, { params });
    },
    
    // Get Egypt holidays from date-holidays package
    getEgyptHolidays: async (params) => {
        return await api.get('/holidays/egypt-holidays', { params });
    },
    
    // Import Egypt holidays to database
    importEgyptHolidays: async (data) => {
        const campusId = ensureCampusId();
        return await api.post(`/holidays/campus/${campusId}/import-egypt-holidays`, data);
    }
};

export default holidayService;