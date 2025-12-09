import express from 'express';
import {
    getAllVacations,
    createVacation,
    getVacationById,
    updateVacation,
    deleteVacation
} from '../controllers/vacationController.js';
import { protect, checkActive, checkRole } from '../../../../middleware/index.js';
import { tenantContext } from '../../../../core/middleware/tenantContext.js';

const router = express.Router();

// Apply tenant context middleware to all routes
router.use(tenantContext);

// Get all vacations
router.get('/', protect, getAllVacations);

// Create vacation
router.post('/', protect, checkActive, createVacation);

// Get vacation by ID
router.get('/:id', protect, getVacationById);

// Update vacation
router.put('/:id', protect, updateVacation);

// Delete vacation
router.delete('/:id', protect, checkRole(['admin', 'hr']), deleteVacation);

export default router;
