import express from 'express';
import {
    getHRDashboard,
    getAttendanceAnalytics,
    getLeaveAnalytics,
    getEmployeeAnalytics,
    getPayrollAnalytics,
    getKPIs,
    getTrendAnalysis
} from '../controller/analytics.controller.js';
import {
    protect,
    hrOrAdmin,
    canViewReports
} from '../middleware/index.js';

const router = express.Router();

// Apply common middleware to all routes
router.use(protect, hrOrAdmin, canViewReports);

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
