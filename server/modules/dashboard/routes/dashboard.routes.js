import express from 'express';
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';
import { ROLES } from '../../../shared/constants/modules.js';
import {
    getDashboardConfig,
    updateDashboardConfig,
    getEmployeeOfTheMonth,
    setEmployeeOfTheMonth,
    getDashboardStatistics,
} from '../controllers/dashboard.controller.js';

const router = express.Router();

// Get dashboard configuration
router.get('/config', requireAuth, getDashboardConfig);

// Update dashboard configuration (admin/hr only)
router.put('/config', requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), updateDashboardConfig);

// Get employee of the month
router.get('/employee-of-month', requireAuth, getEmployeeOfTheMonth);

// Set employee of the month (admin/hr only)
router.post('/employee-of-month', requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), setEmployeeOfTheMonth);

// Get dashboard statistics
router.get('/statistics', requireAuth, getDashboardStatistics);

export default router;
