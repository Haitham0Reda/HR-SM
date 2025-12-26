import express from 'express';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../../../middleware/validation.middleware.js';
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';
import { requireModule } from '../../../shared/middleware/moduleGuard.js';
import { MODULES, ROLES } from '../../../shared/constants/modules.js';
import {
    createTask,
    getTasks,
    getTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    getTaskAnalytics,
    getTaskReports,
    upsertTaskReport,
    reviewTaskReport
} from '../controllers/taskController.js';

const router = express.Router();

// All routes require authentication and tasks module
router.use(requireAuth);
router.use(requireModule(MODULES.TASKS));

// Validation rules
const validateTaskCreate = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority level'),
    body('dueDate')
        .optional()
        .isISO8601()
        .withMessage('Due date must be a valid date'),
    body('assignedTo')
        .optional()
        .isMongoId()
        .withMessage('Invalid assignee ID'),
    handleValidationErrors
];

const validateTaskUpdate = [
    param('id')
        .isMongoId()
        .withMessage('Invalid task ID'),
    body('title')
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority level'),
    body('status')
        .optional()
        .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
        .withMessage('Invalid status'),
    handleValidationErrors
];

const validateTaskStatus = [
    param('id')
        .isMongoId()
        .withMessage('Invalid task ID'),
    body('status')
        .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
        .withMessage('Invalid status'),
    handleValidationErrors
];

const validateTaskId = [
    param('id')
        .isMongoId()
        .withMessage('Invalid task ID'),
    handleValidationErrors
];

const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
];

// Task CRUD
router.post('/', requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN), validateTaskCreate, createTask);
router.get('/', validatePagination, getTasks);
router.get('/analytics', getTaskAnalytics);
router.get('/:id', validateTaskId, getTask);
router.put('/:id', requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN), validateTaskUpdate, updateTask);
router.patch('/:id/status', validateTaskStatus, updateTaskStatus);
router.delete('/:id', requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN), validateTaskId, deleteTask);

// Task Reports
router.get('/:id/reports', validateTaskId, getTaskReports);
router.post('/:id/reports', validateTaskId, upsertTaskReport);
router.post('/:id/reports/review', requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN), validateTaskId, reviewTaskReport);

export default router;
