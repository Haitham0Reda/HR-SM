import express from 'express';
import {
    getAllSalaries,
    getCurrentSalary,
    createSalary,
    updateSalary,
    deleteSalary,
    getSalaryHistory
} from '../controllers/salary.controller.js';
import {
    protect,
    hrOrAdmin,
    financeOrAdmin
} from '../../../middleware/index.js';

const router = express.Router();

// Get all salaries - HR, Admin, or Finance
router.get('/',
    protect,
    financeOrAdmin, // Finance managers can view salaries
    getAllSalaries
);

// Get current salary for employee - HR, Admin, or Finance
router.get('/employee/:employeeId/current',
    protect,
    financeOrAdmin,
    getCurrentSalary
);

// Get salary history for employee - HR, Admin, or Finance
router.get('/employee/:employeeId/history',
    protect,
    financeOrAdmin,
    getSalaryHistory
);

// Create salary - HR or Admin only
router.post('/',
    protect,
    hrOrAdmin,
    createSalary
);

// Update salary - HR or Admin only
router.put('/:id',
    protect,
    hrOrAdmin,
    updateSalary
);

// Delete salary - Admin only
router.delete('/:id',
    protect,
    hrOrAdmin,
    deleteSalary
);

export default router;