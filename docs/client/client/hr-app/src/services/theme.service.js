import api from './api';

const themeService = {
    // Get current theme configuration
    getTheme: async () => {
        try {
            const response = await api.get('/theme');
            return response;
        } catch (error) {
            // If theme endpoint doesn't exist, return default theme
            if (error.status === 404 || error.response?.status === 404) {
                console.warn('Theme API endpoint not found, using default theme');
                return {
                    mode: 'light',
                    primaryColor: '#1976d2',
                    secondaryColor: '#dc004e'
                };
            }
            
            // For any other error, also return default theme to prevent app crash
            console.warn('Theme API error, using default theme:', error.message);
            return {
                mode: 'light',
                primaryColor: '#1976d2',
                secondaryColor: '#dc004e'
            };
        }
    },

    // Update theme configuration
    updateTheme: async (data) => {
        return await api.put('/theme', data);
    },

    // Reset theme to defaults
    resetTheme: async () => {
        return await api.post('/theme/reset');
    },

    // Get theme presets
    getPresets: async () => {
        return await api.get('/theme/presets');
    },

    // Apply a theme preset
    applyPreset: async (presetId) => {
        return await api.post(`/theme/presets/${presetId}/apply`);
    },
};

export default themeService;
