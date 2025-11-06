// Announcement Controller
import Announcement from '../models/announcement.model.js';
import { createAnnouncementNotifications } from '../middleware/index.js';

export const getAllAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate('createdBy', 'username email')
            .populate('departments', 'name code')
            .sort({ publishDate: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createAnnouncement = async (req, res) => {
    try {
        const announcement = new Announcement(req.body);
        const savedAnnouncement = await announcement.save();

        // Create notifications for targeted audience
        await createAnnouncementNotifications(savedAnnouncement);

        res.status(201).json(savedAnnouncement);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getAnnouncementById = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id)
            .populate('createdBy', 'username email')
            .populate('departments', 'name code')
            .populate('employees', 'username email');
        if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
        res.json(announcement);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
        res.json(announcement);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndDelete(req.params.id);
        if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
