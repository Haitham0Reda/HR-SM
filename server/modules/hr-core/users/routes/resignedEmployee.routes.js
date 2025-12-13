import express from 'express';
import {
    getAllResignedEmployees,
    createResignedEmployee,
    getResignedEmployeeById,
    updateResignedEmployee,
    deleteResignedEmployee
} from '../controllers/resignedEmployee.controller.js';
import { requireAuth, requireRole } from '../../../../shared/middleware/auth.js';
import { ROLES } from '../../../../shared/constants/modules.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get all resigned employees - HR/Admin/Manager allowed
router.get('/', requireRole(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), getAllResignedEmployees);

// Create resigned employee record - HR/Admin/Manager allowed
router.post('/', requireRole(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), createResignedEmployee);

// Get resigned employee by ID - HR/Admin/Manager allowed
router.get('/:id', requireRole(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), getResignedEmployeeById);

// Update resigned employee - HR/Admin/Manager allowed
router.put('/:id', requireRole(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), updateResignedEmployee);

// Delete resigned employee - Admin only
router.delete('/:id', requireRole(ROLES.ADMIN), deleteResignedEmployee);

export default router;