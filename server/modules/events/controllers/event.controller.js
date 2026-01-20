// Event Controller
import Event from '../models/event.model.js';
import { createEventNotifications } from '../../../middleware/index.js';

export const getAllEvents = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const events = await Event.withTenant(tenantId)
            .populate('createdBy', 'username email')
            .populate('attendees', 'username email')
            .sort({ startDate: -1 });
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

        const event = new Event({
            ...req.body,
            tenantId,
            createdBy: req.user._id
        });
        const savedEvent = await event.save();

        // Populate for response
        await savedEvent.populate('createdBy', 'username email');
        await savedEvent.populate('attendees', 'username email');

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

        const event = await Event.findOne({ _id: req.params.id, tenantId })
            .populate('createdBy', 'username email')
            .populate('attendees', 'username email');
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateEvent = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const event = await Event.findOneAndUpdate(
            { _id: req.params.id, tenantId },
            req.body,
            { new: true }
        );
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteEvent = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const event = await Event.findOneAndDelete({ _id: req.params.id, tenantId });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json({ message: 'Event deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
