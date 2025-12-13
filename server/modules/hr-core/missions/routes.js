import express from 'express';
import {
    getAllMissions,
    createMission,
    getMissionById,
    updateMission,
    deleteMission,
    approveMission,
    rejectMission
} from './controllers/mission.controller.js';
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';
import { ROLES } from '../../../shared/constants/modules.js';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get all missions - All authenticated users can view
router.get('/', getAllMissions);

// Create mission - All authenticated users can create
router.post('/', createMission);

// Approve mission - HR/Admin only
router.post('/:id/approve', requireRole([ROLES.ADMIN, ROLES.HR]), approveMission);

// Reject mission - HR/Admin only
router.post('/:id/reject', requireRole([ROLES.ADMIN, ROLES.HR]), rejectMission);

// Get mission by ID - All authenticated users
router.get('/:id', getMissionById);

// Update mission - All authenticated users can update their own
router.put('/:id', updateMission);

// Delete mission - All authenticated users can delete their own
router.delete('/:id', deleteMission);

export default router;