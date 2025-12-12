import express from 'express';
import {
    getAllMissions,
    createMission,
    getMissionById,
    updateMission,
    deleteMission,
    approveMission,
    rejectMission
} from '../controllers/mission.controller.js';
import { protect, checkActive } from '../middleware/index.js';
import upload from '../../../../config/multer.config.js';
import { requireModuleLicense } from '../../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../../models/license.model.js';

const router = express.Router();

// Apply license validation to all mission routes
router.use(requireModuleLicense(MODULES.LEAVE));

// Get all missions - protected route
router.get('/', protect, getAllMissions);

// Create mission - with authentication and file upload support
router.post('/',
    protect,
    checkActive,
    upload.array('attachments', 5), // Allow up to 5 attachments
    createMission
);

// Approve mission
router.post('/:id/approve', protect, approveMission);

// Reject mission
router.post('/:id/reject', protect, rejectMission);

// Get mission by ID
router.get('/:id', protect, getMissionById);

// Update mission
router.put('/:id', protect, updateMission);

// Delete mission
router.delete('/:id', protect, deleteMission);

export default router;
