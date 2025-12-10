import express from 'express';
import {
    getAllPositions,
    createPosition,
    getPositionById,
    updatePosition,
    deletePosition
} from '../controller/position.controller.js';
import {
    protect,
    admin,
    checkPositionCodeUnique,
    validatePositionDepartment,
    validatePositionDeletion
} from '../middleware/index.js';

const router = express.Router();

// Get all positions - All authenticated users can view
router.get('/', protect, getAllPositions);

// Create position - Admin only with validation
router.post('/',
    protect,
    admin,
    checkPositionCodeUnique,
    validatePositionDepartment,
    createPosition
);

// Get position by ID - All authenticated users
router.get('/:id', protect, getPositionById);

// Update position - Admin only with validation
router.put('/:id',
    protect,
    admin,
    checkPositionCodeUnique,
    validatePositionDepartment,
    updatePosition
);

// Delete position - Admin only with validation
router.delete('/:id',
    protect,
    admin,
    validatePositionDeletion,
    deletePosition
);

export default router;
