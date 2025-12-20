/**
 * Enhanced Authentication Middleware
 * 
 * Comprehensive authentication with strong password policies, MFA support,
 * and Redis session management for enterprise security
 * 
 * Requirements: 6.4, 9.1 - Enhanced authentication and session management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import redisService from '../core/services/redis.service.js';
import logger from '../utils/logger.js';

/**
 * Strong password policy configuration
 */
const PASSWORD_POLICY = {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPatterns: [
        'password', '123456', 'qwerty', 'admin', 'user', 'login',
        'welcome', 'company', 'system', 'default', 'temp'
    ],
    maxRepeatingChars: 3,
    preventCommonPasswords: true,
    preventUserInfoInPassword: true
};

/**
 * Session configuration
 */
const SESSION_CONFIG = {
    maxConcurrentSessions: 5,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    refreshThreshold: 30 * 60 * 1000, // 30 minutes
    rememberMeDuration: 30 * 24 * 60 * 60 * 1000 // 30 days
};

/**
 * Common weak passwords list (subset)
 */
const COMMON_PASSWORDS = new Set([
    'password123', 'admin123', 'welcome123', 'qwerty123',
    'password1', 'admin1', 'welcome1', 'qwerty1',
    '123456789', '1234567890', 'abcdefgh', 'abcd1234'
]);

/**
 * Validate password strength according to enterprise policy
 */
export const validatePasswordStrength = (password, userInfo = {}) => {
    const errors = [];
    
    // Length check
    if (password.length < PASSWORD_POLICY.minLength) {
        errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
    }
    
    if (password.length > PASSWORD_POLICY.maxLength) {
        errors.push(`Password cannot exceed ${PASSWORD_POLICY.maxLength} characters`);
    }
    
    // Character requirements
    if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    // Forbidden patterns
    const lowerPassword = password.toLowerCase();
    for (const pattern of PASSWORD_POLICY.forbiddenPatterns) {
        if (lowerPassword.includes(pattern.toLowerCase())) {
            errors.push(`Password cannot contain common patterns like "${pattern}"`);
        }
    }
    
    // Repeating characters
    const repeatingRegex = new RegExp(`(.)\\1{${PASSWORD_POLICY.maxRepeatingChars},}`, 'i');
    if (repeatingRegex.test(password)) {
        errors.push(`Password cannot have more than ${PASSWORD_POLICY.maxRepeatingChars} repeating characters`);
    }
    
    // Common passwords
    if (PASSWORD_POLICY.preventCommonPasswords && COMMON_PASSWORDS.has(lowerPassword)) {
        errors.push('Password is too common, please choose a more unique password');
    }
    
    // User info in password
    if (PASSWORD_POLICY.preventUserInfoInPassword && userInfo) {
        const userFields = [
            userInfo.firstName, userInfo.lastName, userInfo.email,
            userInfo.username, userInfo.employeeId
        ].filter(Boolean);
        
        for (const field of userFields) {
            if (field && lowerPassword.includes(field.toLowerCase())) {
                errors.push('Password cannot contain personal information');
                break;
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        strength: calculatePasswordStrength(password)
    };
};

/**
 * Calculate password strength score (0-100)
 */
const calculatePasswordStrength = (password) => {
    let score = 0;
    
    // Length bonus
    score += Math.min(password.length * 2, 25);
    
    // Character variety bonus
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
    
    // Complexity bonus
    const uniqueChars = new Set(password).size;
    score += Math.min(uniqueChars * 2, 20);
    
    // Pattern penalty
    if (/(.)\1{2,}/.test(password)) score -= 10;
    if (/123|abc|qwe/i.test(password)) score -= 10;
    
    return Math.max(0, Math.min(100, score));
};

/**
 * Password validation middleware
 */
export const validatePasswordMiddleware = [
    body('password')
        .custom((password, { req }) => {
            const userInfo = {
                firstName: req.body.firstName || req.user?.firstName,
                lastName: req.body.lastName || req.user?.lastName,
                email: req.body.email || req.user?.email,
                username: req.body.username || req.user?.username,
                employeeId: req.body.employeeId || req.user?.employeeId
            };
            
            const validation = validatePasswordStrength(password, userInfo);
            
            if (!validation.valid) {
                throw new Error(validation.errors.join('. '));
            }
            
            return true;
        }),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Password does not meet security requirements',
                errors: errors.array(),
                passwordPolicy: {
                    minLength: PASSWORD_POLICY.minLength,
                    requireUppercase: PASSWORD_POLICY.requireUppercase,
                    requireLowercase: PASSWORD_POLICY.requireLowercase,
                    requireNumbers: PASSWORD_POLICY.requireNumbers,
                    requireSpecialChars: PASSWORD_POLICY.requireSpecialChars
                }
            });
        }
        next();
    }
];

/**
 * Hash password with salt
 */
export const hashPassword = async (password) => {
    const saltRounds = 12; // High cost for security
    return await bcrypt.hash(password, saltRounds);
};

/**
 * Verify password
 */
export const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate secure session ID
 */
export const generateSessionId = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Create session in Redis
 */
export const createSession = async (userId, userInfo, options = {}) => {
    const sessionId = generateSessionId();
    const {
        rememberMe = false,
        ipAddress = null,
        userAgent = null
    } = options;
    
    const sessionData = {
        userId,
        userInfo,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        ipAddress,
        userAgent,
        rememberMe
    };
    
    const ttl = rememberMe ? 
        Math.floor(SESSION_CONFIG.rememberMeDuration / 1000) : 
        Math.floor(SESSION_CONFIG.sessionTimeout / 1000);
    
    try {
        // Store session in Redis
        if (redisService.isEnabled && redisService.isConnected) {
            await redisService.set(`session:${sessionId}`, sessionData, ttl);
            
            // Track user sessions for concurrent session management
            const userSessionsKey = `user_sessions:${userId}`;
            const userSessions = await redisService.get(userSessionsKey) || [];
            
            // Add new session
            userSessions.push({
                sessionId,
                createdAt: sessionData.createdAt,
                ipAddress,
                userAgent
            });
            
            // Limit concurrent sessions
            if (userSessions.length > SESSION_CONFIG.maxConcurrentSessions) {
                // Remove oldest sessions
                const sessionsToRemove = userSessions.splice(0, userSessions.length - SESSION_CONFIG.maxConcurrentSessions);
                for (const session of sessionsToRemove) {
                    await redisService.del(`session:${session.sessionId}`);
                }
            }
            
            // Update user sessions list
            await redisService.set(userSessionsKey, userSessions, ttl);
            
            logger.info('Session created', {
                userId,
                sessionId: sessionId.substring(0, 8) + '...',
                rememberMe,
                ipAddress
            });
        }
        
        return sessionId;
    } catch (error) {
        logger.error('Failed to create session', {
            userId,
            error: error.message
        });
        throw new Error('Session creation failed');
    }
};

/**
 * Get session from Redis
 */
export const getSession = async (sessionId) => {
    if (!sessionId) return null;
    
    try {
        if (redisService.isEnabled && redisService.isConnected) {
            const sessionData = await redisService.get(`session:${sessionId}`);
            
            if (sessionData) {
                // Update last accessed time
                sessionData.lastAccessedAt = new Date().toISOString();
                
                const ttl = sessionData.rememberMe ? 
                    Math.floor(SESSION_CONFIG.rememberMeDuration / 1000) : 
                    Math.floor(SESSION_CONFIG.sessionTimeout / 1000);
                
                await redisService.set(`session:${sessionId}`, sessionData, ttl);
                
                return sessionData;
            }
        }
        
        return null;
    } catch (error) {
        logger.error('Failed to get session', {
            sessionId: sessionId.substring(0, 8) + '...',
            error: error.message
        });
        return null;
    }
};

/**
 * Destroy session
 */
export const destroySession = async (sessionId, userId = null) => {
    if (!sessionId) return;
    
    try {
        if (redisService.isEnabled && redisService.isConnected) {
            // Remove session
            await redisService.del(`session:${sessionId}`);
            
            // Remove from user sessions list if userId provided
            if (userId) {
                const userSessionsKey = `user_sessions:${userId}`;
                const userSessions = await redisService.get(userSessionsKey) || [];
                
                const updatedSessions = userSessions.filter(s => s.sessionId !== sessionId);
                
                if (updatedSessions.length > 0) {
                    await redisService.set(userSessionsKey, updatedSessions);
                } else {
                    await redisService.del(userSessionsKey);
                }
            }
            
            logger.info('Session destroyed', {
                sessionId: sessionId.substring(0, 8) + '...',
                userId
            });
        }
    } catch (error) {
        logger.error('Failed to destroy session', {
            sessionId: sessionId.substring(0, 8) + '...',
            userId,
            error: error.message
        });
    }
};

/**
 * Destroy all user sessions
 */
export const destroyAllUserSessions = async (userId) => {
    try {
        if (redisService.isEnabled && redisService.isConnected) {
            const userSessionsKey = `user_sessions:${userId}`;
            const userSessions = await redisService.get(userSessionsKey) || [];
            
            // Remove all sessions
            for (const session of userSessions) {
                await redisService.del(`session:${session.sessionId}`);
            }
            
            // Remove user sessions list
            await redisService.del(userSessionsKey);
            
            logger.info('All user sessions destroyed', {
                userId,
                sessionCount: userSessions.length
            });
            
            return userSessions.length;
        }
        
        return 0;
    } catch (error) {
        logger.error('Failed to destroy all user sessions', {
            userId,
            error: error.message
        });
        return 0;
    }
};

/**
 * Session authentication middleware
 */
export const authenticateSession = async (req, res, next) => {
    try {
        const sessionId = req.headers['x-session-id'] || 
                         req.cookies?.sessionId || 
                         req.query.sessionId;
        
        if (!sessionId) {
            return res.status(401).json({
                success: false,
                message: 'No session provided',
                code: 'NO_SESSION'
            });
        }
        
        const sessionData = await getSession(sessionId);
        
        if (!sessionData) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired session',
                code: 'INVALID_SESSION'
            });
        }
        
        // Check session timeout
        const lastAccessed = new Date(sessionData.lastAccessedAt);
        const now = new Date();
        const timeSinceLastAccess = now - lastAccessed;
        
        const timeout = sessionData.rememberMe ? 
            SESSION_CONFIG.rememberMeDuration : 
            SESSION_CONFIG.sessionTimeout;
        
        if (timeSinceLastAccess > timeout) {
            await destroySession(sessionId, sessionData.userId);
            return res.status(401).json({
                success: false,
                message: 'Session expired',
                code: 'SESSION_EXPIRED'
            });
        }
        
        // Attach session info to request
        req.session = {
            id: sessionId,
            userId: sessionData.userId,
            user: sessionData.userInfo,
            createdAt: sessionData.createdAt,
            lastAccessedAt: sessionData.lastAccessedAt,
            rememberMe: sessionData.rememberMe
        };
        
        req.user = sessionData.userInfo;
        
        next();
    } catch (error) {
        logger.error('Session authentication failed', {
            error: error.message,
            ip: req.ip
        });
        
        return res.status(500).json({
            success: false,
            message: 'Authentication error',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Multi-factor authentication setup
 */
export const setupMFA = async (userId, secret = null) => {
    try {
        // Generate TOTP secret if not provided
        const mfaSecret = secret || crypto.randomBytes(20).toString('base32');
        
        // Store MFA secret in Redis temporarily (until verified)
        const mfaKey = `mfa_setup:${userId}`;
        await redisService.set(mfaKey, {
            secret: mfaSecret,
            createdAt: new Date().toISOString()
        }, 300); // 5 minutes to complete setup
        
        return {
            secret: mfaSecret,
            qrCodeUrl: `otpauth://totp/HRMS:${userId}?secret=${mfaSecret}&issuer=HRMS`
        };
    } catch (error) {
        logger.error('MFA setup failed', {
            userId,
            error: error.message
        });
        throw new Error('MFA setup failed');
    }
};

/**
 * Verify MFA token
 */
export const verifyMFA = (token, secret) => {
    // Simple TOTP verification (in production, use a proper TOTP library)
    const window = 30; // 30 second window
    const currentTime = Math.floor(Date.now() / 1000 / window);
    
    // Check current window and adjacent windows for clock drift
    for (let i = -1; i <= 1; i++) {
        const timeStep = currentTime + i;
        const expectedToken = generateTOTP(secret, timeStep);
        
        if (token === expectedToken) {
            return true;
        }
    }
    
    return false;
};

/**
 * Simple TOTP generation (use proper library in production)
 */
const generateTOTP = (secret, timeStep) => {
    // This is a simplified implementation
    // In production, use a proper TOTP library like 'otplib'
    const hash = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
    hash.update(Buffer.from(timeStep.toString()));
    const hmac = hash.digest();
    
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);
    
    return (code % 1000000).toString().padStart(6, '0');
};

/**
 * Get user sessions
 */
export const getUserSessions = async (userId) => {
    try {
        if (redisService.isEnabled && redisService.isConnected) {
            const userSessionsKey = `user_sessions:${userId}`;
            return await redisService.get(userSessionsKey) || [];
        }
        return [];
    } catch (error) {
        logger.error('Failed to get user sessions', {
            userId,
            error: error.message
        });
        return [];
    }
};

export default {
    validatePasswordStrength,
    validatePasswordMiddleware,
    hashPassword,
    verifyPassword,
    createSession,
    getSession,
    destroySession,
    destroyAllUserSessions,
    authenticateSession,
    setupMFA,
    verifyMFA,
    getUserSessions,
    PASSWORD_POLICY,
    SESSION_CONFIG
};