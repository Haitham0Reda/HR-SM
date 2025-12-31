/**
 * Redis Session Middleware
 * Integrates Redis session management with Express for load balancing support
 * Provides session management for multi-tenant applications
 */

import session from 'express-session';
import * as connectRedis from 'connect-redis';
import redisService from '../core/services/redis.service.js';
import sessionService from '../services/sessionService.js';
import logger from '../utils/logger.js';

const RedisStore = connectRedis.default;

/**
 * Configure Redis session store
 * @returns {Object} Session configuration
 */
export const configureRedisSession = () => {
    const redisStats = redisService.getStats();
    
    if (!redisStats.enabled || !redisStats.connected) {
        logger.info('Redis not configured - using memory store for sessions (development mode)');
        if (process.env.NODE_ENV === 'production') {
            logger.warn('⚠️  Redis recommended for production sessions');
        }
        return {
            secret: process.env.SESSION_SECRET || 'hrms-session-secret-change-in-production',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: parseInt(process.env.SESSION_TTL) * 1000 || 3600000, // 1 hour default
                sameSite: 'strict'
            },
            name: 'hrms.sid'
        };
    }

    // Configure Redis store
    const redisClient = redisService.client;
    const redisStore = new RedisStore({
        client: redisClient,
        prefix: 'hrms:session:',
        ttl: parseInt(process.env.SESSION_TTL) || 3600 // 1 hour default
    });

    return {
        store: redisStore,
        secret: process.env.SESSION_SECRET || 'hrms-session-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        rolling: true, // Reset expiry on each request
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: parseInt(process.env.SESSION_TTL) * 1000 || 3600000,
            sameSite: 'strict'
        },
        name: 'hrms.sid'
    };
};

/**
 * Custom session middleware that integrates with our session service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const customSessionMiddleware = async (req, res, next) => {
    try {
        // Get session ID from cookie or header
        const sessionId = req.sessionID || req.headers['x-session-id'];
        
        if (sessionId) {
            // Get session data from our session service
            const sessionData = await sessionService.getSession(sessionId);
            
            if (sessionData) {
                // Attach session data to request
                req.session = req.session || {};
                req.session.user = sessionData;
                req.sessionId = sessionId;
                
                // Update last accessed time
                await sessionService.updateSession(sessionId, {
                    lastAccessedAt: new Date().toISOString(),
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });
                
                logger.debug('Session loaded from custom service', { 
                    sessionId, 
                    userId: sessionData.userId,
                    tenantId: sessionData.tenantId
                });
            } else {
                // Session not found or expired
                req.session = null;
                req.sessionId = null;
            }
        }
        
        next();
    } catch (error) {
        logger.error('Error in custom session middleware', { error: error.message });
        next();
    }
};

/**
 * Middleware to create session after successful authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const createSessionMiddleware = async (req, res, next) => {
    try {
        // This middleware should be used after authentication
        if (req.user && !req.sessionId) {
            const sessionData = {
                userId: req.user._id.toString(),
                tenantId: req.user.tenantId?.toString(),
                email: req.user.email,
                role: req.user.role,
                permissions: req.user.permissions || [],
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            };

            const sessionId = await sessionService.createSession(sessionData);
            
            if (sessionId) {
                req.sessionId = sessionId;
                
                // Set session cookie
                res.cookie('hrms.sid', sessionId, {
                    secure: process.env.NODE_ENV === 'production',
                    httpOnly: true,
                    maxAge: parseInt(process.env.SESSION_TTL) * 1000 || 3600000,
                    sameSite: 'strict'
                });
                
                logger.info('Session created', { 
                    sessionId, 
                    userId: req.user._id,
                    tenantId: req.user.tenantId
                });
            }
        }
        
        next();
    } catch (error) {
        logger.error('Error creating session', { error: error.message });
        next();
    }
};

/**
 * Middleware to destroy session on logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const destroySessionMiddleware = async (req, res, next) => {
    try {
        const sessionId = req.sessionId || req.cookies['hrms.sid'];
        
        if (sessionId) {
            await sessionService.destroySession(sessionId);
            
            // Clear session cookie
            res.clearCookie('hrms.sid');
            
            logger.info('Session destroyed', { sessionId });
        }
        
        next();
    } catch (error) {
        logger.error('Error destroying session', { error: error.message });
        next();
    }
};

/**
 * Middleware to check if user has valid session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const requireSessionMiddleware = async (req, res, next) => {
    try {
        const sessionId = req.sessionId || req.cookies['hrms.sid'];
        
        if (!sessionId) {
            return res.status(401).json({
                success: false,
                message: 'No session found'
            });
        }
        
        const sessionData = await sessionService.getSession(sessionId);
        
        if (!sessionData) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired session'
            });
        }
        
        // Attach session data to request
        req.session = req.session || {};
        req.session.user = sessionData;
        req.sessionId = sessionId;
        
        next();
    } catch (error) {
        logger.error('Error checking session', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Session validation error'
        });
    }
};

/**
 * Middleware to handle concurrent session limits
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const sessionLimitMiddleware = async (req, res, next) => {
    try {
        if (req.user && req.sessionId) {
            const userSessions = await sessionService.getUserSessions(
                req.user._id.toString(),
                req.user.tenantId?.toString()
            );
            
            const maxSessions = parseInt(process.env.MAX_SESSIONS_PER_USER) || 5;
            
            if (userSessions.length > maxSessions) {
                logger.warn('User exceeded session limit', { 
                    userId: req.user._id,
                    sessionCount: userSessions.length,
                    maxSessions
                });
                
                // Optionally, you could destroy oldest sessions here
                // or return an error
            }
        }
        
        next();
    } catch (error) {
        logger.error('Error checking session limits', { error: error.message });
        next();
    }
};

/**
 * Get session statistics middleware (for admin endpoints)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const sessionStatsMiddleware = async (req, res, next) => {
    try {
        const stats = await sessionService.getStats();
        req.sessionStats = stats;
        next();
    } catch (error) {
        logger.error('Error getting session stats', { error: error.message });
        next();
    }
};

/**
 * Initialize session middleware with Redis support
 * @param {Object} app - Express app instance
 */
export const initializeSessionMiddleware = (app) => {
    try {
        const sessionConfig = configureRedisSession();
        
        // Use express-session with Redis store
        app.use(session(sessionConfig));
        
        // Add custom session middleware
        app.use(customSessionMiddleware);
        
        logger.info('Session middleware initialized', { 
            redisEnabled: redisService.getStats().enabled,
            redisConnected: redisService.getStats().connected
        });
    } catch (error) {
        logger.error('Error initializing session middleware', { error: error.message });
        throw error;
    }
};

export default {
    configureRedisSession,
    customSessionMiddleware,
    createSessionMiddleware,
    destroySessionMiddleware,
    requireSessionMiddleware,
    sessionLimitMiddleware,
    sessionStatsMiddleware,
    initializeSessionMiddleware
};