import express from 'express';
import {
    getAllMissions,
    createMission,
    getMissionById,
    updateMission,
    deleteMission
} from '../controllers/missionController.js';
import { protect, checkActive, checkRole } from '../../../../middleware/index.js';
import { tenantContext } from '../../../../core/middleware/tenantContext.js';

const router = express.Router();

// Apply tenant context middleware to all routes
router.use(tenantContext);

// Get all missions
router.get('/', protect, getAllMissions);

// Create mission
router.post('/', protect, checkActive, createMission);

// Get mission by ID
router.get('/:id', protect, getMissionById);

// Update mission
router.put('/:id', protect, updateMission);

// Delete mission
router.delete('/:id', protect, checkRole(['admin', 'hr']), deleteMission);

export default router;
