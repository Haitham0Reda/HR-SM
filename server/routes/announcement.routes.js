import express from 'express';
import {
    getAllAnnouncements,
    createAnnouncement,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement,
    getActiveAnnouncements,
    getAnnouncementsByStatus
} from '../controller/announcement.controller.js';
import {
    protect,
    hrOrAdmin,
    validateAnnouncementDates,
    validateTargetAudience,
    setCreatedBy
} from '../middleware/index.js';

const router = express.Router();

// Get active announcements - All authenticated users can view
router.get('/active', protect, getActiveAnnouncements);

// Get announcements by status (upcoming, active, expired) - All authenticated users can view
router.get('/status/:status', protect, getAnnouncementsByStatus);

// Get all announcements - All authenticated users can view
router.get('/', protect, getAllAnnouncements);

// Create announcement - HR or Admin only with validation
router.post('/',
    protect,
    hrOrAdmin,
    validateAnnouncementDates,
    validateTargetAudience,
    setCreatedBy,
    createAnnouncement
);

// Get announcement by ID - All authenticated users
router.get('/:id', protect, getAnnouncementById);

// Update announcement - HR or Admin only with validation
router.put('/:id',
    protect,
    hrOrAdmin,
    validateAnnouncementDates,
    validateTargetAudience,
    updateAnnouncement
);

// Delete announcement - HR or Admin only
router.delete('/:id', protect, hrOrAdmin, deleteAnnouncement);

export default router;