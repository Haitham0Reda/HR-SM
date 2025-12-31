import express from 'express';
import {
    getHRDashboard,
    getAttendanceAnalytics,
    getLeaveAnalytics,
    getEmployeeAnalytics,
    getPayrollAnalytics,
    getKPIs,
    getTrendAnalysis
} from '../controllers/analytics.controller.js';
import {
    protect,
    hrOrAdmin,
    canViewReports
} from '../../../middleware/index.js';
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../platform/system/models/license.model.js';

const router = express.Router();

// Apply authentication to all routes first
router.use(protect);

// Apply license validation to all analytics routes (after authentication)
router.use(requireModuleLicense(MODULES.REPORTING));

// Apply common middleware to all routes
router.use(hrOrAdmin, canViewReports);

// Root analytics route
router.get('/', getHRDashboard);

// Route configurations
const routes = [
    { path: '/dashboard', method: 'get', handler: getHRDashboard },
    { path: '/attendance', method: 'get', handler: getAttendanceAnalytics },
    { path: '/leave', method: 'get', handler: getLeaveAnalytics },
    { path: '/employees', method: 'get', handler: getEmployeeAnalytics },
    { path: '/payroll', method: 'get', handler: getPayrollAnalytics },
    { path: '/kpis', method: 'get', handler: getKPIs },
    { path: '/trends', method: 'get', handler: getTrendAnalysis }
];

// Register all routes
routes.forEach(({ path, method, handler }) => {
    router[method](path, handler);
});

export default router;
