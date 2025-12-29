import ThemeRepository from '../../../repositories/modules/ThemeRepository.js';

/**
 * Theme Service - Business logic layer for theme configuration operations
 * Uses ThemeRepository for data access
 */
class ThemeService {
    constructor() {
        this.themeRepository = new ThemeRepository();
    }

    /**
     * Get active theme configuration
     */
    async getActiveTheme(tenantId) {
        return await this.themeRepository.getActiveTheme(tenantId);
    }

    /**
     * Update theme configuration
     */
    async updateTheme(tenantId, updateData, updatedBy) {
        // Validate theme data
        await this.themeRepository.validateTheme(updateData);

        const activeTheme = await this.themeRepository.getActiveTheme(tenantId);

        return await this.themeRepository.updateTheme(activeTheme._id, updateData, updatedBy);
    }

    /**
     * Reset theme to defaults
     */
    async resetTheme(tenantId, updatedBy) {
        const activeTheme = await this.themeRepository.getActiveTheme(tenantId);

        return await this.themeRepository.resetToDefaults(activeTheme._id, updatedBy);
    }

    /**
     * Apply theme preset
     */
    async applyThemePreset(tenantId, presetId, updatedBy) {
        const activeTheme = await this.themeRepository.getActiveTheme(tenantId);

        return await this.themeRepository.applyPreset(activeTheme._id, presetId, updatedBy);
    }

    /**
     * Get theme presets
     */
    async getThemePresets() {
        return [
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
    }

    /**
     * Create theme backup
     */
    async createThemeBackup(tenantId, backupName, createdBy) {
        const activeTheme = await this.themeRepository.getActiveTheme(tenantId);

        return await this.themeRepository.createBackup(activeTheme._id, backupName, createdBy);
    }

    /**
     * Restore theme from backup
     */
    async restoreThemeFromBackup(backupId, restoredBy) {
        return await this.themeRepository.restoreFromBackup(backupId, restoredBy);
    }

    /**
     * Get theme backups
     */
    async getThemeBackups(tenantId, options = {}) {
        return await this.themeRepository.getBackups(tenantId, options);
    }

    /**
     * Delete theme backup
     */
    async deleteThemeBackup(backupId) {
        return await this.themeRepository.deleteBackup(backupId);
    }

    /**
     * Get theme history
     */
    async getThemeHistory(tenantId, options = {}) {
        return await this.themeRepository.getThemeHistory(tenantId, options);
    }

    /**
     * Validate theme configuration
     */
    async validateThemeConfiguration(themeData) {
        return await this.themeRepository.validateTheme(themeData);
    }

    /**
     * Get theme usage statistics
     */
    async getThemeUsageStatistics(tenantId) {
        return await this.themeRepository.getUsageStatistics(tenantId);
    }

    /**
     * Update specific theme section
     */
    async updateThemeSection(tenantId, section, sectionData, updatedBy) {
        const activeTheme = await this.themeRepository.getActiveTheme(tenantId);

        const updateData = {
            [section]: {
                ...activeTheme[section],
                ...sectionData
            }
        };

        // Validate the updated theme
        const fullThemeData = {
            ...activeTheme.toObject(),
            ...updateData
        };
        await this.themeRepository.validateTheme(fullThemeData);

        return await this.themeRepository.updateTheme(activeTheme._id, updateData, updatedBy);
    }

    /**
     * Update light theme colors
     */
    async updateLightTheme(tenantId, lightThemeData, updatedBy) {
        return await this.updateThemeSection(tenantId, 'light', lightThemeData, updatedBy);
    }

    /**
     * Update dark theme colors
     */
    async updateDarkTheme(tenantId, darkThemeData, updatedBy) {
        return await this.updateThemeSection(tenantId, 'dark', darkThemeData, updatedBy);
    }

    /**
     * Update typography settings
     */
    async updateTypography(tenantId, typographyData, updatedBy) {
        return await this.updateThemeSection(tenantId, 'typography', typographyData, updatedBy);
    }

    /**
     * Update shape settings
     */
    async updateShape(tenantId, shapeData, updatedBy) {
        return await this.updateThemeSection(tenantId, 'shape', shapeData, updatedBy);
    }

    /**
     * Update spacing settings
     */
    async updateSpacing(tenantId, spacing, updatedBy) {
        const activeTheme = await this.themeRepository.getActiveTheme(tenantId);

        const updateData = { spacing };

        return await this.themeRepository.updateTheme(activeTheme._id, updateData, updatedBy);
    }

    /**
     * Get theme configuration for export
     */
    async exportThemeConfiguration(tenantId) {
        const activeTheme = await this.themeRepository.getActiveTheme(tenantId);

        // Return only the theme configuration without metadata
        return {
            light: activeTheme.light,
            dark: activeTheme.dark,
            typography: activeTheme.typography,
            shape: activeTheme.shape,
            spacing: activeTheme.spacing,
            exportedAt: new Date(),
            version: '1.0'
        };
    }

    /**
     * Import theme configuration
     */
    async importThemeConfiguration(tenantId, themeConfig, importedBy) {
        // Validate imported theme configuration
        await this.themeRepository.validateTheme(themeConfig);

        const updateData = {
            light: themeConfig.light,
            dark: themeConfig.dark,
            typography: themeConfig.typography,
            shape: themeConfig.shape,
            spacing: themeConfig.spacing
        };

        return await this.updateTheme(tenantId, updateData, importedBy);
    }

    /**
     * Create custom theme preset
     */
    async createCustomPreset(tenantId, presetName, presetData, createdBy) {
        // Validate preset data
        const requiredFields = ['primary', 'secondary'];
        for (const field of requiredFields) {
            if (!presetData[field]) {
                throw new Error(`Missing required preset field: ${field}`);
            }
        }

        const activeTheme = await this.themeRepository.getActiveTheme(tenantId);

        // Create a backup with the preset name
        const backupData = {
            ...activeTheme.toObject(),
            _id: undefined,
            isActive: false,
            isBackup: false,
            isPreset: true,
            presetName,
            presetData,
            createdBy,
            createdAt: new Date()
        };

        return await this.themeRepository.create(backupData);
    }

    /**
     * Get custom theme presets
     */
    async getCustomPresets(tenantId, options = {}) {
        const filter = {
            tenantId,
            isPreset: true
        };
        const queryOptions = {
            populate: [
                { path: 'createdBy', select: 'firstName lastName email' }
            ],
            sort: { createdAt: -1 },
            ...options
        };

        return await this.themeRepository.find(filter, queryOptions);
    }

    /**
     * Apply custom preset
     */
    async applyCustomPreset(tenantId, presetId, appliedBy) {
        const preset = await this.themeRepository.findById(presetId);

        if (!preset || !preset.isPreset || preset.tenantId !== tenantId) {
            throw new Error('Custom preset not found');
        }

        const updateData = {
            light: {
                ...preset.light,
                primary: preset.presetData.primary,
                secondary: preset.presetData.secondary
            },
            dark: {
                ...preset.dark,
                primary: preset.presetData.primary,
                secondary: preset.presetData.secondary
            }
        };

        return await this.updateTheme(tenantId, updateData, appliedBy);
    }

    /**
     * Delete custom preset
     */
    async deleteCustomPreset(presetId, tenantId) {
        const preset = await this.themeRepository.findById(presetId);

        if (!preset || !preset.isPreset || preset.tenantId !== tenantId) {
            throw new Error('Custom preset not found');
        }

        return await this.themeRepository.delete(presetId);
    }

    /**
     * Generate theme CSS variables
     */
    async generateThemeCSS(tenantId, mode = 'light') {
        const activeTheme = await this.themeRepository.getActiveTheme(tenantId);
        const themeColors = activeTheme[mode];

        const cssVariables = [];

        // Generate CSS custom properties
        Object.entries(themeColors).forEach(([category, colors]) => {
            if (typeof colors === 'object' && colors !== null) {
                Object.entries(colors).forEach(([shade, value]) => {
                    cssVariables.push(`  --color-${category}-${shade}: ${value};`);
                });
            }
        });

        // Add typography variables
        cssVariables.push(`  --font-family: ${activeTheme.typography.fontFamily};`);
        cssVariables.push(`  --font-size-base: ${activeTheme.typography.fontSize}px;`);

        // Add shape variables
        cssVariables.push(`  --border-radius: ${activeTheme.shape.borderRadius}px;`);

        // Add spacing variable
        cssVariables.push(`  --spacing-unit: ${activeTheme.spacing}px;`);

        return `:root {\n${cssVariables.join('\n')}\n}`;
    }

    /**
     * Get theme accessibility score
     */
    async getThemeAccessibilityScore(tenantId) {
        const activeTheme = await this.themeRepository.getActiveTheme(tenantId);

        // Simple accessibility scoring based on contrast ratios
        // This is a simplified implementation - in practice, you'd use a proper contrast calculation library
        const score = {
            light: this.calculateAccessibilityScore(activeTheme.light),
            dark: this.calculateAccessibilityScore(activeTheme.dark),
            typography: this.calculateTypographyScore(activeTheme.typography),
            overall: 0
        };

        score.overall = (score.light + score.dark + score.typography) / 3;

        return score;
    }

    /**
     * Calculate accessibility score for color scheme
     */
    calculateAccessibilityScore(colorScheme) {
        // Simplified scoring - in practice, you'd calculate actual contrast ratios
        let score = 100;

        // Check if background and text colors have sufficient contrast
        const bgColor = colorScheme.background?.default || '#ffffff';
        const textColor = colorScheme.text?.primary || '#000000';

        // Simplified contrast check (this should use a proper contrast calculation)
        if (this.isLightColor(bgColor) && this.isLightColor(textColor)) {
            score -= 30; // Poor contrast
        }
        if (this.isDarkColor(bgColor) && this.isDarkColor(textColor)) {
            score -= 30; // Poor contrast
        }

        return Math.max(0, score);
    }

    /**
     * Calculate typography accessibility score
     */
    calculateTypographyScore(typography) {
        let score = 100;

        // Check font size
        if (typography.fontSize < 14) {
            score -= 20; // Too small
        }

        // Check font family (prefer system fonts for accessibility)
        const systemFonts = ['system-ui', 'Arial', 'Helvetica', 'sans-serif'];
        const hasSystemFont = systemFonts.some(font =>
            typography.fontFamily.toLowerCase().includes(font.toLowerCase())
        );

        if (!hasSystemFont) {
            score -= 10; // Custom fonts may have loading issues
        }

        return Math.max(0, score);
    }

    /**
     * Check if color is light
     */
    isLightColor(color) {
        // Simplified light color detection
        return color.toLowerCase().includes('fff') ||
            color.toLowerCase().includes('f8f9fa') ||
            color.toLowerCase().includes('light');
    }

    /**
     * Check if color is dark
     */
    isDarkColor(color) {
        // Simplified dark color detection
        return color.toLowerCase().includes('000') ||
            color.toLowerCase().includes('1a1d23') ||
            color.toLowerCase().includes('dark');
    }
}

export default ThemeService;