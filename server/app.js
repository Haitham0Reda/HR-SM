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

// Import existing routes
import {
    documentRoutes,
    documentTemplateRoutes,
    eventRoutes,
    hardcopyRoutes,
    holidayRoutes,
    missionRoutes,
    mixedVacationRoutes,
    forgetCheckRoutes,
    notificationRoutes,
    payrollRoutes,
    permissionRequestRoutes,
    positionRoutes,
    reportRoutes,
    requestRoutes,
    resignedEmployeeRoutes,
    securityAuditRoutes,
    securitySettingsRoutes,
    surveyRoutes,
    userRoutes,
    analyticsRoutes,
    announcementRoutes,
    attendanceRoutes,
    authRoutes,
    dashboardRoutes,
    themeRoutes,
    backupRoutes,
    backupExecutionRoutes,
    departmentRoutes,
    permissionRoutes,
    permissionAuditRoutes,
    vacationRoutes,
    sickLeaveRoutes,
    overtimeRoutes,
    roleRoutes,
    attendanceDeviceRoutes,
    featureFlagRoutes,
    licenseAuditRoutes,
    pricingRoutes,
    licenseRoutes,
    metricsRoutes
} from './routes/index.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize());

// Compression
app.use(compression());

// Namespace validation middleware (development mode only)
if (process.env.NODE_ENV === 'development') {
    app.use(namespaceValidator({ strict: false }));
}

// Tenant context middleware (applies to tenant routes only, not platform routes)
app.use(tenantContext);

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

    console.log('✓ Modular routes loaded');

    // EXISTING LEGACY ROUTES (Tenant-scoped)
    // These routes maintain backward compatibility
    // TODO: Gradually migrate these to the modular system

    // Authentication & User Management
    app.use('/api/v1/auth', authRoutes); // Legacy auth (password reset, etc.)
    app.use('/api/v1/users', userRoutes); // Legacy user routes

    // HR Core Features
    app.use('/api/v1/departments', departmentRoutes);
    app.use('/api/v1/positions', positionRoutes);
    app.use('/api/v1/dashboard', dashboardRoutes);
    app.use('/api/v1/analytics', analyticsRoutes);

    // Attendance & Time
    app.use('/api/v1/attendance', attendanceRoutes);
    app.use('/api/v1/attendance-devices', attendanceDeviceRoutes);
    app.use('/api/v1/forget-check', forgetCheckRoutes);

    // Leave Management
    app.use('/api/v1/missions', missionRoutes);
    app.use('/api/v1/mixed-vacations', mixedVacationRoutes);
    app.use('/api/v1/permission-requests', permissionRequestRoutes);
    app.use('/api/v1/vacations', vacationRoutes);
    app.use('/api/v1/sick-leaves', sickLeaveRoutes);
    app.use('/api/v1/overtime', overtimeRoutes);

    // Documents
    app.use('/api/v1/documents', documentRoutes);
    app.use('/api/v1/document-templates', documentTemplateRoutes);
    app.use('/api/v1/hardcopies', hardcopyRoutes);

    // Payroll
    app.use('/api/v1/payroll', payrollRoutes);

    // Communication
    app.use('/api/v1/announcements', announcementRoutes);
    app.use('/api/v1/notifications', notificationRoutes);
    app.use('/api/v1/surveys', surveyRoutes);

    // Events & Holidays
    app.use('/api/v1/events', eventRoutes);
    app.use('/api/v1/holidays', holidayRoutes);

    // Reports & Requests
    app.use('/api/v1/reports', reportRoutes);
    app.use('/api/v1/requests', requestRoutes);

    // Security & Permissions
    app.use('/api/v1/permissions', permissionRoutes);
    app.use('/api/v1/permission-audits', permissionAuditRoutes);
    app.use('/api/v1/security-audits', securityAuditRoutes);
    app.use('/api/v1/security-settings', securitySettingsRoutes);
    app.use('/api/v1/roles', roleRoutes);

    // System Management
    app.use('/api/v1/backups', backupRoutes);
    app.use('/api/v1/backup-executions', backupExecutionRoutes);
    app.use('/api/v1/theme', themeRoutes);
    app.use('/api/v1/feature-flags', featureFlagRoutes);

    // License Management
    app.use('/api/v1/licenses', licenseRoutes);
    app.use('/api/v1/licenses/audit', licenseAuditRoutes);

    // Pricing & Quotes
    app.use('/api/v1/pricing', pricingRoutes);

    // Metrics & Monitoring
    app.use('/api/v1/metrics', metricsRoutes);

    // Resigned Employees
    app.use('/api/v1/resigned-employees', resignedEmployeeRoutes);

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
