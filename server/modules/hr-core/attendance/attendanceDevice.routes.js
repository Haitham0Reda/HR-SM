import express from 'express';
import multer from 'multer';
import {
    getAllDevices,
    getDeviceById,
    registerDevice,
    updateDevice,
    deleteDevice,
    testConnection,
    syncDevice,
    syncAllDevices,
    getDeviceStats,
    receivePushedLogs,
    importCSV
} from './controllers/attendanceDevice.controller.js';
import { protect, checkRole } from '../../../middleware/index.js';
import { tenantContext } from '../../../core/middleware/tenantContext.js';

const router = express.Router();

// Configure multer for file uploads (CSV import)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
        }
    }
});

// Public endpoint for devices to push logs (requires device authentication in production)
router.post('/push', receivePushedLogs);

// Protected routes - require authentication and tenant context
router.use(protect);
router.use(tenantContext);

// Device management routes
router.get('/', getAllDevices);
router.get('/stats', getDeviceStats);
router.post('/register', checkRole(['admin', 'hr']), registerDevice);
router.get('/:id', getDeviceById);
router.put('/:id', checkRole(['admin', 'hr']), updateDevice);
router.delete('/:id', checkRole(['admin']), deleteDevice);

// Device operations
router.post('/:id/test-connection', testConnection);
router.post('/:id/sync', syncDevice);
router.post('/sync-all', syncAllDevices);

// CSV import
router.post('/import/csv', checkRole(['admin', 'hr']), upload.single('file'), importCSV);

export default router;
