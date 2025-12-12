import express from 'express';
import {
    getAllEvents,
    createEvent,
    getEventById,
    updateEvent,
    deleteEvent
} from '../controllers/event.controller.js';
import {
    protect,
    hrOrAdmin,
    validateEventDates,
    setEventCreatedBy,
    validateAttendees,
    validateEventNotPast
} from '../../../middleware/index.js';

const router = express.Router();

// Get all events - All authenticated users can view
router.get('/', protect, getAllEvents);

// Create event - HR or Admin only with validation
router.post('/',
    protect,
    hrOrAdmin,
    validateEventDates,
    validateEventNotPast,
    setEventCreatedBy,
    validateAttendees,
    createEvent
);

// Get event by ID - All authenticated users
router.get('/:id', protect, getEventById);

// Update event - HR or Admin only with validation
router.put('/:id',
    protect,
    hrOrAdmin,
    validateEventDates,
    validateAttendees,
    updateEvent
);

// Delete event - HR or Admin only
router.delete('/:id', protect, hrOrAdmin, deleteEvent);

export default router;
