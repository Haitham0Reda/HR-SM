import express from 'express';
import { forgotPassword, resetPassword, verifyResetToken } from '../controllers/auth.controller.js';

const router = express.Router();

// Forgot password - Send reset email
router.post('/forgot-password', forgotPassword);

// Verify reset token
router.get('/verify-reset-token/:token', verifyResetToken);

// Reset password with token
router.post('/reset-password/:token', resetPassword);

export default router;
