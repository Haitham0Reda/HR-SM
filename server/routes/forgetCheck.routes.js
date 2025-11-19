import express from 'express';
import {
    getAllForgetChecks,
    createForgetCheck,
    getForgetCheckById,
    updateForgetCheck,
    deleteForgetCheck
} from '../controller/forgetCheck.controller.js';
import { protect, checkActive } from '../middleware/index.js';

const router = express.Router();

// Get all forget check records - protected
router.get('/', protect, getAllForgetChecks);

// Create forget check record - protected, requires active employee
router.post('/', protect, checkActive, createForgetCheck);

// Get forget check by ID
router.get('/:id', protect, getForgetCheckById);

// Update forget check record
router.put('/:id', protect, updateForgetCheck);

// Delete forget check record - admin only recommended
router.delete('/:id', protect, deleteForgetCheck);

export default router;