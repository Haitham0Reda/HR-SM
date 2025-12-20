/**
 * API Key Authentication Middleware for License Server
 * 
 * Secure API key authentication for license server endpoints
 * Supports both platform admin authentication and HR-SM backend authentication
 * 
 * Requirements: 6.4, 9.1 - Secure license server with API key authentication
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * API Key configuration
 */
const API_KEY_CONFIG = {
    keyLength: 64, // 64 character API keys
    hashAlgorithm: 'sha256',
    keyPrefix: 'hrsm_',
    expirationDays: 365 // API keys expire after 1 year
};

/**
 * In-memory API key store (in production, use database)
 * Format: { keyHash: { name, permissions, createdAt, expiresAt, lastUsed } }
 */
const apiKeys = new Map();

/**
 * Load RSA public key for JWT verification
 */
let publicKey = null;
try {
    const publicKeyPath = path.resolve(process.env.JWT_PUBLIC_KEY_PATH || '../../../keys/public.pem');
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
} catch (error) {
    console.warn('⚠️  Public key not found for JWT verification:', error.message);
}

/**
 * Generate API key
 */
export const generateApiKey = (name, permissions = ['read']) => {
    const key = API_KEY_CONFIG.keyPrefix + crypto.randomBytes(API_KEY_CONFIG.keyLength / 2).toString('hex');
    const keyHash = crypto.createHash(API_KEY_CONFIG.hashAlgorithm).update(key).digest('hex');
    
    const keyData = {
        name,
        permissions,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (API_KEY_CONFIG.expirationDays * 24 * 60 * 60 * 1000)).toISOString(),
        lastUsed: null,
        usageCount: 0
    };
    
    apiKeys.set(keyHash, keyData);
    
    console.log(`✅ API key generated for: ${name}`);
    
    return {
        key,
        keyHash,
        ...keyData
    };
};

/**
 * Validate API key
 */
export const validateApiKey = (key) => {
    if (!key || !key.startsWith(API_KEY_CONFIG.keyPrefix)) {
        return null;
    }
    
    const keyHash = crypto.createHash(API_KEY_CONFIG.hashAlgorithm).update(key).digest('hex');
    const keyData = apiKeys.get(keyHash);
    
    if (!keyData) {
        return null;
    }
    
    // Check expiration
    if (new Date() > new Date(keyData.expiresAt)) {
        return null;
    }
    
    // Update usage
    keyData.lastUsed = new Date().toISOString();
    keyData.usageCount++;
    
    return {
        keyHash,
        ...keyData
    };
};

/**
 * Revoke API key
 */
export const revokeApiKey = (keyHash) => {
    const deleted = apiKeys.delete(keyHash);
    if (deleted) {
        console.log(`🗑️  API key revoked: ${keyHash.substring(0, 8)}...`);
    }
    return deleted;
};

/**
 * List all API keys (without the actual keys)
 */
export const listApiKeys = () => {
    const keys = [];
    for (const [keyHash, keyData] of apiKeys.entries()) {
        keys.push({
            keyHash: keyHash.substring(0, 8) + '...',
            name: keyData.name,
            permissions: keyData.permissions,
            createdAt: keyData.createdAt,
            expiresAt: keyData.expiresAt,
            lastUsed: keyData.lastUsed,
            usageCount: keyData.usageCount
        });
    }
    return keys;
};

/**
 * Initialize default API keys
 */
export const initializeDefaultApiKeys = () => {
    // Generate default API key for HR-SM backend
    const hrsmBackendKey = generateApiKey('HRSM-Backend', ['validate', 'usage']);
    console.log(`🔑 HRSM Backend API Key: ${hrsmBackendKey.key}`);
    console.log('   Add this to your HR-SM backend .env file as LICENSE_SERVER_API_KEY');
    
    // Generate default API key for platform admin
    const platformAdminKey = generateApiKey('Platform-Admin', ['admin', 'read', 'write']);
    console.log(`🔑 Platform Admin API Key: ${platformAdminKey.key}`);
    console.log('   Use this for platform admin operations');
    
    return {
        hrsmBackendKey: hrsmBackendKey.key,
        platformAdminKey: platformAdminKey.key
    };
};

/**
 * API Key authentication middleware
 */
export const authenticateApiKey = (requiredPermissions = []) => {
    return (req, res, next) => {
        const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
        
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API key required',
                code: 'NO_API_KEY'
            });
        }
        
        const keyData = validateApiKey(apiKey);
        
        if (!keyData) {
            console.warn(`❌ Invalid API key attempt from IP: ${req.ip}`);
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired API key',
                code: 'INVALID_API_KEY'
            });
        }
        
        // Check permissions
        if (requiredPermissions.length > 0) {
            const hasPermission = requiredPermissions.some(permission => 
                keyData.permissions.includes(permission) || keyData.permissions.includes('admin')
            );
            
            if (!hasPermission) {
                console.warn(`❌ Insufficient permissions for API key: ${keyData.name}`);
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    required: requiredPermissions,
                    granted: keyData.permissions
                });
            }
        }
        
        // Attach API key info to request
        req.apiKey = {
            name: keyData.name,
            permissions: keyData.permissions,
            keyHash: keyData.keyHash
        };
        
        next();
    };
};

/**
 * Platform admin authentication (JWT + API Key)
 */
export const authenticatePlatformAdmin = (req, res, next) => {
    // First try JWT authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token && publicKey) {
        try {
            const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
            
            if (decoded.type === 'platform' && decoded.role === 'admin') {
                req.admin = {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role,
                    type: 'jwt'
                };
                return next();
            }
        } catch (error) {
            // JWT verification failed, try API key
        }
    }
    
    // Fall back to API key authentication
    const apiKeyAuth = authenticateApiKey(['admin']);
    apiKeyAuth(req, res, (err) => {
        if (err) return next(err);
        
        // Convert API key auth to admin format
        req.admin = {
            id: req.apiKey.name,
            email: `${req.apiKey.name}@api-key`,
            role: 'admin',
            type: 'api_key',
            permissions: req.apiKey.permissions
        };
        
        next();
    });
};

/**
 * HR-SM Backend authentication (API Key only)
 */
export const authenticateHRSMBackend = authenticateApiKey(['validate', 'usage']);

/**
 * Rate limiting by API key
 */
export const rateLimitByApiKey = (windowMs = 15 * 60 * 1000, maxRequests = 1000) => {
    const requestCounts = new Map();
    
    return (req, res, next) => {
        const keyHash = req.apiKey?.keyHash;
        
        if (!keyHash) {
            return next(); // No API key, skip rate limiting
        }
        
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old entries
        if (requestCounts.has(keyHash)) {
            const requests = requestCounts.get(keyHash).filter(time => time > windowStart);
            requestCounts.set(keyHash, requests);
        } else {
            requestCounts.set(keyHash, []);
        }
        
        const requests = requestCounts.get(keyHash);
        
        if (requests.length >= maxRequests) {
            console.warn(`⚠️  API key rate limit exceeded: ${req.apiKey.name}`);
            return res.status(429).json({
                success: false,
                error: 'API key rate limit exceeded',
                retryAfter: Math.ceil((requests[0] + windowMs - now) / 1000)
            });
        }
        
        requests.push(now);
        next();
    };
};

/**
 * Log API key usage
 */
export const logApiKeyUsage = (req, res, next) => {
    if (req.apiKey) {
        console.log(`🔑 API Key Usage: ${req.apiKey.name} - ${req.method} ${req.path}`);
    }
    next();
};

export default {
    generateApiKey,
    validateApiKey,
    revokeApiKey,
    listApiKeys,
    initializeDefaultApiKeys,
    authenticateApiKey,
    authenticatePlatformAdmin,
    authenticateHRSMBackend,
    rateLimitByApiKey,
    logApiKeyUsage
};