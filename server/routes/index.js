/**
 * Central route exports
 * This file exports all routes from their module locations
 * Used for backward compatibility with legacy route mounting in app.js
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
export const subscriptionRoutes = subscriptionRoutesImport;

// Import real routes from module locations
import notificationRoutesImport from './notificationRoutes.js';
import dashboardRoutesImport from './dashboardRoutes.js';
import eventRoutesImport from './events.routes.js';
import featureFlagRoutesImport from './featureFlags.routes.js';

export const notificationRoutes = notificationRoutesImport;
export const dashboardRoutes = dashboardRoutesImport;
export const eventRoutes = eventRoutesImport;
export const featureFlagRoutes = featureFlagRoutesImport;

// Import module route modules (bound from their module locations)
import payrollRoutesImport from '../modules/payroll/routes/payroll.routes.js';
import documentRoutesImport from '../modules/documents/routes/document.routes.js';
import documentTemplateRoutesImport from '../modules/documents/routes/documentTemplate.routes.js';
import hardcopyRoutesImport from '../modules/documents/routes/hardcopy.routes.js';
import surveyRoutesImport from '../modules/surveys/routes/survey.routes.js';
import themeRoutesImport from '../modules/theme/routes/theme.routes.js';
import analyticsRoutesImport from '../modules/analytics/routes/analytics.routes.js';
import announcementRoutesImport from '../modules/announcements/routes/announcement.routes.js';
import authRoutesImport from '../modules/hr-core/routes/authRoutes.js';
import holidayRoutesImport from '../modules/hr-core/holidays/routes/holiday.routes.js';
import missionRoutesImport from '../modules/hr-core/missions/routes.js';
import mixedVacationRoutesImport from '../modules/hr-core/vacations/routes/mixedVacation.routes.js';
import forgetCheckRoutesImport from '../modules/hr-core/attendance/routes/forgetCheck.routes.js';
import permissionRequestRoutesImport from '../modules/hr-core/requests/routes/permissionRequest.routes.js';
import requestRoutesImport from '../modules/hr-core/requests/routes.js';
import backupRoutesImport from '../modules/hr-core/backup/routes/backup.routes.js';
import backupExecutionRoutesImport from '../modules/hr-core/backup/routes/backupExecution.routes.js';
import userRoutesImport from '../modules/hr-core/users/routes.js';
import attendanceRoutesImport from '../modules/hr-core/attendance/routes.js';
import overtimeRoutesImport from '../modules/hr-core/overtime/routes.js';
import reportRoutesImport from '../modules/reports/routes/report.routes.js';
import departmentRoutesImport from '../modules/hr-core/users/routes/department.routes.js';
import positionRoutesImport from '../modules/hr-core/users/routes/position.routes.js';
import resignedEmployeeRoutesImport from '../modules/hr-core/users/routes/resignedEmployee.routes.js';

// Export all bound routes
export const payrollRoutes = payrollRoutesImport;
export const documentRoutes = documentRoutesImport;
export const documentTemplateRoutes = documentTemplateRoutesImport;
export const hardcopyRoutes = hardcopyRoutesImport;
export const surveyRoutes = surveyRoutesImport;
export const themeRoutes = themeRoutesImport;
export const analyticsRoutes = analyticsRoutesImport;
export const announcementRoutes = announcementRoutesImport;
export const authRoutes = authRoutesImport;
export const holidayRoutes = holidayRoutesImport;
export const missionRoutes = missionRoutesImport;
export const mixedVacationRoutes = mixedVacationRoutesImport;
export const forgetCheckRoutes = forgetCheckRoutesImport;
export const permissionRequestRoutes = permissionRequestRoutesImport;
export const requestRoutes = requestRoutesImport;
export const backupRoutes = backupRoutesImport;
export const backupExecutionRoutes = backupExecutionRoutesImport;
export const userRoutes = userRoutesImport;
export const attendanceRoutes = attendanceRoutesImport;
export const overtimeRoutes = overtimeRoutesImport;
export const reportRoutes = reportRoutesImport;
export const departmentRoutes = departmentRoutesImport;
export const positionRoutes = positionRoutesImport;
export const resignedEmployeeRoutes = resignedEmployeeRoutesImport;

export default {
    licenseRoutes,
    licenseAuditRoutes,
    metricsRoutes,
    pricingRoutes,
    permissionRoutes,
    permissionAuditRoutes,
    securityAuditRoutes,
    securitySettingsRoutes,
    subscriptionRoutes,
    notificationRoutes,
    dashboardRoutes,
    payrollRoutes,
    documentRoutes,
    documentTemplateRoutes,
    hardcopyRoutes,
    eventRoutes,
    featureFlagRoutes,
    surveyRoutes,
    themeRoutes,
    analyticsRoutes,
    announcementRoutes,
    authRoutes,
    holidayRoutes,
    missionRoutes,
    mixedVacationRoutes,
    forgetCheckRoutes,
    permissionRequestRoutes,
    requestRoutes,
    backupRoutes,
    backupExecutionRoutes,
    userRoutes,
    attendanceRoutes,
    overtimeRoutes,
    reportRoutes,
    departmentRoutes,
    positionRoutes,
    resignedEmployeeRoutes
};
