import express from 'express';
import { protect, hrOrAdmin } from '../middleware/authMiddleware.js';
import {
    getDashboardConfig,
    updateDashboardConfig,
    getEmployeeOfTheMonth,
    setEmployeeOfTheMonth,
    getDashboardStatistics,
} from '../controller/dashboard.controller.js';

const router = express.Router();

// Get dashboard configuration
router.get('/config', protect, getDashboardConfig);

// Update dashboard configuration (admin/hr only)
router.put('/config', protect, hrOrAdmin, updateDashboardConfig);

// Get employee of the month
router.get('/employee-of-month', protect, getEmployeeOfTheMonth);

// Set employee of the month (admin/hr only)
router.post('/employee-of-month', protect, hrOrAdmin, setEmployeeOfTheMonth);

// Get dashboard statistics
router.get('/statistics', protect, getDashboardStatistics);

export default router;
