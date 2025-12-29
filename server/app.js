import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { tenantContext } from './shared/middleware/tenantContext.js';
import { loadCoreRoutes, loadModuleRoutes } from './config/moduleRegistry.js';
import { MODULES } from './shared/constants/modules.js';
import moduleInitializer from './core/registry/moduleInitializer.js';
import { namespaceValidator, validateRouteNamespaces, logValidationResults } from './core/middleware/namespaceValidator.js';
import { preventInjection, validateJsonSchema } from './middleware/enhancedValidation.middleware.js';
import { 
    authRateLimit, 
    sensitiveRateLimit, 
    apiRateLimit, 
    publicRateLimit, 
    globalRateLimit 
} from './middleware/enhancedRateLimit.middleware.js';

// Import Redis caching middleware
import { 
    cacheHeadersMiddleware, 
    conditionalRequestMiddleware,
    cacheStatsMiddleware 
} from './middleware/mongooseCache.middleware.js';
import { initializeSessionMiddleware } from './middleware/redisSession.middleware.js';

// Import remaining legacy routes (not yet moved to modules)
import {
    documentRoutes,
    documentTemplateRoutes,
    hardcopyRoutes,
    eventRoutes,
    notificationRoutes,
    payrollRoutes,
    reportRoutes,
    securityAuditRoutes,
    securitySettingsRoutes,
    surveyRoutes,
    analyticsRoutes,
    announcementRoutes,
    dashboardRoutes,
    themeRoutes,
    permissionRoutes,
    permissionAuditRoutes,
    featureFlagRoutes,
    licenseAuditRoutes,
    pricingRoutes,
    licenseRoutes,
    metricsRoutes
} from './routes/index.js';

const app = express();

// Security middleware with relaxed policies for development
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false, // Disable for development
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false // Disable CSP in development
}));
app.use(cors({
    origin: [
        process.env.CLIENT_URL || 'http://localhost:3000',
        'http://localhost:3001', // Platform admin
        'http://localhost:3002', // Platform admin (alternative port)
        'http://localhost:6006' // Storybook
    ],
    credentials: true
}));

// Enhanced rate limiting with Redis support and license-based limits
// Apply different rate limiters based on endpoint categories

// Global rate limiter as fallback
app.use(globalRateLimit());

// Authentication endpoints - very strict
app.use('/api/*/auth', authRateLimit);
app.use('/api/platform/auth', authRateLimit);

// Sensitive operations - strict
app.use('/api/platform/tenants', sensitiveRateLimit);
app.use('/api/platform/system', sensitiveRateLimit);

// Platform admin routes - moderate limits
app.use('/api/platform', publicRateLimit);

// General API routes - license-based limits
app.use('/api/v1', apiRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization and security
app.use(mongoSanitize());

// Enhanced security middleware
app.use(preventInjection);
app.use(validateJsonSchema());

// Comprehensive input validation and sanitization
import { comprehensiveValidation } from './middleware/globalValidation.middleware.js';
app.use(comprehensiveValidation);

// Compression
app.use(compression());

// Initialize Redis session middleware
try {
    initializeSessionMiddleware(app);
    console.log('✓ Redis session middleware initialized');
} catch (error) {
    console.warn('⚠️  Redis session middleware initialization failed:', error.message);
}

// Cache headers and conditional request middleware for API responses
app.use('/api', cacheHeadersMiddleware);
app.use('/api', conditionalRequestMiddleware);

// CORS is now properly configured - test endpoint removed

// Specific route for profile pictures with enhanced CORS
app.get('/uploads/profile-pictures/*', (req, res, next) => {
    // Set comprehensive CORS headers specifically for profile pictures
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    
    // Log the request for debugging
    console.log(`Profile picture request: ${req.path}, Origin: ${req.headers.origin || 'none'}`);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    next();
});

// General static file serving for uploads with CORS headers
app.use('/uploads', (req, res, next) => {
    // Set comprehensive CORS headers for static files
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
    res.header('Access-Control-Allow-Credentials', 'false'); // Set to false when using wildcard origin
    res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
    
    // Additional headers to prevent caching issues
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    next();
}, express.static('uploads', {
    // Additional express.static options
    setHeaders: (res, path) => {
        // Set additional headers for all static files
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Access-Control-Allow-Origin', '*');
    }
}));

// Namespace validation middleware (development mode only)
if (process.env.NODE_ENV === 'development') {
    app.use(namespaceValidator({ strict: false }));
}

// Tenant context middleware (applies to tenant routes only, not platform routes)
app.use(tenantContext);

// License validation middleware (applies to tenant routes, skips platform routes)
try {
    const { validateLicense } = await import('./middleware/licenseValidation.middleware.js');
    app.use('/api/v1', validateLicense);
    console.log('✓ Enhanced license validation middleware loaded');
} catch (error) {
    console.warn('⚠️  Enhanced license validation middleware not available:', error.message);
}

// Company logging middleware (basic setup)
try {
    const { setupCompanyLogging, logResponseCompletion, trackUserActivity } = await import('./middleware/companyLogging.js');
    app.use(setupCompanyLogging);
    app.use(logResponseCompletion);
    
    // Apply user activity tracking to all API routes (it will check for authentication internally)
    app.use('/api', trackUserActivity);
    
    console.log('✓ Company logging middleware loaded');
} catch (error) {
    console.warn('⚠️  Company logging middleware not available:', error.message);
}

// Enhanced audit logging middleware
try {
    const { auditLogger, auditSecurityOperation } = await import('./middleware/auditLogger.middleware.js');
    
    // Apply audit logging to all API routes with different configurations
    app.use('/api/platform', auditSecurityOperation()); // High-security operations
    app.use('/api/v1', auditLogger({
        skipPaths: ['/health', '/metrics'],
        skipMethods: ['OPTIONS'],
        logSuccessOnly: false,
        includeRequestBody: false,
        includeResponseBody: false
    }));
    
    console.log('✓ Enhanced audit logging middleware loaded');
} catch (error) {
    console.warn('⚠️  Enhanced audit logging middleware not available:', error.message);
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'HRMS API is running',
        timestamp: new Date().toISOString()
    });
});

// Initialize module system
export const initializeModuleSystem = async (options = {}) => {
    console.log('🔧 Initializing module system...');

    try {
        // Initialize the module registry, loader, and feature flags
        await moduleInitializer.initialize(app, options);

        console.log('✓ Module system initialized');
        
        // Log module statistics
        const stats = moduleInitializer.getStats();
        console.log(`✓ Registered ${stats.registry.totalModules} modules`);
        console.log(`✓ Modules: ${stats.registry.modules.join(', ')}`);
    } catch (error) {
        console.error('✗ Failed to initialize module system:', error);
        throw error;
    }
};

// Initialize routes
export const initializeRoutes = async () => {
    console.log('🔧 Initializing routes...');

    // ========================================
    // PLATFORM LAYER ROUTES (/api/platform/*)
    // ========================================
    // Platform administration routes - require Platform JWT
    // These routes are for system administrators managing tenants, subscriptions, and modules
    
    try {
        // Platform authentication
        const platformAuthRoutes = await import('./platform/auth/routes/platformAuthRoutes.js');
        app.use('/api/platform/auth', platformAuthRoutes.default);
        
        // Tenant management
        const tenantRoutes = await import('./platform/tenants/routes/tenantRoutes.js');
        app.use('/api/platform/tenants', tenantRoutes.default);
        
        // Subscription management
        const subscriptionRoutes = await import('./platform/subscriptions/routes/subscriptionRoutes.js');
        app.use('/api/platform/subscriptions', subscriptionRoutes.default);
        
        // Module management
        const moduleRoutes = await import('./platform/modules/routes/moduleRoutes.js');
        app.use('/api/platform/modules', moduleRoutes.default);
        
        // System health and metrics
        const systemRoutes = await import('./platform/system/routes/systemRoutes.js');
        app.use('/api/platform/system', systemRoutes.default);
        
        // Company management (multi-tenant)
        const companyRoutes = await import('./platform/companies/routes/companyRoutes.js');
        app.use('/api/platform/companies', companyRoutes.default);
        
        console.log('✓ Platform routes loaded (/api/platform/*)');
    } catch (error) {
        console.warn('⚠️  Platform routes not available:', error.message);
    }

    // ========================================
    // TENANT APPLICATION ROUTES (/api/v1/*)
    // ========================================
    // Tenant-scoped routes - require Tenant JWT and automatic tenant filtering
    
    // NEW MODULAR SYSTEM ROUTES
    // Load core HR module (always enabled)
    await loadCoreRoutes(app);

    // Load optional modules conditionally (checked by moduleGuard middleware)
    // Note: These modules are loaded globally but access is controlled by middleware
    await loadModuleRoutes(app, MODULES.TASKS);
    await loadModuleRoutes(app, MODULES.COMMUNICATION);
    await loadModuleRoutes(app, MODULES.DOCUMENTS);
    await loadModuleRoutes(app, MODULES.REPORTING);
    await loadModuleRoutes(app, MODULES.PAYROLL);
    
    // Life Insurance module - loaded conditionally with enhanced guards
    // The module routes include both availability and license checks
    await loadModuleRoutes(app, MODULES.LIFE_INSURANCE);

    // Ensure forget-checks route is loaded (temporary fix until module registry is fully working)
    try {
        const forgetCheckRoutes = await import('./modules/hr-core/attendance/routes/forgetCheck.routes.js');
        app.use('/api/v1/forget-checks', forgetCheckRoutes.default);
        console.log('✓ Forget-checks route loaded at /api/v1/forget-checks');
    } catch (error) {
        console.error('❌ Failed to load forget-checks route:', error);
    }

    // Ensure missions route is loaded (temporary fix until module registry is fully working)
    try {
        const missionRoutes = await import('./modules/hr-core/missions/routes.js');
        app.use('/api/v1/missions', missionRoutes.default);
        console.log('✓ Missions route loaded at /api/v1/missions');
    } catch (error) {
        console.error('❌ Failed to load missions route:', error);
    }

    // Ensure sick-leaves route is loaded (temporary fix until module registry is fully working)
    try {
        const sickLeaveRoutes = await import('./modules/hr-core/vacations/routes/sickLeave.routes.js');
        app.use('/api/v1/sick-leaves', sickLeaveRoutes.default);
        console.log('✓ Sick-leaves route loaded at /api/v1/sick-leaves');
    } catch (error) {
        console.error('❌ Failed to load sick-leaves route:', error);
    }

    // Ensure permission-requests route is loaded (temporary fix until module registry is fully working)
    try {
        const permissionRequestRoutes = await import('./modules/hr-core/requests/routes/permissionRequest.routes.js');
        app.use('/api/v1/permission-requests', permissionRequestRoutes.default);
        console.log('✓ Permission-requests route loaded at /api/v1/permission-requests');
    } catch (error) {
        console.error('❌ Failed to load permission-requests route:', error);
    }

    console.log('✓ Modular routes loaded');

    // EXISTING LEGACY ROUTES (Tenant-scoped)
    // These routes maintain backward compatibility
    // TODO: Gradually migrate these to the modular system

    // Dashboard & Analytics (legacy - not yet moved to modular system)
    app.use('/api/v1/dashboard', dashboardRoutes);
    app.use('/api/v1/analytics', analyticsRoutes);

    // Documents (legacy - not yet moved)
    app.use('/api/v1/documents', documentRoutes);
    app.use('/api/v1/document-templates', documentTemplateRoutes);
    app.use('/api/v1/hardcopies', hardcopyRoutes);

    // Payroll (legacy - not yet moved)
    app.use('/api/v1/payroll', payrollRoutes);

    // Communication (legacy - not yet moved)
    app.use('/api/v1/announcements', announcementRoutes);
    app.use('/api/v1/notifications', notificationRoutes);
    app.use('/api/v1/surveys', surveyRoutes);

    // Events (legacy - not yet moved)
    app.use('/api/v1/events', eventRoutes);

    // Reports (legacy - not yet moved)
    app.use('/api/v1/reports', reportRoutes);

    // Security & Permissions (legacy - not yet moved)
    app.use('/api/v1/permissions', permissionRoutes);
    app.use('/api/v1/permission-audits', permissionAuditRoutes);
    app.use('/api/v1/security-audits', securityAuditRoutes);
    app.use('/api/v1/security-settings', securitySettingsRoutes);

    // System Management (legacy - not yet moved)
    app.use('/api/v1/theme', themeRoutes);
    app.use('/api/v1/feature-flags', featureFlagRoutes);
    
    // HR Auth routes
    const hrAuthRoutes = await import('./modules/hr-core/routes/authRoutes.js');
    app.use('/api/v1/auth', hrAuthRoutes.default);

    // Tenant configuration routes
    const tenantRoutes = await import('./modules/hr-core/routes/tenantRoutes.js');
    app.use('/api/v1/tenant', tenantRoutes.default);

    // Company logs routes (user activity tracking)
    try {
        const companyLogsRoutes = await import('./routes/companyLogs.js');
        app.use('/api/company-logs', companyLogsRoutes.default);
        console.log('✓ Company logs routes loaded (/api/company-logs/*)');
    } catch (error) {
        console.warn('⚠️  Company logs routes not available:', error.message);
    }

    // Company module routes (for HR applications to check module access)
    try {
        const companyModuleRoutes = await import('./routes/companyModuleRoutes.js');
        app.use('/api/company', companyModuleRoutes.default);
        console.log('✓ Company module routes loaded (/api/company/*)');
    } catch (error) {
        console.warn('⚠️  Company module routes not available:', error.message);
    }

    // Logging module configuration routes
    try {
        const moduleConfigurationRoutes = await import('./routes/moduleConfiguration.routes.js');
        app.use('/api/v1/logging/module', moduleConfigurationRoutes.default);
        console.log('✓ Logging module configuration routes loaded (/api/v1/logging/module/*)');
    } catch (error) {
        console.warn('⚠️  Logging module configuration routes not available:', error.message);
    }

    // Log ingestion routes
    try {
        const logIngestionRoutes = await import('./routes/logs.routes.js');
        app.use('/api/v1', logIngestionRoutes.default);
        console.log('✓ Log ingestion routes loaded (/api/v1/logs/*)');
    } catch (error) {
        console.warn('⚠️  Log ingestion routes not available:', error.message);
    }

    // License Management (legacy - not yet moved)
    app.use('/api/v1/licenses', licenseRoutes);
    app.use('/api/v1/licenses/audit', licenseAuditRoutes);

    // Pricing & Quotes (legacy - not yet moved)
    app.use('/api/v1/pricing', pricingRoutes);

    // Metrics & Monitoring (legacy - not yet moved)
    app.use('/api/v1/metrics', metricsRoutes);

    // Real-time monitoring routes
    try {
        const realtimeMonitoringRoutes = await import('./routes/realtimeMonitoring.routes.js');
        app.use('/api/v1/monitoring/realtime', realtimeMonitoringRoutes.default);
        console.log('✓ Real-time monitoring routes loaded (/api/v1/monitoring/realtime/*)');
    } catch (error) {
        console.warn('⚠️  Real-time monitoring routes not available:', error.message);
    }

    // Enhanced audit logs routes
    try {
        const auditLogsRoutes = await import('./routes/auditLogs.routes.js');
        app.use('/api/v1/audit-logs', auditLogsRoutes.default);
        console.log('✓ Enhanced audit logs routes loaded (/api/v1/audit-logs/*)');
    } catch (error) {
        console.warn('⚠️  Enhanced audit logs routes not available:', error.message);
    }

    // Cache management routes
    try {
        const cacheManagementRoutes = await import('./routes/cacheManagement.routes.js');
        app.use('/api/v1/cache', cacheManagementRoutes.default);
        console.log('✓ Cache management routes loaded (/api/v1/cache/*)');
    } catch (error) {
        console.warn('⚠️  Cache management routes not available:', error.message);
    }

    console.log('✓ Tenant routes loaded (/api/v1/*)');
    console.log('✓ All routes initialized');

    // Validate route namespaces (development mode only)
    if (process.env.NODE_ENV === 'development') {
        const validationResults = validateRouteNamespaces(app);
        logValidationResults(validationResults);
    }

    // 404 handler - must be added AFTER all routes
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: 'Route not found'
        });
    });

    // Global error handler - must be added LAST
    app.use((err, req, res, next) => {
        console.error('Error:', err);

        res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    });
};

// Export module initializer for use in other parts of the application
export { moduleInitializer };

export default app;
