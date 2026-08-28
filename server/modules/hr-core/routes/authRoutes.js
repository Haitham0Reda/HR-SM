import express from 'express';
import { requireAuth } from '../../../shared/middleware/auth.js';
import {
    register,
    login,
    getCurrentUser,
    logout
} from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getCurrentUser);
router.post('/logout', requireAuth, logout);

export default router;
