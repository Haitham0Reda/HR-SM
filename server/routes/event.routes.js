import express from 'express';
import {
    getAllEvents,
    createEvent,
    getEventById,
    updateEvent,
    deleteEvent
} from '../controller/event.controller.js';
import { protect, hrOrAdmin } from '../middleware/index.js';

const router = express.Router();

// Get all events - All authenticated users can view
router.get('/', protect, getAllEvents);

// Create event - HR or Admin only
router.post('/', protect, hrOrAdmin, createEvent);

// Get event by ID - All authenticated users
router.get('/:id', protect, getEventById);

// Update event - HR or Admin only
router.put('/:id', protect, hrOrAdmin, updateEvent);

// Delete event - HR or Admin only
router.delete('/:id', protect, hrOrAdmin, deleteEvent);

export default router;
