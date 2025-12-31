/**
 * Session Management Routes
 * 
 * Enhanced session management with Redis support
 * Provides endpoints for session creation, validation, and management
 * 
 * Requirements: 6.4, 9.1 - Enhanced authentication and session management
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import {
    createSession,
    getSession,
    destroySession,
    destroyAllUserSessions,
    authenticateSession,
    getUserSessions,
    validatePasswordMiddleware,
    hashPassword,
    verifyPassword,
    setupMFA,
    verifyMFA
} from '../middleware/enhancedAuth.middleware.js';
import { authRateLimit } from '../middleware/enhancedRateLimit.middleware.js';
import User from '../modules/hr-core/users/models/user.model.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Login with enhanced session management
 */
router.post('/login',
    authRateLimit,
    [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email is required'),
        body('password')
            .notEmpty()
            .withMessage('Password is required'),
        body('rememberMe')
            .optional()
            .isBoolean()
            .withMessage('Remember me must be a boolean'),
        body('mfaToken')
            .optional()
            .isLength({ min: 6, max: 6 })
            .isNumeric()
            .withMessage('MFA token must be 6 digits')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { email, password, rememberMe = false, mfaToken } = req.body;
            const ipAddress = req.ip;
            const userAgent = req.get('User-Agent');

            // Find user
            const user = await User.findOne({ email }).select('+password +mfa');
            
            if (!user) {
                logger.warn('Login attempt with non-existent email', { email, ipAddress });
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Verify password
            const isPasswordValid = await verifyPassword(password, user.password);
            
            if (!isPasswordValid) {
                logger.warn('Login attempt with invalid password', { 
                    userId: user._id, 
                    email, 
                    ipAddress 
                });
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Check if MFA is enabled
            if (user.mfa && user.mfa.enabled) {
                if (!mfaToken) {
                    return res.status(200).json({
                        success: true,
                        requiresMFA: true,
                        message: 'MFA token required'
                    });
                }

                // Verify MFA token
                const isMFAValid = verifyMFA(mfaToken, user.mfa.secret);
                
                if (!isMFAValid) {
                    logger.warn('Login attempt with invalid MFA token', { 
                        userId: user._id, 
                        email, 
                        ipAddress 
                    });
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid MFA token'
                    });
                }
            }

            // Create session
            const userInfo = {
                id: user._id,
                email: user.email,
                firstName: user.profile?.firstName,
                lastName: user.profile?.lastName,
                role: user.role,
                tenantId: user.tenantId,
                permissions: user.permissions || []
            };

            const sessionId = await createSession(user._id, userInfo, {
                rememberMe,
                ipAddress,
                userAgent
            });

            logger.info('User logged in successfully', {
                userId: user._id,
                email,
                sessionId: sessionId.substring(0, 8) + '...',
                rememberMe,
                ipAddress
            });

            res.json({
                success: true,
                message: 'Login successful',
                sessionId,
                user: userInfo,
                expiresIn: rememberMe ? '30 days' : '24 hours'
            });

        } catch (error) {
            logger.error('Login error', {
                error: error.message,
                email: req.body.email,
                ipAddress: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Login failed'
            });
        }
    }
);

/**
 * Logout (destroy session)
 */
router.post('/logout',
    authenticateSession,
    async (req, res) => {
        try {
            await destroySession(req.session.id, req.session.userId);

            logger.info('User logged out', {
                userId: req.session.userId,
                sessionId: req.session.id.substring(0, 8) + '...'
            });

            res.json({
                success: true,
                message: 'Logged out successfully'
            });

        } catch (error) {
            logger.error('Logout error', {
                error: error.message,
                userId: req.session?.userId
            });

            res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
    }
);

/**
 * Logout from all devices
 */
router.post('/logout-all',
    authenticateSession,
    async (req, res) => {
        try {
            const sessionCount = await destroyAllUserSessions(req.session.userId);

            logger.info('User logged out from all devices', {
                userId: req.session.userId,
                sessionCount
            });

            res.json({
                success: true,
                message: `Logged out from ${sessionCount} devices`,
                sessionCount
            });

        } catch (error) {
            logger.error('Logout all error', {
                error: error.message,
                userId: req.session?.userId
            });

            res.status(500).json({
                success: false,
                message: 'Logout from all devices failed'
            });
        }
    }
);

/**
 * Get current session info
 */
router.get('/me',
    authenticateSession,
    async (req, res) => {
        try {
            res.json({
                success: true,
                session: {
                    id: req.session.id.substring(0, 8) + '...',
                    userId: req.session.userId,
                    createdAt: req.session.createdAt,
                    lastAccessedAt: req.session.lastAccessedAt,
                    rememberMe: req.session.rememberMe
                },
                user: req.user
            });

        } catch (error) {
            logger.error('Get session info error', {
                error: error.message,
                userId: req.session?.userId
            });

            res.status(500).json({
                success: false,
                message: 'Failed to get session info'
            });
        }
    }
);

/**
 * Get all user sessions
 */
router.get('/sessions',
    authenticateSession,
    async (req, res) => {
        try {
            const sessions = await getUserSessions(req.session.userId);

            res.json({
                success: true,
                sessions: sessions.map(session => ({
                    id: session.sessionId.substring(0, 8) + '...',
                    createdAt: session.createdAt,
                    ipAddress: session.ipAddress,
                    userAgent: session.userAgent,
                    current: session.sessionId === req.session.id
                }))
            });

        } catch (error) {
            logger.error('Get user sessions error', {
                error: error.message,
                userId: req.session?.userId
            });

            res.status(500).json({
                success: false,
                message: 'Failed to get sessions'
            });
        }
    }
);

/**
 * Change password with enhanced validation
 */
router.post('/change-password',
    authenticateSession,
    [
        body('currentPassword')
            .notEmpty()
            .withMessage('Current password is required'),
        ...validatePasswordMiddleware
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { currentPassword, password } = req.body;

            // Get user with password
            const user = await User.findById(req.session.userId).select('+password');
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Verify current password
            const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
            
            if (!isCurrentPasswordValid) {
                logger.warn('Password change attempt with invalid current password', {
                    userId: user._id
                });
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Hash new password
            const hashedPassword = await hashPassword(password);

            // Update password
            await User.findByIdAndUpdate(user._id, {
                password: hashedPassword,
                passwordChangedAt: new Date()
            });

            // Destroy all other sessions (force re-login)
            await destroyAllUserSessions(user._id);

            logger.info('Password changed successfully', {
                userId: user._id
            });

            res.json({
                success: true,
                message: 'Password changed successfully. Please log in again.'
            });

        } catch (error) {
            logger.error('Change password error', {
                error: error.message,
                userId: req.session?.userId
            });

            res.status(500).json({
                success: false,
                message: 'Password change failed'
            });
        }
    }
);

/**
 * Setup MFA
 */
router.post('/mfa/setup',
    authenticateSession,
    async (req, res) => {
        try {
            const mfaSetup = await setupMFA(req.session.userId);

            res.json({
                success: true,
                message: 'MFA setup initiated',
                secret: mfaSetup.secret,
                qrCodeUrl: mfaSetup.qrCodeUrl
            });

        } catch (error) {
            logger.error('MFA setup error', {
                error: error.message,
                userId: req.session?.userId
            });

            res.status(500).json({
                success: false,
                message: 'MFA setup failed'
            });
        }
    }
);

/**
 * Verify and enable MFA
 */
router.post('/mfa/verify',
    authenticateSession,
    [
        body('token')
            .isLength({ min: 6, max: 6 })
            .isNumeric()
            .withMessage('MFA token must be 6 digits'),
        body('secret')
            .notEmpty()
            .withMessage('MFA secret is required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { token, secret } = req.body;

            // Verify MFA token
            const isValid = verifyMFA(token, secret);

            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid MFA token'
                });
            }

            // Enable MFA for user
            await User.findByIdAndUpdate(req.session.userId, {
                'mfa.enabled': true,
                'mfa.secret': secret,
                'mfa.enabledAt': new Date()
            });

            logger.info('MFA enabled for user', {
                userId: req.session.userId
            });

            res.json({
                success: true,
                message: 'MFA enabled successfully'
            });

        } catch (error) {
            logger.error('MFA verification error', {
                error: error.message,
                userId: req.session?.userId
            });

            res.status(500).json({
                success: false,
                message: 'MFA verification failed'
            });
        }
    }
);

/**
 * Disable MFA
 */
router.post('/mfa/disable',
    authenticateSession,
    [
        body('password')
            .notEmpty()
            .withMessage('Password is required to disable MFA'),
        body('token')
            .isLength({ min: 6, max: 6 })
            .isNumeric()
            .withMessage('MFA token must be 6 digits')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { password, token } = req.body;

            // Get user with password and MFA
            const user = await User.findById(req.session.userId).select('+password +mfa');
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Verify password
            const isPasswordValid = await verifyPassword(password, user.password);
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid password'
                });
            }

            // Verify MFA token
            if (user.mfa && user.mfa.enabled) {
                const isMFAValid = verifyMFA(token, user.mfa.secret);
                
                if (!isMFAValid) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid MFA token'
                    });
                }
            }

            // Disable MFA
            await User.findByIdAndUpdate(user._id, {
                'mfa.enabled': false,
                'mfa.secret': null,
                'mfa.disabledAt': new Date()
            });

            logger.info('MFA disabled for user', {
                userId: user._id
            });

            res.json({
                success: true,
                message: 'MFA disabled successfully'
            });

        } catch (error) {
            logger.error('MFA disable error', {
                error: error.message,
                userId: req.session?.userId
            });

            res.status(500).json({
                success: false,
                message: 'MFA disable failed'
            });
        }
    }
);

export default router;