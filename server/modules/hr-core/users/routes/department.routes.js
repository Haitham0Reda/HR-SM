import express from 'express';
import {
    getAllDepartments,
    createDepartment,
    getDepartmentById,
    updateDepartment,
    deleteDepartment
} from '../controllers/department.controller.js';
import { requireAuth, requireRole } from '../../../../shared/middleware/auth.js';
import { ROLES } from '../../../../shared/constants/modules.js';

const router = express.Router();

// Get all departments - All authenticated users can view
router.get('/', requireAuth, getAllDepartments);

// Create department - Admin only
router.post('/', requireAuth, requireRole(ROLES.ADMIN), createDepartment);

// Get department by ID - All authenticated users
router.get('/:id', requireAuth, getDepartmentById);

// Update department - Admin only
router.put('/:id', requireAuth, requireRole(ROLES.ADMIN), updateDepartment);

// Delete department - Admin only
router.delete('/:id', requireAuth, requireRole(ROLES.ADMIN), deleteDepartment);

export default router;
