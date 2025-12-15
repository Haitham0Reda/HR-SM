import express from 'express';
import {
    getAllHardCopies,
    createHardCopy,
    getHardCopyById,
    updateHardCopy,
    deleteHardCopy,
    uploadHardCopy,
    upload
} from '../controllers/hardcopy.controller.js';
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';
import { requireModule } from '../../../shared/middleware/moduleGuard.js';

const router = express.Router();

// Apply authentication and module guard to all routes
router.use(requireAuth);
router.use(requireModule('documents'));

// Get all hard copies - All authenticated users
router.get('/', getAllHardCopies);

// Create hard copy - HR or Admin only
router.post('/', requireRole('hr', 'admin'), createHardCopy);

// Upload hard copy file - HR or Admin only
router.post('/upload', requireRole('hr', 'admin'), upload.single('file'), uploadHardCopy);

// Get hard copy by ID - All authenticated users
router.get('/:id', getHardCopyById);

// Update hard copy - HR or Admin only
router.put('/:id', requireRole('hr', 'admin'), updateHardCopy);

// Delete hard copy - HR or Admin only
router.delete('/:id', requireRole('hr', 'admin'), deleteHardCopy);

export default router;