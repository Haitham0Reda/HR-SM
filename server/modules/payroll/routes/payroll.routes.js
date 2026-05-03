import express from 'express';
import {
    getAllPayrolls,
    createPayroll,
    getPayrollById,
    updatePayroll,
    deletePayroll
} from '../controllers/payroll.controller.js';
import {
    getAllSalaries,
    getCurrentSalary,
    createSalary,
    updateSalary,
    deleteSalary,
    getSalaryHistory
} from '../controllers/salary.controller.js';
import { protect, hrOrAdmin, checkRole } from '../../../middleware/index.js';
import { moduleGuard } from '../../../middleware/moduleGuard.js';

const router = express.Router();

// Apply authentication to all payroll routes first
router.use(protect);

// Apply module guard after authentication (checks license features)
router.use(moduleGuard('payroll'));

// Role-based middleware for salary access
const salaryViewAccess = checkRole(['hr', 'finance', 'finance-manager', 'admin']);
const salaryManageAccess = checkRole(['hr', 'finance-manager']);

// Role-based middleware for payroll access
const payrollViewAccess = checkRole(['hr', 'finance', 'finance-manager', 'admin']);
const payrollManageAccess = checkRole(['finance-manager']); // Only finance managers can create/manage payroll

// ===== SALARY MANAGEMENT ROUTES (must be before parameterized routes) =====

// Get all salaries - HR, Finance Manager, or Admin (admin sees masked data)
router.get('/salaries', salaryViewAccess, getAllSalaries);

// Get current salary for employee - HR, Finance Manager, or Admin
router.get('/salaries/employee/:employeeId/current', salaryViewAccess, getCurrentSalary);

// Get salary history for employee - HR, Finance Manager, or Admin
router.get('/salaries/employee/:employeeId/history', salaryViewAccess, getSalaryHistory);

// Create salary - HR or Finance Manager only
router.post('/salaries', salaryManageAccess, createSalary);

// Update salary - HR or Finance Manager only
router.put('/salaries/:id', salaryManageAccess, updateSalary);

// Delete salary - HR or Finance Manager only
router.delete('/salaries/:id', salaryManageAccess, deleteSalary);

// ===== PAYROLL ROUTES (parameterized routes must come after specific routes) =====

// Get all payrolls - HR, Finance, Finance Manager, or Admin
router.get('/', payrollViewAccess, getAllPayrolls);

// Create payroll - Finance Manager only
router.post('/', payrollManageAccess, createPayroll);

// Get payroll by ID - Protected (already authenticated)
router.get('/:id', payrollViewAccess, getPayrollById);

// Update payroll - Finance Manager only
router.put('/:id', payrollManageAccess, updatePayroll);

// Delete payroll - Finance Manager only
router.delete('/:id', payrollManageAccess, deletePayroll);

export default router;
