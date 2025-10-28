// Announcement Controller
import Announcement from '../models/announcement.model.js';

export const getAllAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find();
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createAnnouncement = async (req, res) => {
    try {
        const announcement = new Announcement(req.body);
        await announcement.save();
        res.status(201).json(announcement);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getAnnouncementById = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
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
