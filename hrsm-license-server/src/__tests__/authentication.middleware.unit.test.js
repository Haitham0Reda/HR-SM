/**
 * Authentication Middleware Tests
 * 
 * Tests for API key authentication middleware
 * Requirements: 3.9, 8.1, 8.4
 */

import { jest } from '@jest/globals';
import { 
    authenticateApiKey, 
    validateApiKey, 
    generateApiKey,
    initializeDefaultApiKeys 
} from '../middleware/apiKeyAuth.middleware.js';

describe('Authentication Middleware', () => {
    let req, res, next;
    
    // Store the original NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    
    beforeAll(() => {
        // Set to development to use fixed API keys
        process.env.NODE_ENV = 'development';
    });
    
    afterAll(() => {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalEnv;
    });
    
    beforeEach(() => {
        // Reset API keys before each test
        jest.clearAllMocks();
        
        // Mock request, response, and next
        req = {
            headers: {},
            ip: '127.0.0.1'
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        
        next = jest.fn();
        
        // Initialize default API keys for testing (will use fixed keys in development)
        initializeDefaultApiKeys();
    });
    
    describe('authenticateApiKey - Requirement 3.9, 8.1', () => {
        it('should return 401 when no API key is provided', () => {
            const middleware = authenticateApiKey();
            
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    code: 'AUTHENTICATION_FAILED',
                    message: 'API key required',
                    statusCode: 401
                })
            });
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should return 401 when invalid API key is provided - Requirement 8.4', () => {
            req.headers['x-api-key'] = 'invalid_key_12345';
            
            const middleware = authenticateApiKey();
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    code: 'INVALID_API_KEY',
                    message: 'Invalid or expired API key',
                    statusCode: 401
                })
            });
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should authenticate with valid API key from X-API-Key header', () => {
            // Use the development fixed key
            const validKey = 'hrsm_dev_backend_key_1234567890123456789012345678901234567890123';
            req.headers['x-api-key'] = validKey;
            
            const middleware = authenticateApiKey();
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(req.apiKey).toBeDefined();
            expect(req.apiKey.name).toBe('HRSM-Backend');
            expect(res.status).not.toHaveBeenCalled();
        });
        
        it('should authenticate with valid API key from Authorization header', () => {
            const validKey = 'hrsm_dev_backend_key_1234567890123456789012345678901234567890123';
            req.headers['authorization'] = `Bearer ${validKey}`;
            
            const middleware = authenticateApiKey();
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(req.apiKey).toBeDefined();
            expect(res.status).not.toHaveBeenCalled();
        });
        
        it('should return 403 when API key lacks required permissions', () => {
            // Backend key only has 'validate' and 'usage' permissions
            const backendKey = 'hrsm_dev_backend_key_1234567890123456789012345678901234567890123';
            req.headers['x-api-key'] = backendKey;
            
            // Require 'admin' permission
            const middleware = authenticateApiKey(['admin']);
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    code: 'INSUFFICIENT_PERMISSIONS',
                    statusCode: 403
                })
            });
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should allow access when API key has required permissions', () => {
            // Admin key has 'admin' permission
            const adminKey = 'hrsm_dev_admin_key_1234567890123456789012345678901234567890123';
            req.headers['x-api-key'] = adminKey;
            
            const middleware = authenticateApiKey(['admin']);
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(req.apiKey).toBeDefined();
            expect(req.apiKey.permissions).toContain('admin');
        });
        
        it('should allow access when API key has admin permission (grants all)', () => {
            const adminKey = 'hrsm_dev_admin_key_1234567890123456789012345678901234567890123';
            req.headers['x-api-key'] = adminKey;
            
            // Admin should have access even when requiring specific permissions
            const middleware = authenticateApiKey(['write', 'read']);
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
    });
    
    describe('validateApiKey', () => {
        it('should return null for invalid API key format', () => {
            const result = validateApiKey('invalid_format');
            expect(result).toBeNull();
        });
        
        it('should return null for API key without correct prefix', () => {
            const result = validateApiKey('wrong_prefix_1234567890');
            expect(result).toBeNull();
        });
        
        it('should return null for non-existent API key', () => {
            const result = validateApiKey('hrsm_nonexistent_key_12345678901234567890123456789012345678');
            expect(result).toBeNull();
        });
        
        it('should return key data for valid API key', () => {
            const validKey = 'hrsm_dev_backend_key_1234567890123456789012345678901234567890123';
            const result = validateApiKey(validKey);
            
            expect(result).toBeDefined();
            expect(result.name).toBe('HRSM-Backend');
            expect(result.permissions).toContain('validate');
            expect(result.permissions).toContain('usage');
        });
        
        it('should update usage count on validation', () => {
            const validKey = 'hrsm_dev_backend_key_1234567890123456789012345678901234567890123';
            
            const result1 = validateApiKey(validKey);
            const initialCount = result1.usageCount;
            
            const result2 = validateApiKey(validKey);
            expect(result2.usageCount).toBe(initialCount + 1);
        });
        
        it('should update lastUsed timestamp on validation', () => {
            const validKey = 'hrsm_dev_backend_key_1234567890123456789012345678901234567890123';
            
            const result = validateApiKey(validKey);
            expect(result.lastUsed).toBeDefined();
            
            const lastUsedDate = new Date(result.lastUsed);
            const now = new Date();
            const timeDiff = now - lastUsedDate;
            
            // Should be within 1 second
            expect(timeDiff).toBeLessThan(1000);
        });
    });
    
    describe('generateApiKey', () => {
        it('should generate API key with correct format', () => {
            const result = generateApiKey('Test-Service', ['read']);
            
            expect(result.key).toMatch(/^hrsm_/);
            expect(result.key.length).toBeGreaterThan(20);
            expect(result.name).toBe('Test-Service');
            expect(result.permissions).toEqual(['read']);
        });
        
        it('should generate unique API keys', () => {
            const key1 = generateApiKey('Service-1', ['read']);
            const key2 = generateApiKey('Service-2', ['read']);
            
            expect(key1.key).not.toBe(key2.key);
            expect(key1.keyHash).not.toBe(key2.keyHash);
        });
        
        it('should set expiration date', () => {
            const result = generateApiKey('Test-Service', ['read']);
            
            expect(result.expiresAt).toBeDefined();
            const expiryDate = new Date(result.expiresAt);
            const now = new Date();
            
            // Should expire in approximately 1 year
            const daysDiff = (expiryDate - now) / (1000 * 60 * 60 * 24);
            expect(daysDiff).toBeGreaterThan(360);
            expect(daysDiff).toBeLessThan(370);
        });
    });
    
    describe('Error Response Format', () => {
        it('should return standardized error format for missing API key', () => {
            const middleware = authenticateApiKey();
            middleware(req, res, next);
            
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: expect.any(String),
                    message: expect.any(String),
                    statusCode: 401
                }
            });
        });
        
        it('should return standardized error format for invalid API key', () => {
            req.headers['x-api-key'] = 'invalid_key';
            
            const middleware = authenticateApiKey();
            middleware(req, res, next);
            
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: expect.any(String),
                    message: expect.any(String),
                    statusCode: 401
                }
            });
        });
        
        it('should return standardized error format for insufficient permissions', () => {
            const backendKey = 'hrsm_dev_backend_key_1234567890123456789012345678901234567890123';
            req.headers['x-api-key'] = backendKey;
            
            const middleware = authenticateApiKey(['admin']);
            middleware(req, res, next);
            
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: expect.any(String),
                    statusCode: 403
                })
            });
        });
    });
});
