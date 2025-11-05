import express from 'express';
import {
    getAllPositions,
    createPosition,
    getPositionById,
    updatePosition,
    deletePosition
} from '../controller/position.controller.js';
import { protect, admin } from '../middleware/index.js';

const router = express.Router();

// Get all positions - All authenticated users can view
router.get('/', protect, getAllPositions);

// Create position - Admin only
router.post('/', protect, admin, createPosition);

// Get position by ID - All authenticated users
router.get('/:id', protect, getPositionById);

// Update position - Admin only
router.put('/:id', protect, admin, updatePosition);

// Delete position - Admin only
router.delete('/:id', protect, admin, deletePosition);

export default router;
