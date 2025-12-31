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

// Import real document routes
import documentRoutesImport from '../modules/documents/routes/document.routes.js';
import documentTemplateRoutesImport from '../modules/documents/routes/documentTemplate.routes.js';

// Legacy routes that don't exist yet - use placeholder routers
// Import real feature flag routes
import featureFlagRoutesImport from './featureFlags.routes.js';
export const featureFlagRoutes = featureFlagRoutesImport;
export const documentRoutes = documentRoutesImport;
export const documentTemplateRoutes = documentTemplateRoutesImport;
// Import real event routes
import eventRoutesImport from './events.routes.js';
export const eventRoutes = eventRoutesImport;
export const payrollRoutes = payrollRoutesImport; // Use real payroll routes
export const reportRoutes = createPlaceholderRouter('Report');
// Import real survey routes
import surveyRoutesImport from './surveys.routes.js';
export const surveyRoutes = surveyRoutesImport;
// Import theme routes from the theme module
import themeRoutesImport from '../modules/theme/routes/theme.routes.js';
export const themeRoutes = themeRoutesImport;

// Import real department, position, and resigned employee routes
import departmentRoutesImport from '../modules/hr-core/users/routes/department.routes.js';
import positionRoutesImport from '../modules/hr-core/users/routes/position.routes.js';
import resignedEmployeeRoutesImport from '../modules/hr-core/users/routes/resignedEmployee.routes.js';

// Import real analytics routes
import analyticsRoutesImport from '../modules/analytics/routes/analytics.routes.js';
export const analyticsRoutes = analyticsRoutesImport;

// Import real announcement routes
import announcementRoutesImport from '../modules/announcements/routes/announcement.routes.js';
export const announcementRoutes = announcementRoutesImport;
// Import hardcopy routes
import hardcopyRoutesImport from '../modules/documents/routes/hardcopy.routes.js';
export const hardcopyRoutes = hardcopyRoutesImport;
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
// Import real auth routes
import authRoutesImport from '../modules/hr-core/routes/authRoutes.js';
export const authRoutes = authRoutesImport;
export const userRoutes = createPlaceholderRouter('User');
export const attendanceRoutes = createPlaceholderRouter('Attendance');