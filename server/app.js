import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

import { initializeSessionMiddleware } from './middleware/redisSession.middleware.js';

// Import remaining legacy routes (not yet moved to modules)
import {
    eventRoutes,
    securityAuditRoutes,
    securitySettingsRoutes,
    surveyRoutes,
    themeRoutes,
    permissionRoutes,
    permissionAuditRoutes,
    featureFlagRoutes,
    licenseAuditRoutes,
    pricingRoutes,
    licenseRoutes,
    metricsRoutes
} from './routes/index.js';

// Import logs route (moved to early mounting before validation)
// import logsRoutes from './routes/logs.routes.js';

// Note: System models are now registered through the shared models registry
// and initialized per tenant connection. No need to import them globally.

const app = express();

// Security middleware with relaxed policies for development
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false, // Disable to allow CORS requests
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false // Disable CSP in development
}));
app.use(cors({
    origin: [
        process.env.CLIENT_URL || 'http://localhost:3000',
        'http://localhost:3001', // Platform admin
        'http://localhost:3002', // Platform admin (alternative port)
        'http://localhost:6006', // Storybook
        'http://127.0.0.1:5500', // Live Server
        'http://localhost:5500'  // Live Server alternative
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

// JSON error handling middleware
import { jsonErrorHandler, requestBodyLogger } from './middleware/jsonErrorHandler.js';
app.use(requestBodyLogger); // Log problematic requests in development
app.use(jsonErrorHandler);  // Handle JSON parsing errors

// Data sanitization and security
// Note: MongoDB sanitization removed as we're using PostgreSQL

// Enhanced security middleware
app.use(preventInjection);
app.use(validateJsonSchema());

// Mount logs routes BEFORE comprehensive validation to avoid content restrictions
import logsRoutes from './routes/logs.routes.js';
app.use('/api/v1/logs', logsRoutes);

// Comprehensive input validation and sanitization
import { comprehensiveValidation } from './middleware/globalValidation.middleware.js';
app.use(comprehensiveValidation);

// Compression
app.use(compression());

// Initialize Redis session middleware
try {
    initializeSessionMiddleware(app);
} catch (error) {
    console.warn('Redis session middleware initialization failed:', error.message);
}

// Cache headers removed - using PostgreSQL instead of MongoDB

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
// Validates licenses with standalone license server microservice
// Includes Redis caching (5 min TTL) and circuit breaker pattern
try {
    const { validateLicense } = await import('./middleware/licenseServerValidation.middleware.js');
    app.use('/api/v1', validateLicense);
} catch (error) {
    console.warn('License server validation middleware not available:', error.message);
}

// Company logging middleware (basic setup)
try {
    const { setupCompanyLogging, logResponseCompletion, trackUserActivity } = await import('./middleware/companyLogging.js');
    app.use(setupCompanyLogging);
    app.use(logResponseCompletion);

    // Apply user activity tracking to all API routes (it will check for authentication internally)
    app.use('/api', trackUserActivity);
} catch (error) {
    console.warn('Company logging middleware not available:', error.message);
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

    } catch (error) {
        console.warn('Enhanced audit logging middleware not available:', error.message);
    }

// Request duration tracking middleware
try {
    const { httpRequestDuration } = await import('./metrics/index.js');
    
    app.use((req, res, next) => {
        const start = Date.now();
        
        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000; // Convert to seconds
            const route = req.route ? req.route.path : req.path;
            
            httpRequestDuration
                .labels(req.method, route, res.statusCode.toString())
                .observe(duration);
        });
        
        next();
    });
} catch (error) {
    console.warn('Request duration tracking middleware not available:', error.message);
}

// Metrics endpoint (protected with bearer token)
app.get('/metrics', async (req, res) => {
    try {
        // Check for bearer token
        const authHeader = req.headers.authorization;
        const expectedToken = process.env.METRICS_TOKEN;
        
        if (!expectedToken) {
            return res.status(503).json({
                success: false,
                message: 'Metrics endpoint not configured'
            });
        }
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Missing or invalid authorization header'
            });
        }
        
        const token = authHeader.substring(7);
        
        if (token !== expectedToken) {
            return res.status(403).json({
                success: false,
                message: 'Invalid metrics token'
            });
        }
        
        // Return metrics in Prometheus format
        const { register } = await import('./metrics/index.js');
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        console.error('Error generating metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate metrics'
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'HRMS API is running',
        timestamp: new Date().toISOString()
    });
});

// Test-only routes (only available when NODE_ENV=test)
if (process.env.NODE_ENV === 'test') {
    try {
        const testRoutes = await import('./routes/testRoutes.js');
        app.use('/api/v1/test', testRoutes.default);
    } catch (error) {
        console.warn('Test routes not available:', error.message);
    }
}

// Initialize module system
export const initializeModuleSystem = async (options = {}) => {
    try {
        await moduleInitializer.initialize(app, options);
    } catch (error) {
        console.error('Failed to initialize module system:', error);
        throw error;
    }
};

// Initialize routes
export const initializeRoutes = async () => {
    // ========================================
    // PLATFORM LAYER ROUTES (/api/platform/*)
    // ========================================
    // Platform administration routes - require Platform JWT
    // These routes are for system administrators managing tenants, subscriptions, and modules

    try {
        const platformAuthRoutes = await import('./platform/auth/routes/platformAuthRoutes.js');
        app.use('/api/platform/auth', platformAuthRoutes.default);

        const tenantRoutes = await import('./platform/tenants/routes/tenantRoutes.js');
        app.use('/api/platform/tenants', tenantRoutes.default);

        const subscriptionRoutes = await import('./platform/subscriptions/routes/subscriptionRoutes.js');
        app.use('/api/platform/subscriptions', subscriptionRoutes.default);

        const moduleRoutes = await import('./platform/modules/routes/moduleRoutes.js');
        app.use('/api/platform/modules', moduleRoutes.default);

        const systemRoutes = await import('./platform/system/routes/systemRoutes.js');
        app.use('/api/platform/system', systemRoutes.default);

        const companyRoutes = await import('./platform/companies/routes/companyRoutes.js');
        app.use('/api/platform/companies', companyRoutes.default);
    } catch (error) {
        console.warn('Platform routes not available:', error.message);
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

    // All module routes are now loaded via the module registry above.
    // Temporary manual override blocks have been removed.

    console.log('Modular routes loaded');

    // Legacy routes that are NOT covered by the module registry
    // (routes already loaded via module registry are intentionally not re-mounted)

    // Communication (not in module registry)
    app.use('/api/v1/surveys', surveyRoutes);

    // Events (legacy - not yet moved to modular system)
    app.use('/api/v1/events', eventRoutes);
    app.use('/api/v1/permission-audits', permissionAuditRoutes);
    app.use('/api/v1/security-audits', securityAuditRoutes);
    app.use('/api/v1/security-settings', securitySettingsRoutes);
    app.use('/api/v1/security/settings', securitySettingsRoutes); // Alias for frontend compatibility

    // System Management (legacy - not yet moved)
    app.use('/api/v1/theme', themeRoutes);
    app.use('/api/v1/feature-flags', featureFlagRoutes);
    // Logs routes already mounted before validation middleware

    // System Settings (Admin only)
    try {
        const systemSettingsRoutes = await import('./routes/systemSettings.routes.js');
        app.use('/api/v1/system-settings', systemSettingsRoutes.default);
    } catch (error) {
        console.warn('System settings routes not available:', error.message);
    }

    // HR Auth & Tenant routes are loaded via the module registry above.
    // Removed duplicate manual mounting that caused conflict with registry.

    // Company logs routes (user activity tracking) - moved to platform namespace
    try {
        const companyLogsRoutes = await import('./routes/companyLogs.js');
        app.use('/api/v1/platform/company-logs', companyLogsRoutes.default);
    } catch (error) {
        console.warn('Company logs routes not available:', error.message);
    }

    // Company module routes (for HR applications to check module access)
    try {
        const companyModuleRoutes = await import('./routes/companyModuleRoutes.js');
        app.use('/api/v1/company', companyModuleRoutes.default);
    } catch (error) {
        console.warn('Company module routes not available:', error.message);
    }

    // Company routes (for email domain and company settings)
    try {
        const companyRoutes = await import('./routes/company.routes.js');
        app.use('/api/v1/companies', companyRoutes.default);
    } catch (error) {
        console.warn('Company routes not available:', error.message);
    }

    // Module availability routes (for checking module availability)
    try {
        const moduleAvailabilityRoutes = await import('./routes/moduleAvailability.routes.js');
        app.use('/api/v1/modules', moduleAvailabilityRoutes.default);
    } catch (error) {
        console.warn('Module availability routes not available:', error.message);
    }

    // Logging module configuration routes
    try {
        const moduleConfigurationRoutes = await import('./routes/moduleConfiguration.routes.js');
        app.use('/api/v1/logging/module', moduleConfigurationRoutes.default);
    } catch (error) {
        console.warn('Logging module configuration routes not available:', error.message);
    }

    // Log ingestion routes already mounted at /api/v1/logs above

    // License Management (legacy - not yet moved)
    app.use('/api/v1/licenses', licenseRoutes);
    app.use('/api/v1/licenses/audit', licenseAuditRoutes);

    // Life Insurance Module - now loaded via modular system above
    // Removed duplicate mounting to prevent conflicts

    // Pricing & Quotes (legacy - not yet moved)
    app.use('/api/v1/pricing', pricingRoutes);

    // Metrics & Monitoring (legacy - not yet moved)
    app.use('/api/v1/metrics', metricsRoutes);

    // Real-time monitoring routes
    try {
        const realtimeMonitoringRoutes = await import('./routes/realtimeMonitoring.routes.js');
        app.use('/api/v1/monitoring/realtime', realtimeMonitoringRoutes.default);
    } catch (error) {
        console.warn('Real-time monitoring routes not available:', error.message);
    }

    // Enhanced audit logs routes
    try {
        const auditLogsRoutes = await import('./routes/auditLogs.routes.js');
        app.use('/api/v1/audit-logs', auditLogsRoutes.default);
    } catch (error) {
        console.warn('Enhanced audit logs routes not available:', error.message);
    }

    // Cache management routes
    try {
        const cacheManagementRoutes = await import('./routes/cacheManagement.routes.js');
        app.use('/api/v1/cache', cacheManagementRoutes.default);
    } catch (error) {
        console.warn('Cache management routes not available:', error.message);
    }

    // Tenant routes loaded (/api/v1/*)
    // All routes initialized

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
