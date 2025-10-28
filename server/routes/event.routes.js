import express from 'express';
import {
    getAllEvents,
    createEvent,
    getEventById,
    updateEvent,
    deleteEvent
} from '../controller/event.controller.js';

const router = express.Router();

router.get('/', getAllEvents);
router.post('/', createEvent);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;
