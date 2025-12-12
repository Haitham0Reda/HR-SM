import express from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';
import { requireModule } from '../../../shared/middleware/moduleGuard.js';
import { MODULES, ROLES } from '../../../shared/constants/modules.js';
import {
    submitTaskReport,
    getTaskReports,
    getReport,
    reviewReport,
    downloadReportFile,
    getReportAnalytics
} from '../controllers/taskReportController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/task-reports/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter
});

// All routes require authentication and tasks module
router.use(requireAuth);
router.use(requireModule(MODULES.TASKS));

// Report routes
router.post('/task/:taskId', upload.array('files', 5), submitTaskReport);
router.get('/task/:taskId', getTaskReports);
router.get('/analytics', getReportAnalytics);
router.get('/:id', getReport);
router.patch('/:id/review', requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN), reviewReport);
router.get('/:reportId/files/:fileId', downloadReportFile);

export default router;
