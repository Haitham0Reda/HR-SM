import ThemeService from '../services/ThemeService.js';
import logger from '../../../utils/logger.js';

const themeService = new ThemeService();

/**
 * Get active theme configuration
 * @route GET /api/theme
 * @access Private
 */
export const getTheme = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const theme = await themeService.getActiveTheme(tenantId);

        res.json({
            success: true,
            data: theme
        });
    } catch (error) {
        logger.error('Error fetching theme:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Update theme configuration
 * @route PUT /api/theme
 * @access Private (Admin only)
 */
export const updateTheme = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const theme = await themeService.updateTheme(tenantId, req.body, req.user._id);

        logger.info(`Theme updated by ${req.user.username}`, {
            userId: req.user._id,
            action: 'UPDATE_THEME',
        });

        res.json({
            success: true,
            data: theme
        });
    } catch (error) {
        logger.error('Error updating theme:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Reset theme to defaults
 * @route POST /api/theme/reset
 * @access Private (Admin only)
 */
export const resetTheme = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const theme = await themeService.resetTheme(tenantId, req.user._id);

        logger.info(`Theme reset to defaults by ${req.user.username}`, {
            userId: req.user._id,
            action: 'RESET_THEME',
        });

        res.json({
            success: true,
            data: theme
        });
    } catch (error) {
        logger.error('Error resetting theme:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get theme presets
 * @route GET /api/theme/presets
 * @access Private
 */
export const getThemePresets = async (req, res) => {
    try {
        const presets = await themeService.getThemePresets();

        res.json({
            success: true,
            data: presets
        });
    } catch (error) {
        logger.error('Error fetching theme presets:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
