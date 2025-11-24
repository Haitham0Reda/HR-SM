import api from './api';

const themeService = {
    // Get current theme configuration
    getTheme: async () => {
        return await api.get('/theme');
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
