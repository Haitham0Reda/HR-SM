import express from 'express';
import {
    getAllAnnouncements,
    createAnnouncement,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement,
    getActiveAnnouncements,
    getAnnouncementsByStatus
} from '../controllers/announcement.controller.js';
import {
    protect,
    hrOrAdmin,
    validateAnnouncementDates,
    validateTargetAudience,
    setCreatedBy
} from '../../../middleware/index.js';
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../platform/system/models/license.model.js';

const router = express.Router();

// Apply authentication to all routes first
router.use(protect);

// Apply license validation to all announcement routes (after authentication)
router.use(requireModuleLicense(MODULES.COMMUNICATION));

// Get active announcements - All authenticated users can view
router.get('/active', getActiveAnnouncements);

// Get announcements by status (upcoming, active, expired) - All authenticated users can view
router.get('/status/:status', getAnnouncementsByStatus);

// Get all announcements - All authenticated users can view
router.get('/', getAllAnnouncements);

// Create announcement - HR or Admin only with validation
router.post('/',
    hrOrAdmin,
    validateAnnouncementDates,
    validateTargetAudience,
    setCreatedBy,
    createAnnouncement
);

// Get announcement by ID - All authenticated users
router.get('/:id', getAnnouncementById);

// Update announcement - HR or Admin only with validation
router.put('/:id',
    hrOrAdmin,
    validateAnnouncementDates,
    validateTargetAudience,
    updateAnnouncement
);

// Delete announcement - HR or Admin only
router.delete('/:id', hrOrAdmin, deleteAnnouncement);

export default router;