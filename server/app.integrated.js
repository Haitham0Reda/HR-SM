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
    permissionAuditRoutes
} from './routes/index.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: [
        process.env.CLIENT_URL || 'http://localhost:3000',
        'http://localhost:6006' // Storybook
    ],
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

// Tenant context middleware (applies to all routes)
app.use(tenantContext);

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'HRMS API is running',
        timestamp: new Date().toISOString()
    });
});

// Initialize routes
export const initializeRoutes = async () => {
    console.log('🔧 Initializing routes...');

    // ========================================
    // NEW MODULAR SYSTEM ROUTES (v1)
    // ========================================

    // Load core HR module (always enabled)
    await loadCoreRoutes(app);

    // Load optional modules (checked by moduleGuard middleware)
    await loadModuleRoutes(app, MODULES.TASKS);

    console.log('✓ Modular routes loaded');

    // ========================================
    // EXISTING LEGACY ROUTES
    // ========================================
    // These routes maintain backward compatibility
    // TODO: Gradually migrate these to the modular system

    // Authentication & User Management
    app.use('/api/auth', authRoutes); // Legacy auth (password reset, etc.)
    app.use('/api/users', userRoutes); // Legacy user routes

    // HR Core Features
    app.use('/api/departments', departmentRoutes);
    app.use('/api/positions', positionRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/analytics', analyticsRoutes);

    // Attendance & Time
    app.use('/api/attendance', attendanceRoutes);
    app.use('/api/forget-check', forgetCheckRoutes);

    // Leave Management
    app.use('/api/missions', missionRoutes);
    app.use('/api/mixed-vacations', mixedVacationRoutes);
    app.use('/api/permission-requests', permissionRequestRoutes);

    // Documents
    app.use('/api/documents', documentRoutes);
    app.use('/api/document-templates', documentTemplateRoutes);
    app.use('/api/hardcopies', hardcopyRoutes);

    // Payroll
    app.use('/api/payroll', payrollRoutes);

    // Communication
    app.use('/api/announcements', announcementRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/surveys', surveyRoutes);

    // Events & Holidays
    app.use('/api/events', eventRoutes);
    app.use('/api/holidays', holidayRoutes);

    // Reports & Requests
    app.use('/api/reports', reportRoutes);
    app.use('/api/requests', requestRoutes);

    // Security & Permissions
    app.use('/api/permissions', permissionRoutes);
    app.use('/api/permission-audits', permissionAuditRoutes);
    app.use('/api/security-audits', securityAuditRoutes);
    app.use('/api/security-settings', securitySettingsRoutes);

    // System Management
    app.use('/api/backups', backupRoutes);
    app.use('/api/backup-executions', backupExecutionRoutes);
    app.use('/api/theme', themeRoutes);

    // Resigned Employees
    app.use('/api/resigned-employees', resignedEmployeeRoutes);

    console.log('✓ Legacy routes loaded');
    console.log('✓ All routes initialized');
};

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

export default app;
