/**
 * HR-Core Module Configuration
 * 
 * This is the foundation module that MUST work standalone.
 * HR-Core CANNOT depend on ANY optional module.
 * 
 * CRITICAL RULES:
 * 1. HR-Core has NO dependencies
 * 2. HR-Core decides all employment rules
 * 3. Optional modules can only REQUEST changes through HR-Core
 * 4. Backup includes ONLY HR-Core data
 */

export default {
    name: 'hr-core',
    displayName: 'HR Core',
    version: '1.0.0',
    description: 'Core HR functionality including attendance, requests, holidays, missions, vacations, overtime, and backup. This module is required and always enabled.',
    author: 'System',
    category: 'core',
    
    // Module dependencies - MUST be empty for HR-Core
    dependencies: [],
    
    // Optional dependencies - MUST be empty for HR-Core
    optionalDependencies: [],
    
    // Modules that can use HR-Core (all modules can depend on HR-Core)
    providesTo: ['*'],
    
    // Pricing information - HR-Core is included in all plans
    pricing: {
        tier: 'included',
        monthlyPrice: 0,
        yearlyPrice: 0
    },
    
    // Feature flags
    features: {
        attendance: true,
        requests: true,
        holidays: true,
        missions: true,
        vacations: true,
        overtime: true,
        backup: true,
        forgetCheck: true,
        vacationBalance: true,
        mixedVacations: true
    },
    
    // API routes
    routes: {
        base: '/api/v1/hr-core',
        endpoints: [
            // Attendance
            { path: '/attendance', method: 'GET', auth: true },
            { path: '/attendance', method: 'POST', auth: true },
            { path: '/attendance/:id', method: 'GET', auth: true },
            { path: '/attendance/:id', method: 'PUT', auth: true },
            { path: '/attendance/:id', method: 'DELETE', auth: true },
            { path: '/attendance/today', method: 'GET', auth: true },
            { path: '/attendance/monthly', method: 'GET', auth: true },
            { path: '/attendance/manual/checkin', method: 'POST', auth: true, roles: ['admin', 'hr'] },
            { path: '/attendance/manual/checkout', method: 'POST', auth: true, roles: ['admin', 'hr'] },
            
            // Requests
            { path: '/requests', method: 'GET', auth: true },
            { path: '/requests', method: 'POST', auth: true },
            { path: '/requests/:id', method: 'GET', auth: true },
            { path: '/requests/:id', method: 'PUT', auth: true },
            { path: '/requests/:id', method: 'DELETE', auth: true },
            { path: '/requests/pending', method: 'GET', auth: true, roles: ['admin', 'hr', 'manager'] },
            { path: '/requests/type/:type', method: 'GET', auth: true },
            { path: '/requests/:id/approve', method: 'POST', auth: true, roles: ['admin', 'hr', 'manager'] },
            { path: '/requests/:id/reject', method: 'POST', auth: true, roles: ['admin', 'hr', 'manager'] },
            { path: '/requests/:id/cancel', method: 'POST', auth: true },
            
            // Holidays
            { path: '/holidays', method: 'GET', auth: true },
            { path: '/holidays', method: 'POST', auth: true, roles: ['admin', 'hr'] },
            { path: '/holidays/:id', method: 'GET', auth: true },
            { path: '/holidays/:id', method: 'PUT', auth: true, roles: ['admin', 'hr'] },
            { path: '/holidays/:id', method: 'DELETE', auth: true, roles: ['admin'] },
            
            // Missions
            { path: '/missions', method: 'GET', auth: true },
            { path: '/missions', method: 'POST', auth: true },
            { path: '/missions/:id', method: 'GET', auth: true },
            { path: '/missions/:id', method: 'PUT', auth: true },
            { path: '/missions/:id', method: 'DELETE', auth: true, roles: ['admin', 'hr'] },
            
            // Vacations
            { path: '/vacations', method: 'GET', auth: true },
            { path: '/vacations', method: 'POST', auth: true },
            { path: '/vacations/:id', method: 'GET', auth: true },
            { path: '/vacations/:id', method: 'PUT', auth: true },
            { path: '/vacations/:id', method: 'DELETE', auth: true, roles: ['admin', 'hr'] },
            
            // Overtime
            { path: '/overtime', method: 'GET', auth: true },
            { path: '/overtime', method: 'POST', auth: true },
            { path: '/overtime/:id', method: 'GET', auth: true },
            { path: '/overtime/:id', method: 'PUT', auth: true },
            { path: '/overtime/:id', method: 'DELETE', auth: true, roles: ['admin', 'hr'] },
            
            // Backup
            { path: '/backup/create', method: 'POST', auth: true, roles: ['admin', 'hr'] },
            { path: '/backup/restore', method: 'POST', auth: true, roles: ['admin', 'hr'] },
            { path: '/backup/validate', method: 'POST', auth: true, roles: ['admin', 'hr'] },
            { path: '/backup/stats', method: 'GET', auth: true, roles: ['admin', 'hr'] },
            { path: '/backup/list', method: 'GET', auth: true, roles: ['admin', 'hr'] }
        ]
    },
    
    // Database models
    models: [
        'Attendance',
        'Request',
        'Holiday',
        'Mission',
        'Vacation',
        'Overtime',
        'User',
        'Department',
        'Position',
        'ForgetCheck',
        'MixedVacation',
        'VacationBalance'
    ],
    
    // Collections included in backup (HARD RULE: Only HR-Core data)
    backupCollections: [
        'attendances',
        'requests',
        'holidays',
        'missions',
        'vacations',
        'mixedvacations',
        'vacationbalances',
        'overtimes',
        'users',
        'departments',
        'positions',
        'forgetchecks'
    ],
    
    // Module metadata
    metadata: {
        required: true,
        canBeDisabled: false,
        isCore: true,
        supportsMultiTenant: true,
        requiresTenantContext: true
    },
    
    /**
     * Initialization function
     * Called when module is loaded for a tenant
     */
    async initialize(app, tenantId) {
        // HR-Core initialization logic
        console.log(`HR-Core module initialized for tenant: ${tenantId || 'all'}`);
        
        // Register routes
        // This will be handled by the module loader
        
        return {
            success: true,
            message: 'HR-Core module initialized successfully'
        };
    },
    
    /**
     * Cleanup function
     * Called when module is unloaded (should never happen for HR-Core)
     */
    async cleanup(tenantId) {
        console.log(`HR-Core module cleanup for tenant: ${tenantId || 'all'}`);
        
        // HR-Core should never be disabled
        console.warn('WARNING: HR-Core is a required module and should not be disabled');
        
        return {
            success: true,
            message: 'HR-Core module cleanup completed'
        };
    }
};
