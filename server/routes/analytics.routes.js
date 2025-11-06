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

// Get HR dashboard overview - HR or Admin
router.get('/dashboard',
    protect,
    hrOrAdmin,
    canViewReports,
    getHRDashboard
);

// Get attendance analytics - HR or Admin
router.get('/attendance',
    protect,
    hrOrAdmin,
    canViewReports,
    getAttendanceAnalytics
);

// Get leave analytics - HR or Admin
router.get('/leave',
    protect,
    hrOrAdmin,
    canViewReports,
    getLeaveAnalytics
);

// Get employee analytics - HR or Admin
router.get('/employees',
    protect,
    hrOrAdmin,
    canViewReports,
    getEmployeeAnalytics
);

// Get payroll analytics - Admin only
router.get('/payroll',
    protect,
    hrOrAdmin,
    canViewReports,
    getPayrollAnalytics
);

// Get KPIs - HR or Admin
router.get('/kpis',
    protect,
    hrOrAdmin,
    canViewReports,
    getKPIs
);

// Get trend analysis - HR or Admin
router.get('/trends',
    protect,
    hrOrAdmin,
    canViewReports,
    getTrendAnalysis
);

export default router;
