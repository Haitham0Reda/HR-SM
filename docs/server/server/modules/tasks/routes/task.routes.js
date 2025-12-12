import express from 'express';
import multer from 'multer';
import {
    getUserTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    getTaskReports,
    upsertTaskReport,
    submitTaskReport,
    reviewTaskReport,
    uploadReportFile,
    downloadReportFile
} from '../controllers/task.controller.js';
import {
    protect,
    managerOrAbove
} from '../../../middleware/index.js';
import { requireFeature } from '../../../middleware/featureFlag.middleware.js';
import { requireModuleLicense } from '../../../middleware/licenseValidation.middleware.js';
import { MODULES } from '../../../models/license.model.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Max 5 files per upload
    },
    fileFilter: (req, file, cb) => {
        // Allow common document types
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'));
        }
    }
});

// All routes require authentication and task module license
router.use(protect);
router.use(requireModuleLicense(MODULES.TASKS));

// Task management routes
router.route('/')
    .get(getUserTasks)
    .post(managerOrAbove, createTask);

router.route('/:id')
    .get(getTaskById)
    .put(updateTask)
    .delete(deleteTask);

router.put('/:id/status', updateTaskStatus);

// Task report routes
router.route('/:id/reports')
    .get(getTaskReports)
    .post(upsertTaskReport);

router.post('/:id/reports/submit', submitTaskReport);
router.post('/:id/reports/review', managerOrAbove, reviewTaskReport);

// File upload/download routes
router.post('/:id/reports/upload', upload.single('file'), uploadReportFile);
router.get('/files/:fileId', downloadReportFile);

export default router;