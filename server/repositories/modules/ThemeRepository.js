import BaseRepository from '../BaseRepository.js';
import ThemeConfig from '../../modules/theme/models/themeConfig.model.js';

/**
 * Theme Repository - Data access layer for theme configuration operations
 * Extends BaseRepository with theme-specific query methods
 */
class ThemeRepository extends BaseRepository {
    constructor() {
        super(ThemeConfig);
    }

    /**
     * Get active theme configuration
     */
    async getActiveTheme(tenantId) {
        let theme = await this.findOne({ tenantId, isActive: true });

        if (!theme) {
            // Create default theme if none exists
            theme = await this.createDefaultTheme(tenantId);
        }

        return theme;
    }

    /**
     * Create default theme configuration
     */
    async createDefaultTheme(tenantId) {
        const defaultThemeData = {
            tenantId,
            isActive: true,
            light: {
                primary: { main: '#007bff', light: '#4da3ff', dark: '#0056b3' },
                secondary: { main: '#6c757d', light: '#9ca3a8', dark: '#495057' },
                success: { main: '#28a745', light: '#5cb85c', dark: '#1e7e34' },
                error: { main: '#dc3545', light: '#e4606d', dark: '#bd2130' },
                warning: { main: '#ffc107', light: '#ffcd39', dark: '#d39e00' },
                info: { main: '#17a2b8', light: '#45b5c6', dark: '#117a8b' },
                background: { default: '#f8f9fa', paper: '#ffffff' },
                text: { primary: '#212529', secondary: '#6c757d' },
            },
            dark: {
                primary: { main: '#4da3ff', light: '#80bdff', dark: '#007bff' },
                secondary: { main: '#9ca3a8', light: '#c1c6ca', dark: '#6c757d' },
                success: { main: '#5cb85c', light: '#7ec87e', dark: '#28a745' },
                error: { main: '#e4606d', light: '#ea8089', dark: '#dc3545' },
                warning: { main: '#ffcd39', light: '#ffd966', dark: '#ffc107' },
                info: { main: '#45b5c6', light: '#6dc5d3', dark: '#17a2b8' },
                background: { default: '#1a1d23', paper: '#25282e' },
                text: { primary: '#f8f9fa', secondary: '#adb5bd' },
            },
            typography: {
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontSize: 14,
            },
            shape: {
                borderRadius: 12,
            },
            spacing: 8
        };

        return await this.create(defaultThemeData);
    }

    /**
     * Update theme configuration
     */
    async updateTheme(themeId, updateData, updatedBy) {
        const updateDataWithUser = {
            ...updateData,
            updatedBy,
            updatedAt: new Date()
        };

        return await this.update(themeId, updateDataWithUser);
    }

    /**
     * Reset theme to defaults
     */
    async resetToDefaults(themeId, updatedBy) {
        const defaultData = {
            light: {
                primary: { main: '#007bff', light: '#4da3ff', dark: '#0056b3' },
                secondary: { main: '#6c757d', light: '#9ca3a8', dark: '#495057' },
                success: { main: '#28a745', light: '#5cb85c', dark: '#1e7e34' },
                error: { main: '#dc3545', light: '#e4606d', dark: '#bd2130' },
                warning: { main: '#ffc107', light: '#ffcd39', dark: '#d39e00' },
                info: { main: '#17a2b8', light: '#45b5c6', dark: '#117a8b' },
                background: { default: '#f8f9fa', paper: '#ffffff' },
                text: { primary: '#212529', secondary: '#6c757d' },
            },
            dark: {
                primary: { main: '#4da3ff', light: '#80bdff', dark: '#007bff' },
                secondary: { main: '#9ca3a8', light: '#c1c6ca', dark: '#6c757d' },
                success: { main: '#5cb85c', light: '#7ec87e', dark: '#28a745' },
                error: { main: '#e4606d', light: '#ea8089', dark: '#dc3545' },
                warning: { main: '#ffcd39', light: '#ffd966', dark: '#ffc107' },
                info: { main: '#45b5c6', light: '#6dc5d3', dark: '#17a2b8' },
                background: { default: '#1a1d23', paper: '#25282e' },
                text: { primary: '#f8f9fa', secondary: '#adb5bd' },
            },
            typography: {
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontSize: 14,
            },
            shape: {
                borderRadius: 12,
            },
            spacing: 8,
            updatedBy,
            updatedAt: new Date()
        };

        return await this.update(themeId, defaultData);
    }

    /**
     * Apply theme preset
     */
    async applyPreset(themeId, presetId, updatedBy) {
        const presets = {
            default: {
                primary: { main: '#007bff', light: '#4da3ff', dark: '#0056b3' },
                secondary: { main: '#6c757d', light: '#9ca3a8', dark: '#495057' }
            },
            green: {
                primary: { main: '#28a745', light: '#5cb85c', dark: '#1e7e34' },
                secondary: { main: '#20c997', light: '#4dd4ac', dark: '#17a085' }
            },
            purple: {
                primary: { main: '#6f42c1', light: '#8a63d2', dark: '#59359a' },
                secondary: { main: '#e83e8c', light: '#ed5da6', dark: '#d91a72' }
            },
            orange: {
                primary: { main: '#fd7e14', light: '#fd9843', dark: '#dc6502' },
                secondary: { main: '#ffc107', light: '#ffcd39', dark: '#d39e00' }
            }
        };

        const preset = presets[presetId];
        if (!preset) {
            throw new Error('Invalid preset ID');
        }

        const theme = await this.findById(themeId);
        if (!theme) {
            throw new Error('Theme not found');
        }

        // Update both light and dark themes with preset colors
        const updateData = {
            light: {
                ...theme.light,
                primary: preset.primary,
                secondary: preset.secondary
            },
            dark: {
                ...theme.dark,
                primary: preset.primary,
                secondary: preset.secondary
            },
            updatedBy,
            updatedAt: new Date()
        };

        return await this.update(themeId, updateData);
    }

    /**
     * Get theme history
     */
    async getThemeHistory(tenantId, options = {}) {
        const filter = { tenantId };
        const queryOptions = {
            populate: [
                { path: 'updatedBy', select: 'firstName lastName email' },
                { path: 'createdBy', select: 'firstName lastName email' }
            ],
            sort: { updatedAt: -1 },
            ...options
        };

        return await this.find(filter, queryOptions);
    }

    /**
     * Create theme backup
     */
    async createBackup(themeId, backupName, createdBy) {
        const theme = await this.findById(themeId);

        if (!theme) {
            throw new Error('Theme not found');
        }

        const backupData = {
            ...theme.toObject(),
            _id: undefined, // Remove original ID
            isActive: false,
            isBackup: true,
            backupName,
            originalThemeId: themeId,
            createdBy,
            createdAt: new Date()
        };

        return await this.create(backupData);
    }

    /**
     * Restore theme from backup
     */
    async restoreFromBackup(backupId, restoredBy) {
        const backup = await this.findById(backupId);

        if (!backup || !backup.isBackup) {
            throw new Error('Backup not found');
        }

        const originalTheme = await this.findById(backup.originalThemeId);

        if (!originalTheme) {
            throw new Error('Original theme not found');
        }

        const restoreData = {
            light: backup.light,
            dark: backup.dark,
            typography: backup.typography,
            shape: backup.shape,
            spacing: backup.spacing,
            updatedBy: restoredBy,
            updatedAt: new Date()
        };

        return await this.update(backup.originalThemeId, restoreData);
    }

    /**
     * Get theme backups
     */
    async getBackups(tenantId, options = {}) {
        const filter = {
            tenantId,
            isBackup: true
        };
        const queryOptions = {
            populate: [
                { path: 'createdBy', select: 'firstName lastName email' }
            ],
            sort: { createdAt: -1 },
            ...options
        };

        return await this.find(filter, queryOptions);
    }

    /**
     * Delete theme backup
     */
    async deleteBackup(backupId) {
        const backup = await this.findById(backupId);

        if (!backup || !backup.isBackup) {
            throw new Error('Backup not found');
        }

        return await this.delete(backupId);
    }

    /**
     * Validate theme configuration
     */
    async validateTheme(themeData) {
        const requiredFields = ['light', 'dark', 'typography', 'shape', 'spacing'];
        const requiredColorFields = ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'background', 'text'];

        for (const field of requiredFields) {
            if (!themeData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate light and dark themes have required color fields
        for (const mode of ['light', 'dark']) {
            for (const colorField of requiredColorFields) {
                if (!themeData[mode][colorField]) {
                    throw new Error(`Missing required color field: ${mode}.${colorField}`);
                }
            }
        }

        // Validate typography
        if (!themeData.typography.fontFamily || !themeData.typography.fontSize) {
            throw new Error('Typography must include fontFamily and fontSize');
        }

        // Validate shape
        if (typeof themeData.shape.borderRadius !== 'number') {
            throw new Error('Shape borderRadius must be a number');
        }

        // Validate spacing
        if (typeof themeData.spacing !== 'number') {
            throw new Error('Spacing must be a number');
        }

        return true;
    }

    /**
     * Get theme usage statistics
     */
    async getUsageStatistics(tenantId) {
        const themes = await this.find({ tenantId });

        const statistics = {
            totalThemes: themes.length,
            activeThemes: 0,
            backups: 0,
            lastUpdated: null,
            mostRecentUpdate: null,
            updateFrequency: 0 // Updates per month
        };

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let recentUpdates = 0;

        themes.forEach(theme => {
            if (theme.isActive) {
                statistics.activeThemes++;
            }

            if (theme.isBackup) {
                statistics.backups++;
            }

            if (theme.updatedAt) {
                if (!statistics.lastUpdated || theme.updatedAt > statistics.lastUpdated) {
                    statistics.lastUpdated = theme.updatedAt;
                    statistics.mostRecentUpdate = theme;
                }

                if (theme.updatedAt > thirtyDaysAgo) {
                    recentUpdates++;
                }
            }
        });

        statistics.updateFrequency = recentUpdates;

        return statistics;
    }
}

export default ThemeRepository;