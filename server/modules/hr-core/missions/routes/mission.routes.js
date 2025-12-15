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

// Apply authentication to all routes first
router.use(protect);

// Apply license validation to all mission routes (after authentication)
router.use(requireModuleLicense(MODULES.LEAVE));

// Get all missions - protected route
router.get('/', getAllMissions);

// Create mission - with authentication and file upload support
router.post('/',
    checkActive,
    upload.array('attachments', 5), // Allow up to 5 attachments
    createMission
);

// Approve mission
router.post('/:id/approve', approveMission);

// Reject mission
router.post('/:id/reject', rejectMission);

// Get mission by ID
router.get('/:id', getMissionById);

// Update mission
router.put('/:id', updateMission);

// Delete mission
router.delete('/:id', deleteMission);

export default router;
