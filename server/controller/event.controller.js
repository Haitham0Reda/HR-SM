// Event Controller
import Event from '../models/event.model.js';
import { createEventNotifications } from '../middleware/index.js';

export const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find()
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
        const event = new Event(req.body);
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
        const event = await Event.findById(req.params.id)
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
        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json({ message: 'Event deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
