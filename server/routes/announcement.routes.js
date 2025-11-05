import express from 'express';
import {
    getAllAnnouncements,
    createAnnouncement,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement
} from '../controller/announcement.controller.js';
import { protect, hrOrAdmin } from '../middleware/index.js';

const router = express.Router();

// Get all announcements - All authenticated users can view
router.get('/', protect, getAllAnnouncements);

// Create announcement - HR or Admin only
router.post('/', protect, hrOrAdmin, createAnnouncement);

// Get announcement by ID - All authenticated users
router.get('/:id', protect, getAnnouncementById);

// Update announcement - HR or Admin only
router.put('/:id', protect, hrOrAdmin, updateAnnouncement);

// Delete announcement - HR or Admin only
router.delete('/:id', protect, hrOrAdmin, deleteAnnouncement);

export default router;
