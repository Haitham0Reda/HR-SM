// services/redis.service.js
import { createClient } from 'redis';
import logger from '../../utils/logger.js';

/**
 * Redis Service
 * Provides caching functionality for license validation and other operations
 */
class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.isEnabled = process.env.REDIS_ENABLED === 'true';
        this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    }

    /**
     * Initialize Redis connection
     */
    async connect() {
        if (!this.isEnabled) {
            logger.info('Redis is disabled, caching will use in-memory fallback');
            return;
        }

        try {
            this.client = createClient({
                url: this.redisUrl,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            logger.error('Redis reconnection failed after 10 attempts');
                            return new Error('Redis reconnection limit exceeded');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            });

            this.client.on('error', (err) => {
                logger.error('Redis client error', { error: err.message });
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('Redis client connected');
                this.isConnected = true;
            });

            this.client.on('disconnect', () => {
                logger.warn('Redis client disconnected');
                this.isConnected = false;
            });

            await this.client.connect();
            logger.info('Redis service initialized', { url: this.redisUrl });

        } catch (error) {
            logger.error('Failed to connect to Redis', {
                error: error.message,
                url: this.redisUrl
            });
            this.isEnabled = false;
            this.isConnected = false;
        }
    }

    /**
     * Disconnect from Redis
     */
    async disconnect() {
        if (this.client && this.isConnected) {
            try {
                await this.client.quit();
                logger.info('Redis client disconnected gracefully');
            } catch (error) {
                logger.error('Error disconnecting Redis client', { error: error.message });
            }
        }
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {Promise<any|null>} Cached value or null
     */
    async get(key) {
        if (!this.isEnabled || !this.isConnected) {
            return null;
        }

        try {
            const value = await this.client.get(key);
            if (value) {
                return JSON.parse(value);
            }
            return null;
        } catch (error) {
            logger.error('Redis get error', { key, error: error.message });
            return null;
        }
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, ttl = 300) {
        if (!this.isEnabled || !this.isConnected) {
            return false;
        }

        try {
            const serialized = JSON.stringify(value);
            await this.client.setEx(key, ttl, serialized);
            return true;
        } catch (error) {
            logger.error('Redis set error', { key, ttl, error: error.message });
            return false;
        }
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async del(key) {
        if (!this.isEnabled || !this.isConnected) {
            return false;
        }

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            logger.error('Redis del error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Delete multiple keys matching a pattern
     * @param {string} pattern - Key pattern (e.g., 'license:tenant123:*')
     * @returns {Promise<number>} Number of keys deleted
     */
    async delPattern(pattern) {
        if (!this.isEnabled || !this.isConnected) {
            return 0;
        }

        try {
            const keys = await this.client.keys(pattern);
            if (keys.length === 0) {
                return 0;
            }
            await this.client.del(keys);
            return keys.length;
        } catch (error) {
            logger.error('Redis delPattern error', { pattern, error: error.message });
            return 0;
        }
    }

    /**
     * Check if key exists
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Exists status
     */
    async exists(key) {
        if (!this.isEnabled || !this.isConnected) {
            return false;
        }

        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error('Redis exists error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Get remaining TTL for a key
     * @param {string} key - Cache key
     * @returns {Promise<number>} TTL in seconds, -1 if no expiry, -2 if key doesn't exist
     */
    async ttl(key) {
        if (!this.isEnabled || !this.isConnected) {
            return -2;
        }

        try {
            return await this.client.ttl(key);
        } catch (error) {
            logger.error('Redis ttl error', { key, error: error.message });
            return -2;
        }
    }

    /**
     * Increment a counter
     * @param {string} key - Cache key
     * @param {number} amount - Amount to increment (default: 1)
     * @returns {Promise<number|null>} New value or null on error
     */
    async incr(key, amount = 1) {
        if (!this.isEnabled || !this.isConnected) {
            return null;
        }

        try {
            if (amount === 1) {
                return await this.client.incr(key);
            } else {
                return await this.client.incrBy(key, amount);
            }
        } catch (error) {
            logger.error('Redis incr error', { key, amount, error: error.message });
            return null;
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        return {
            enabled: this.isEnabled,
            connected: this.isConnected,
            url: this.redisUrl
        };
    }
}

// Export singleton instance
const redisService = new RedisService();
export default redisService;
