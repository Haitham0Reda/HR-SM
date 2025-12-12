import express from 'express';
import {
    getAllForgetChecks,
    createForgetCheck,
    getForgetCheckById,
    updateForgetCheck,
    deleteForgetCheck,
    approveForgetCheck,
    rejectForgetCheck
} from '../controllers/forgetCheck.controller.js';
import { protect, checkActive } from '../middleware/index.js';

const router = express.Router();

// Get all forget check requests
router.get('/', protect, getAllForgetChecks);

// Create forget check request
router.post('/', protect, checkActive, createForgetCheck);

// Approve forget check request
router.post('/:id/approve', protect, approveForgetCheck);

// Reject forget check request
router.post('/:id/reject', protect, rejectForgetCheck);

// Get forget check by ID
router.get('/:id', protect, getForgetCheckById);

// Update forget check
router.put('/:id', protect, updateForgetCheck);

// Delete forget check
router.delete('/:id', protect, deleteForgetCheck);

export default router;
