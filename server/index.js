import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { startAllScheduledTasks, stopAllTasks } from './utils/scheduler.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import backupRoutes from './routes/backup.routes.js';
import backupExecutionRoutes from './routes/backupExecution.routes.js';
import departmentRoutes from './routes/department.routes.js';
import documentRoutes from './routes/document.routes.js';
import documentTemplateRoutes from './routes/documentTemplate.routes.js';
import eventRoutes from './routes/event.routes.js';
import holidayRoutes from './routes/holiday.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import mixedVacationRoutes from './routes/mixedVacation.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import payrollRoutes from './routes/payroll.routes.js';
import systemPermissionRoutes from './routes/permission.routes.js';
import permissionRequestRoutes from './routes/permissionRequest.routes.js';
import permissionAuditRoutes from './routes/permissionAudit.routes.js';
import positionRoutes from './routes/position.routes.js';
import reportRoutes from './routes/report.routes.js';
import requestRoutes from './routes/request.routes.js';
import resignedEmployeeRoutes from './routes/resignedEmployee.routes.js';
import schoolRoutes from './routes/school.routes.js';
import securitySettingsRoutes from './routes/securitySettings.routes.js';
import securityAuditRoutes from './routes/securityAudit.routes.js';
import surveyRoutes from './routes/survey.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/backup-executions', backupExecutionRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/document-templates', documentTemplateRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/mixed-vacations', mixedVacationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/permissions', permissionRequestRoutes);
app.use('/api/system-permissions', systemPermissionRoutes);
app.use('/api/permission-audits', permissionAuditRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/resigned-employees', resignedEmployeeRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/security/settings', securitySettingsRoutes);
app.use('/api/security/audit', securityAuditRoutes);
app.use('/api/surveys', surveyRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
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
        console.log(`Server is running on port ${PORT}`);

        // Start scheduled tasks
        startAllScheduledTasks();
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('Shutting down gracefully...');
        stopAllTasks();
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });

    process.on('SIGTERM', () => {
        console.log('Shutting down gracefully...');
        stopAllTasks();
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
}