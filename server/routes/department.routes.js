import express from 'express';
import {
    getAllDepartments,
    createDepartment,
    getDepartmentById,
    updateDepartment,
    deleteDepartment
} from '../controller/department.controller.js';
import {
    protect,
    admin,
    checkDepartmentCodeUnique,
    validateManager,
    validateSchool
} from '../middleware/index.js';

const router = express.Router();

// Get all departments - All authenticated users can view
router.get('/', protect, getAllDepartments);

// Create department - Admin only with validation
router.post('/',
    protect,
    admin,
    checkDepartmentCodeUnique,
    validateManager,
    validateSchool,
    createDepartment
);

// Get department by ID - All authenticated users
router.get('/:id', protect, getDepartmentById);

// Update department - Admin only with validation
router.put('/:id',
    protect,
    admin,
    checkDepartmentCodeUnique,
    validateManager,
    validateSchool,
    updateDepartment
);

// Delete department - Admin only
router.delete('/:id', protect, admin, deleteDepartment);

export default router;
