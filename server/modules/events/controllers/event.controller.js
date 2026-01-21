// Event Controller
import EventService from '../services/EventService.js';
import { createEventNotifications } from '../../../middleware/index.js';

const eventService = new EventService();

export const getAllEvents = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const events = await eventService.getAllEvents(tenantId);
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createEvent = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const savedEvent = await eventService.createEvent(req.body, tenantId, req.user._id);

        // Create notifications for attendees
        await createEventNotifications(savedEvent);

        res.status(201).json(savedEvent);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getEventById = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const event = await eventService.getEventById(req.params.id, tenantId);
        res.json(event);
    } catch (err) {
        if (err.message === 'Event not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const updateEvent = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const event = await eventService.updateEvent(req.params.id, req.body, tenantId);
        res.json(event);
    } catch (err) {
        if (err.message === 'Event not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(400).json({ error: err.message });
    }
};

export const deleteEvent = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const result = await eventService.deleteEvent(req.params.id, tenantId);
        res.json(result);
    } catch (err) {
        if (err.message === 'Event not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};
