import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
// This works whether the server is started from root or server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { logUserActivity } from './middleware/activityLogger.js';
import { startAllScheduledTasks, stopAllTasks } from './utils/scheduler.js';
import logger from './utils/logger.js';
import backupScheduler from './services/backupScheduler.service.js';
import attendanceCron from './utils/attendanceCron.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import themeRoutes from './routes/theme.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import attendanceDeviceRoutes from './routes/attendanceDevice.routes.js';
import backupRoutes from './routes/backup.routes.js';
import backupExecutionRoutes from './routes/backupExecution.routes.js';
import departmentRoutes from './routes/department.routes.js';
import documentRoutes from './routes/document.routes.js';
import documentTemplateRoutes from './routes/documentTemplate.routes.js';
import eventRoutes from './routes/event.routes.js';
import hardcopyRoutes from './routes/hardcopy.routes.js';
import holidayRoutes from './routes/holiday.routes.js';
import missionRoutes from './routes/mission.routes.js';
import sickLeaveRoutes from './routes/sickLeave.routes.js';
import permissionsRoutes from './routes/permissions.routes.js';
import overtimeRoutes from './routes/overtime.routes.js';
import vacationRoutes from './routes/vacation.routes.js';
import mixedVacationRoutes from './routes/mixedVacation.routes.js';
import forgetCheckRoutes from './routes/forgetCheck.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import payrollRoutes from './routes/payroll.routes.js';
import systemPermissionRoutes from './routes/permission.routes.js';
import permissionRequestRoutes from './routes/permissionRequest.routes.js';
import permissionAuditRoutes from './routes/permissionAudit.routes.js';
import positionRoutes from './routes/position.routes.js';
import reportRoutes from './routes/report.routes.js';
import requestRoutes from './routes/request.routes.js';
import resignedEmployeeRoutes from './routes/resignedEmployee.routes.js';
import roleRoutes from './routes/role.routes.js';
import securitySettingsRoutes from './routes/securitySettings.routes.js';
import securityAuditRoutes from './routes/securityAudit.routes.js';
import surveyRoutes from './routes/survey.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// CORS must be FIRST - before any other middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Rate limiting - AFTER CORS
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS' // Skip rate limiting for OPTIONS requests
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later.',
    skip: (req) => req.method === 'OPTIONS' // Skip rate limiting for OPTIONS requests
});

// Data sanitization against NoSQL injection - Custom middleware for Express 5 compatibility
// express-mongo-sanitize v2.2.0 is not compatible with Express 5's read-only req.query
app.use((req, res, next) => {
    // Sanitize body
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    // Sanitize params
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }
    // For query, we need to create a new object since it's read-only in Express 5
    if (req.query && Object.keys(req.query).length > 0) {
        const sanitizedQuery = sanitizeObject({ ...req.query });
        // Replace the query object
        Object.defineProperty(req, 'query', {
            value: sanitizedQuery,
            writable: true,
            enumerable: true,
            configurable: true
        });
    }
    next();
});

// Helper function to sanitize objects
function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            
            // Check for dangerous keys
            if (key.includes('$') || key.includes('.')) {
                logger.warn(`Sanitized potentially malicious key: ${key}`);
                continue; // Skip dangerous keys
            }
            
            // Recursively sanitize nested objects
            if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
    }
    
    return sanitized;
}

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Request logging middleware - basic logging for all requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// User activity logging middleware - detailed logging for authenticated users
app.use(logUserActivity);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/theme', themeRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/attendance-devices', attendanceDeviceRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/backup-executions', backupExecutionRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/document-templates', documentTemplateRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/hardcopies', hardcopyRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/sick-leaves', sickLeaveRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api/vacations', vacationRoutes);
app.use('/api/mixed-vacations', mixedVacationRoutes);
app.use('/api/forget-checks', forgetCheckRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/permission-requests', permissionRequestRoutes);
app.use('/api/system-permissions', systemPermissionRoutes);
app.use('/api/permission-audits', permissionAuditRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/resigned-employees', resignedEmployeeRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/security/settings', securitySettingsRoutes);
app.use('/api/security/audit', securityAuditRoutes);
app.use('/api/surveys', surveyRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

// API endpoint to receive logs from frontend
app.post('/api/logs', (req, res) => {
    const { level, message, meta } = req.body;
    if (level && message) {
        logger[level](message, { source: 'frontend', ...meta });
        res.status(200).json({ success: true, message: 'Log recorded' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid log format' });
    }
});

app.use(notFound);
app.use(errorHandler);

// Export app for testing
export { app };

// Only start server and connect to DB if this file is run directly
// Check if this module is being run directly (not imported for testing)
const isMainModule = process.argv[1] && process.argv[1].endsWith('index.js');

if (isMainModule) {
    // Connect to MongoDB
    connectDB();

    const server = app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);

        // Start scheduled tasks
        startAllScheduledTasks();
        
        // Initialize backup scheduler
        backupScheduler.initialize().catch(err => {
            logger.error('Failed to initialize backup scheduler:', err);
        });
        
        // Start attendance cron jobs
        attendanceCron.startAllAttendanceTasks();
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        logger.info('Shutting down gracefully...');

        stopAllTasks();
        backupScheduler.stopAll();
        attendanceCron.stopAllAttendanceTasks();
        server.close(() => {
            logger.info('Server closed');

            process.exit(0);
        });
    });

    process.on('SIGTERM', () => {
        logger.info('Shutting down gracefully...');

        stopAllTasks();
        backupScheduler.stopAll();
        attendanceCron.stopAllAttendanceTasks();
        server.close(() => {
            logger.info('Server closed');

            process.exit(0);
        });
    });
}