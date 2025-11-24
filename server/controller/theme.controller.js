import ThemeConfig from '../models/themeConfig.model.js';
import logger from '../utils/logger.js';

/**
 * Get active theme configuration
 * @route GET /api/theme
 * @access Private
 */
export const getTheme = async (req, res) => {
    try {
        const theme = await ThemeConfig.getActiveTheme();
        res.json(theme);
    } catch (error) {
        logger.error('Error fetching theme:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update theme configuration
 * @route PUT /api/theme
 * @access Private (Admin only)
 */
export const updateTheme = async (req, res) => {
    try {
        const theme = await ThemeConfig.getActiveTheme();

        // Update theme fields
        if (req.body.light) {
            theme.light = req.body.light;
        }

        if (req.body.dark) {
            theme.dark = req.body.dark;
        }

        if (req.body.typography) {
            theme.typography = {
                ...theme.typography,
                ...req.body.typography,
            };
        }

        if (req.body.shape) {
            theme.shape = {
                ...theme.shape,
                ...req.body.shape,
            };
        }

        if (req.body.spacing !== undefined) {
            theme.spacing = req.body.spacing;
        }

        theme.updatedBy = req.user._id;
        await theme.save();

        logger.info(`Theme updated by ${req.user.username}`, {
            userId: req.user._id,
            action: 'UPDATE_THEME',
        });

        res.json(theme);
    } catch (error) {
        logger.error('Error updating theme:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Reset theme to defaults
 * @route POST /api/theme/reset
 * @access Private (Admin only)
 */
export const resetTheme = async (req, res) => {
    try {
        const theme = await ThemeConfig.getActiveTheme();

        // Reset to default values
        theme.light = {
            primary: { main: '#007bff', light: '#4da3ff', dark: '#0056b3' },
            secondary: { main: '#6c757d', light: '#9ca3a8', dark: '#495057' },
            success: { main: '#28a745', light: '#5cb85c', dark: '#1e7e34' },
            error: { main: '#dc3545', light: '#e4606d', dark: '#bd2130' },
            warning: { main: '#ffc107', light: '#ffcd39', dark: '#d39e00' },
            info: { main: '#17a2b8', light: '#45b5c6', dark: '#117a8b' },
            background: { default: '#f8f9fa', paper: '#ffffff' },
            text: { primary: '#212529', secondary: '#6c757d' },
        };

        theme.dark = {
            primary: { main: '#4da3ff', light: '#80bdff', dark: '#007bff' },
            secondary: { main: '#9ca3a8', light: '#c1c6ca', dark: '#6c757d' },
            success: { main: '#5cb85c', light: '#7ec87e', dark: '#28a745' },
            error: { main: '#e4606d', light: '#ea8089', dark: '#dc3545' },
            warning: { main: '#ffcd39', light: '#ffd966', dark: '#ffc107' },
            info: { main: '#45b5c6', light: '#6dc5d3', dark: '#17a2b8' },
            background: { default: '#1a1d23', paper: '#25282e' },
            text: { primary: '#f8f9fa', secondary: '#adb5bd' },
        };

        theme.typography = {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            fontSize: 14,
        };

        theme.shape = {
            borderRadius: 12,
        };

        theme.spacing = 8;
        theme.updatedBy = req.user._id;

        await theme.save();

        logger.info(`Theme reset to defaults by ${req.user.username}`, {
            userId: req.user._id,
            action: 'RESET_THEME',
        });

        res.json(theme);
    } catch (error) {
        logger.error('Error resetting theme:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get theme presets
 * @route GET /api/theme/presets
 * @access Private
 */
export const getThemePresets = async (req, res) => {
    try {
        const presets = [
            {
                id: 'default',
                name: 'Default Blue',
                description: 'Professional blue theme',
                preview: {
                    primary: '#007bff',
                    secondary: '#6c757d',
                },
            },
            {
                id: 'green',
                name: 'Nature Green',
                description: 'Fresh green theme',
                preview: {
                    primary: '#28a745',
                    secondary: '#20c997',
                },
            },
            {
                id: 'purple',
                name: 'Royal Purple',
                description: 'Elegant purple theme',
                preview: {
                    primary: '#6f42c1',
                    secondary: '#e83e8c',
                },
            },
            {
                id: 'orange',
                name: 'Sunset Orange',
                description: 'Warm orange theme',
                preview: {
                    primary: '#fd7e14',
                    secondary: '#ffc107',
                },
            },
        ];

        res.json(presets);
    } catch (error) {
        logger.error('Error fetching theme presets:', error);
        res.status(500).json({ error: error.message });
    }
};
