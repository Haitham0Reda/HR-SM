import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { tenantContext } from './shared/middleware/tenantContext.js';
import { loadCoreRoutes, loadModuleRoutes } from './config/moduleRegistry.js';
import { MODULES } from './shared/constants/modules.js';
import moduleInitializer from './core/registry/moduleInitializer.js';
import { namespaceValidator, validateRouteNamespaces, logValidationResults } from './core/middleware/namespaceValidator.js';

// Import remaining legacy routes (not yet moved to modules)
import {
    documentRoutes,
    documentTemplateRoutes,
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

// Rate limiting - more lenient in development
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 500, // More requests allowed in development
    message: 'Too many requests from this IP, please try again later'
});

// More lenient rate limiter for platform admin routes
const platformLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 200 : 1000, // Even more requests for platform admin
    message: 'Too many requests from this IP, please try again later',
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path.includes('/system/health');
    }
});

// Apply different rate limiters
app.use('/api/platform', platformLimiter);
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize());

// Compression
app.use(compression());

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
        const moduleRoutes = await import('./platform/routes/moduleRoutes.js');
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

    // Load optional modules (checked by moduleGuard middleware)
    await loadModuleRoutes(app, MODULES.TASKS);

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

    // License Management (legacy - not yet moved)
    app.use('/api/v1/licenses', licenseRoutes);
    app.use('/api/v1/licenses/audit', licenseAuditRoutes);

    // Pricing & Quotes (legacy - not yet moved)
    app.use('/api/v1/pricing', pricingRoutes);

    // Metrics & Monitoring (legacy - not yet moved)
    app.use('/api/v1/metrics', metricsRoutes);

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
