/**
 * Redis Session Management Service
 * Provides session management for load balancing and horizontal scaling
 * Supports multi-tenant session isolation and security features
 */

import redisService from '../core/services/redis.service.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

class SessionService {
    constructor() {
        this.sessionTTL = parseInt(process.env.SESSION_TTL) || 3600; // 1 hour default
        this.maxSessions = parseInt(process.env.MAX_SESSIONS_PER_USER) || 5;
        this.sessionPrefix = 'session:';
        this.userSessionsPrefix = 'user_sessions:';
    }

    /**
     * Generate secure session ID
     * @returns {string} Secure session ID
     */
    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Generate session key for Redis
     * @param {string} sessionId - Session ID
     * @returns {string} Redis key for session
     */
    getSessionKey(sessionId) {
        return `${this.sessionPrefix}${sessionId}`;
    }

    /**
     * Generate user sessions key for Redis
     * @param {string} userId - User ID
     * @param {string} tenantId - Tenant ID
     * @returns {string} Redis key for user sessions list
     */
    getUserSessionsKey(userId, tenantId) {
        return `${this.userSessionsPrefix}${tenantId}:${userId}`;
    }

    /**
     * Create new session
     * @param {Object} sessionData - Session data
     * @param {string} sessionData.userId - User ID
     * @param {string} sessionData.tenantId - Tenant ID
     * @param {string} sessionData.email - User email
     * @param {string} sessionData.role - User role
     * @param {string} sessionData.ipAddress - Client IP address
     * @param {string} sessionData.userAgent - Client user agent
     * @returns {Promise<string|null>} Session ID or null on error
     */
    async createSession(sessionData) {
        try {
            const sessionId = this.generateSessionId();
            const sessionKey = this.getSessionKey(sessionId);
            const userSessionsKey = this.getUserSessionsKey(sessionData.userId, sessionData.tenantId);

            // Prepare session data with metadata
            const session = {
                ...sessionData,
                sessionId,
                createdAt: new Date().toISOString(),
                lastAccessedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + this.sessionTTL * 1000).toISOString()
            };

            // Store session data
            const sessionStored = await redisService.set(sessionKey, session, this.sessionTTL);
            if (!sessionStored) {
                logger.error('Failed to store session in Redis', { sessionId, userId: sessionData.userId });
                return null;
            }

            // Add session to user's session list
            await this.addToUserSessions(sessionData.userId, sessionData.tenantId, sessionId);

            // Enforce max sessions per user
            await this.enforceMaxSessions(sessionData.userId, sessionData.tenantId);

            logger.info('Session created', { 
                sessionId, 
                userId: sessionData.userId, 
                tenantId: sessionData.tenantId,
                ipAddress: sessionData.ipAddress
            });

            return sessionId;
        } catch (error) {
            logger.error('Error creating session', { 
                userId: sessionData.userId, 
                tenantId: sessionData.tenantId,
                error: error.message 
            });
            return null;
        }
    }

    /**
     * Get session data
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object|null>} Session data or null if not found/expired
     */
    async getSession(sessionId) {
        try {
            const sessionKey = this.getSessionKey(sessionId);
            const session = await redisService.get(sessionKey);

            if (!session) {
                return null;
            }

            // Check if session is expired
            if (new Date(session.expiresAt) < new Date()) {
                await this.destroySession(sessionId);
                return null;
            }

            // Update last accessed time
            session.lastAccessedAt = new Date().toISOString();
            await redisService.set(sessionKey, session, this.sessionTTL);

            return session;
        } catch (error) {
            logger.error('Error getting session', { sessionId, error: error.message });
            return null;
        }
    }

    /**
     * Update session data
     * @param {string} sessionId - Session ID
     * @param {Object} updates - Data to update
     * @returns {Promise<boolean>} Success status
     */
    async updateSession(sessionId, updates) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                return false;
            }

            const updatedSession = {
                ...session,
                ...updates,
                lastAccessedAt: new Date().toISOString()
            };

            const sessionKey = this.getSessionKey(sessionId);
            return await redisService.set(sessionKey, updatedSession, this.sessionTTL);
        } catch (error) {
            logger.error('Error updating session', { sessionId, error: error.message });
            return false;
        }
    }

    /**
     * Destroy session
     * @param {string} sessionId - Session ID
     * @returns {Promise<boolean>} Success status
     */
    async destroySession(sessionId) {
        try {
            // Get session data first to remove from user sessions list
            const session = await redisService.get(this.getSessionKey(sessionId));
            
            // Remove session data
            const sessionKey = this.getSessionKey(sessionId);
            const deleted = await redisService.del(sessionKey);

            // Remove from user sessions list if session existed
            if (session) {
                await this.removeFromUserSessions(session.userId, session.tenantId, sessionId);
                logger.info('Session destroyed', { 
                    sessionId, 
                    userId: session.userId, 
                    tenantId: session.tenantId 
                });
            }

            return deleted;
        } catch (error) {
            logger.error('Error destroying session', { sessionId, error: error.message });
            return false;
        }
    }

    /**
     * Destroy all sessions for a user
     * @param {string} userId - User ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<number>} Number of sessions destroyed
     */
    async destroyUserSessions(userId, tenantId) {
        try {
            const userSessionsKey = this.getUserSessionsKey(userId, tenantId);
            const sessionIds = await redisService.get(userSessionsKey) || [];

            let destroyedCount = 0;
            for (const sessionId of sessionIds) {
                const destroyed = await this.destroySession(sessionId);
                if (destroyed) {
                    destroyedCount++;
                }
            }

            // Clear user sessions list
            await redisService.del(userSessionsKey);

            logger.info('All user sessions destroyed', { userId, tenantId, count: destroyedCount });
            return destroyedCount;
        } catch (error) {
            logger.error('Error destroying user sessions', { userId, tenantId, error: error.message });
            return 0;
        }
    }

    /**
     * Add session to user's session list
     * @param {string} userId - User ID
     * @param {string} tenantId - Tenant ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<boolean>} Success status
     */
    async addToUserSessions(userId, tenantId, sessionId) {
        try {
            const userSessionsKey = this.getUserSessionsKey(userId, tenantId);
            const sessions = await redisService.get(userSessionsKey) || [];
            
            sessions.push(sessionId);
            
            return await redisService.set(userSessionsKey, sessions, this.sessionTTL * 2);
        } catch (error) {
            logger.error('Error adding to user sessions', { userId, tenantId, sessionId, error: error.message });
            return false;
        }
    }

    /**
     * Remove session from user's session list
     * @param {string} userId - User ID
     * @param {string} tenantId - Tenant ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<boolean>} Success status
     */
    async removeFromUserSessions(userId, tenantId, sessionId) {
        try {
            const userSessionsKey = this.getUserSessionsKey(userId, tenantId);
            const sessions = await redisService.get(userSessionsKey) || [];
            
            const filteredSessions = sessions.filter(id => id !== sessionId);
            
            if (filteredSessions.length === 0) {
                return await redisService.del(userSessionsKey);
            } else {
                return await redisService.set(userSessionsKey, filteredSessions, this.sessionTTL * 2);
            }
        } catch (error) {
            logger.error('Error removing from user sessions', { userId, tenantId, sessionId, error: error.message });
            return false;
        }
    }

    /**
     * Enforce maximum sessions per user
     * @param {string} userId - User ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<void>}
     */
    async enforceMaxSessions(userId, tenantId) {
        try {
            const userSessionsKey = this.getUserSessionsKey(userId, tenantId);
            const sessions = await redisService.get(userSessionsKey) || [];

            if (sessions.length > this.maxSessions) {
                // Remove oldest sessions (first in array)
                const sessionsToRemove = sessions.slice(0, sessions.length - this.maxSessions);
                
                for (const sessionId of sessionsToRemove) {
                    await this.destroySession(sessionId);
                }

                logger.info('Enforced max sessions limit', { 
                    userId, 
                    tenantId, 
                    removed: sessionsToRemove.length,
                    maxSessions: this.maxSessions
                });
            }
        } catch (error) {
            logger.error('Error enforcing max sessions', { userId, tenantId, error: error.message });
        }
    }

    /**
     * Get active sessions for a user
     * @param {string} userId - User ID
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<Array>} Array of active session data
     */
    async getUserSessions(userId, tenantId) {
        try {
            const userSessionsKey = this.getUserSessionsKey(userId, tenantId);
            const sessionIds = await redisService.get(userSessionsKey) || [];

            const sessions = [];
            for (const sessionId of sessionIds) {
                const session = await this.getSession(sessionId);
                if (session) {
                    sessions.push({
                        sessionId: session.sessionId,
                        createdAt: session.createdAt,
                        lastAccessedAt: session.lastAccessedAt,
                        ipAddress: session.ipAddress,
                        userAgent: session.userAgent
                    });
                }
            }

            return sessions;
        } catch (error) {
            logger.error('Error getting user sessions', { userId, tenantId, error: error.message });
            return [];
        }
    }

    /**
     * Clean up expired sessions
     * @returns {Promise<number>} Number of sessions cleaned up
     */
    async cleanupExpiredSessions() {
        try {
            // This is a basic cleanup - in production, you might want to use Redis SCAN
            // for better performance with large datasets
            logger.info('Starting session cleanup');
            
            // For now, we rely on Redis TTL for automatic cleanup
            // This method can be enhanced to manually scan and clean up if needed
            
            return 0;
        } catch (error) {
            logger.error('Error during session cleanup', { error: error.message });
            return 0;
        }
    }

    /**
     * Get session statistics
     * @returns {Promise<Object>} Session statistics
     */
    async getStats() {
        try {
            // Basic stats - can be enhanced with more detailed metrics
            return {
                sessionTTL: this.sessionTTL,
                maxSessions: this.maxSessions,
                redisConnected: redisService.getStats().connected
            };
        } catch (error) {
            logger.error('Error getting session stats', { error: error.message });
            return {};
        }
    }
}

// Export singleton instance
const sessionService = new SessionService();
export default sessionService;