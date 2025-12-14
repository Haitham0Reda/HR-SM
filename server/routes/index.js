/**
 * Central route exports
 * This file exports all routes from their module locations
 */

// Import platform system routes
import licenseRoutesImport from '../platform/system/routes/license.routes.js';
import licenseAuditRoutesImport from '../platform/system/routes/licenseAudit.routes.js';
import metricsRoutesImport from '../platform/system/routes/metrics.routes.js';
import permissionRoutesImport from '../platform/system/routes/permissions.routes.js';
import permissionAuditRoutesImport from '../platform/system/routes/permissionAudit.routes.js';
import securityAuditRoutesImport from '../platform/system/routes/securityAudit.routes.js';
import securitySettingsRoutesImport from '../platform/system/routes/securitySettings.routes.js';

// Import subscription routes
import subscriptionRoutesImport from '../platform/subscriptions/routes/subscription.routes.js';
import pricingRoutesImport from '../platform/subscriptions/routes/pricing.routes.js';

// Export platform routes
export const licenseRoutes = licenseRoutesImport;
export const licenseAuditRoutes = licenseAuditRoutesImport;
export const metricsRoutes = metricsRoutesImport;
export const pricingRoutes = pricingRoutesImport;
export const permissionRoutes = permissionRoutesImport;
export const permissionAuditRoutes = permissionAuditRoutesImport;
export const securityAuditRoutes = securityAuditRoutesImport;
export const securitySettingsRoutes = securitySettingsRoutesImport;

// Create placeholder routes for legacy routes that don't exist yet
import express from 'express';

const createPlaceholderRouter = (routeName) => {
    const router = express.Router();
    router.get('*', (req, res) => {
        res.status(404).json({
            success: false,
            message: `${routeName} routes are not yet implemented`,
            code: 'ROUTE_NOT_IMPLEMENTED'
        });
    });
    return router;
};

// Import real routes
import notificationRoutesImport from './notificationRoutes.js';
import dashboardRoutesImport from './dashboardRoutes.js';

// Export real routes
export const notificationRoutes = notificationRoutesImport;
export const dashboardRoutes = dashboardRoutesImport;

// Import real payroll routes
import payrollRoutesImport from '../modules/payroll/routes/payroll.routes.js';

// Legacy routes that don't exist yet - use placeholder routers
export const featureFlagRoutes = createPlaceholderRouter('Feature Flag');
export const documentRoutes = createPlaceholderRouter('Document');
export const documentTemplateRoutes = createPlaceholderRouter('Document Template');
export const eventRoutes = createPlaceholderRouter('Event');
export const payrollRoutes = payrollRoutesImport; // Use real payroll routes
export const reportRoutes = createPlaceholderRouter('Report');
export const surveyRoutes = createPlaceholderRouter('Survey');
// Import theme routes from the theme module
import themeRoutesImport from '../modules/theme/routes/theme.routes.js';
export const themeRoutes = themeRoutesImport;

// Import real department, position, and resigned employee routes
import departmentRoutesImport from '../modules/hr-core/users/routes/department.routes.js';
import positionRoutesImport from '../modules/hr-core/users/routes/position.routes.js';
import resignedEmployeeRoutesImport from '../modules/hr-core/users/routes/resignedEmployee.routes.js';

// Legacy routes that don't exist yet - use placeholder routers
export const analyticsRoutes = createPlaceholderRouter('Analytics');
export const announcementRoutes = createPlaceholderRouter('Announcement');
export const hardcopyRoutes = createPlaceholderRouter('Hardcopy');
export const holidayRoutes = createPlaceholderRouter('Holiday');
export const missionRoutes = createPlaceholderRouter('Mission');
export const mixedVacationRoutes = createPlaceholderRouter('Mixed Vacation');
export const forgetCheckRoutes = createPlaceholderRouter('Forget Check');
export const permissionRequestRoutes = createPlaceholderRouter('Permission Request');
export const positionRoutes = positionRoutesImport;
export const requestRoutes = createPlaceholderRouter('Request');
export const resignedEmployeeRoutes = resignedEmployeeRoutesImport;
export const backupRoutes = createPlaceholderRouter('Backup');
export const backupExecutionRoutes = createPlaceholderRouter('Backup Execution');
export const departmentRoutes = departmentRoutesImport;
export const authRoutes = createPlaceholderRouter('Auth');
export const userRoutes = createPlaceholderRouter('User');
export const attendanceRoutes = createPlaceholderRouter('Attendance');