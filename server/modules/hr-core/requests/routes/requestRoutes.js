import express from 'express';
import {
    getAllRequests,
    createRequest,
    getRequestById,
    updateRequest,
    deleteRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    getPendingRequests,
    getRequestsByType
} from '../controllers/requestController.js';
import { protect, checkActive, checkRole } from '../../../../middleware/index.js';
import { tenantContext } from '../../../../core/middleware/tenantContext.js';

const router = express.Router();

// Apply tenant context middleware to all routes
router.use(tenantContext);

// Get all requests - protected
router.get('/', protect, getAllRequests);

// Get pending requests
router.get('/pending', protect, checkRole(['admin', 'hr', 'manager']), getPendingRequests);

// Get requests by type
router.get('/type/:type', protect, getRequestsByType);

// Create request - protected, requires active employee
router.post('/', protect, checkActive, createRequest);

// Get request by ID
router.get('/:id', protect, getRequestById);

// Update request
router.put('/:id', protect, updateRequest);

// Delete request
router.delete('/:id', protect, deleteRequest);

// Approve request
router.post('/:id/approve', protect, checkRole(['admin', 'hr', 'manager']), approveRequest);

// Reject request
router.post('/:id/reject', protect, checkRole(['admin', 'hr', 'manager']), rejectRequest);

// Cancel request
router.post('/:id/cancel', protect, cancelRequest);

export default router;
