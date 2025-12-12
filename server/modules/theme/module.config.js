/**
 * Theme Module Configuration
 * 
 * Provides theme management functionality for the HRMS application.
 * Allows customization of colors, typography, and visual appearance.
 */

export default {
    name: 'theme',
    displayName: 'Theme Management',
    version: '1.0.0',
    description: 'Theme management system for customizing application appearance including colors, typography, and visual elements.',
    author: 'System',
    category: 'ui',
    
    // Module dependencies
    dependencies: [],
    
    // Optional dependencies
    optionalDependencies: [],
    
    // Modules that can use theme
    providesTo: ['*'],
    
    // Pricing information
    pricing: {
        tier: 'included',
        monthlyPrice: 0,
        yearlyPrice: 0
    },
    
    // Feature flags
    features: {
        themeCustomization: true,
        darkMode: true,
        presets: true,
        typography: true,
        colorSchemes: true
    },
    
    // API routes
    routes: {
        base: '/api/theme',
        endpoints: [
            { path: '/', method: 'GET', auth: false, description: 'Get active theme configuration' },
            { path: '/', method: 'PUT', auth: true, roles: ['admin'], description: 'Update theme configuration' },
            { path: '/reset', method: 'POST', auth: true, roles: ['admin'], description: 'Reset theme to defaults' },
            { path: '/presets', method: 'GET', auth: true, description: 'Get theme presets' }
        ]
    },
    
    // Database models
    models: [
        'ThemeConfig'
    ],
    
    // Collections included in backup
    backupCollections: [
        'themeconfigs'
    ],
    
    // Module metadata
    metadata: {
        required: false,
        canBeDisabled: true,
        isCore: false,
        supportsMultiTenant: true,
        requiresTenantContext: false
    },
    
    /**
     * Initialization function
     * Called when module is loaded
     */
    async initialize(app, tenantId) {
        console.log(`Theme module initialized for tenant: ${tenantId || 'all'}`);
        
        return {
            success: true,
            message: 'Theme module initialized successfully'
        };
    },
    
    /**
     * Cleanup function
     * Called when module is unloaded
     */
    async cleanup(tenantId) {
        console.log(`Theme module cleanup for tenant: ${tenantId || 'all'}`);
        
        return {
            success: true,
            message: 'Theme module cleanup completed'
        };
    }
};