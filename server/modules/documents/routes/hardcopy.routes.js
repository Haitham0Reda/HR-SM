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
import { protect } from '../../../middleware/authMiddleware.js';
import { requireRole } from '../../../shared/middleware/auth.js';
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../shared/constants/modules.js';

const router = express.Router();

// Apply authentication and module license validation to all routes
router.use(protect);
router.use(requireModuleLicense(MODULES.DOCUMENTS));

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