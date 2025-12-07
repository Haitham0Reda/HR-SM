import express from 'express';
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
    getTaskAnalytics
} from '../controllers/taskController.js';

const router = express.Router();

// All routes require authentication and tasks module
router.use(requireAuth);
router.use(requireModule(MODULES.TASKS));

// Task CRUD
router.post('/', requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN), createTask);
router.get('/', getTasks);
router.get('/analytics', getTaskAnalytics);
router.get('/:id', getTask);
router.put('/:id', requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN), updateTask);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN), deleteTask);

export default router;
