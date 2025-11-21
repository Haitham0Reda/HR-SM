import express from 'express';
import {
    getAllHardCopies,
    createHardCopy,
    getHardCopyById,
    updateHardCopy,
    deleteHardCopy
} from '../controller/hardcopy.controller.js';
import {
    protect,
    hrOrAdmin
} from '../middleware/index.js';

const router = express.Router();

// Get all hard copies - All authenticated users
router.get('/', protect, getAllHardCopies);

// Create hard copy - HR or Admin only
router.post('/', protect, hrOrAdmin, createHardCopy);

// Get hard copy by ID - All authenticated users
router.get('/:id', protect, getHardCopyById);

// Update hard copy - HR or Admin only
router.put('/:id', protect, hrOrAdmin, updateHardCopy);

// Delete hard copy - HR or Admin only
router.delete('/:id', protect, hrOrAdmin, deleteHardCopy);

export default router;