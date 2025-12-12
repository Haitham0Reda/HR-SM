import express from 'express';
import {
    getAllRequests,
    createRequest,
    getRequestById,
    updateRequest,
    deleteRequest
} from './controllers/request.controller.js';
import { protect, checkActive } from '../../../middleware/index.js';
import { calculatePermissionDuration } from '../../../middleware/index.js';

const router = express.Router();

// Get all requests - protected
router.get('/', protect, getAllRequests);

// Create request - with validation middleware
router.post('/',
    protect,
    checkActive,
    calculatePermissionDuration,
    createRequest
);

// Get request by ID
router.get('/:id', protect, getRequestById);

// Update request
router.put('/:id', protect, updateRequest);

// Delete request
router.delete('/:id', protect, deleteRequest);

export default router;