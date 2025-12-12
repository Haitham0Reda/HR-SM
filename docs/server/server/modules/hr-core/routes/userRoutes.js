import express from 'express';
import { requireAuth, requireRole, requireSelfOrRole } from '../../../shared/middleware/auth.js';
import { ROLES } from '../../../shared/constants/modules.js';
import {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getSubordinates
} from '../controllers/userController.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', requireRole(ROLES.HR, ROLES.ADMIN), getUsers);
router.post('/', requireRole(ROLES.HR, ROLES.ADMIN), createUser);
router.get('/:id', requireSelfOrRole(ROLES.HR, ROLES.ADMIN), getUser);
router.put('/:id', requireRole(ROLES.HR, ROLES.ADMIN), updateUser);
router.delete('/:id', requireRole(ROLES.ADMIN), deleteUser);
router.get('/:id/subordinates', getSubordinates);

export default router;
