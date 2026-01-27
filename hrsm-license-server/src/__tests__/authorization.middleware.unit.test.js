/**
 * Authorization Middleware Tests
 * 
 * Tests for role-based access control (RBAC) middleware
 * Requirements: 3.10, 8.2, 8.3
 */

import { jest } from '@jest/globals';
import {
    requirePermission,
    requireRole,
    requireAdmin,
    requireWrite,
    requireRead,
    hasPermission,
    isPlatformAdmin,
    isHRSMBackend,
    PERMISSIONS,
    ROLES
} from '../middleware/authorization.middleware.js';

describe('Authorization Middleware', () => {
    let req, res, next;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        req = {
            ip: '127.0.0.1',
            method: 'GET',
            path: '/api/tenants'
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        
        next = jest.fn();
    });
    
    describe('requirePermission - Requirement 3.10, 8.2, 8.3', () => {
        it('should return 401 when no authenticated user', () => {
            const middleware = requirePermission([PERMISSIONS.READ]);
            
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    code: 'AUTHENTICATION_REQUIRED',
                    statusCode: 401
                })
            });
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should return 403 when user lacks required permission - Requirement 8.2, 8.3', () => {
            req.apiKey = {
                name: 'Test-Service',
                permissions: ['read'],
                keyHash: 'abc123'
            };
            
            const middleware = requirePermission([PERMISSIONS.WRITE]);
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: 'You do not have permission to perform this operation',
                    requiredPermissions: [PERMISSIONS.WRITE],
                    grantedPermissions: ['read'],
                    statusCode: 403
                })
            });
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should allow access when user has required permission', () => {
            req.apiKey = {
                name: 'Test-Service',
                permissions: ['read', 'write'],
                keyHash: 'abc123'
            };
            
            const middleware = requirePermission([PERMISSIONS.WRITE]);
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        
        it('should allow access when user has admin permission', () => {
            req.apiKey = {
                name: 'Admin-Service',
                permissions: ['admin'],
                keyHash: 'abc123'
            };
            
            // Admin should have access to everything
            const middleware = requirePermission([PERMISSIONS.WRITE]);
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
        
        it('should allow access when user has any of multiple required permissions', () => {
            req.apiKey = {
                name: 'Test-Service',
                permissions: ['read'],
                keyHash: 'abc123'
            };
            
            const middleware = requirePermission([PERMISSIONS.READ, PERMISSIONS.WRITE]);
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
        
        it('should work with req.admin instead of req.apiKey', () => {
            req.admin = {
                email: 'admin@example.com',
                permissions: ['admin'],
                role: 'admin'
            };
            
            const middleware = requirePermission([PERMISSIONS.WRITE]);
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
        
        it('should work with req.user instead of req.apiKey', () => {
            req.user = {
                id: 'user123',
                permissions: ['read', 'write'],
                role: 'user'
            };
            
            const middleware = requirePermission([PERMISSIONS.WRITE]);
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
    });
    
    describe('requireRole', () => {
        it('should return 401 when no authenticated user', () => {
            const middleware = requireRole(['admin']);
            
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should return 403 when user lacks required role', () => {
            req.apiKey = {
                name: 'Test-Service',
                role: 'user',
                permissions: ['read']
            };
            
            const middleware = requireRole(['admin']);
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    code: 'INSUFFICIENT_PERMISSIONS',
                    requiredRoles: ['admin'],
                    userRole: 'user',
                    statusCode: 403
                })
            });
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should allow access when user has required role', () => {
            req.apiKey = {
                name: 'Admin-Service',
                role: 'admin',
                permissions: ['admin']
            };
            
            const middleware = requireRole(['admin']);
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
        
        it('should allow access when user has any of multiple allowed roles', () => {
            req.apiKey = {
                name: 'Test-Service',
                role: 'user',
                permissions: ['read']
            };
            
            const middleware = requireRole(['admin', 'user']);
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
    });
    
    describe('requireAdmin', () => {
        it('should allow access for admin permission', () => {
            req.apiKey = {
                name: 'Admin-Service',
                permissions: ['admin'],
                keyHash: 'abc123'
            };
            
            const middleware = requireAdmin();
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
        
        it('should deny access for non-admin', () => {
            req.apiKey = {
                name: 'User-Service',
                permissions: ['read'],
                keyHash: 'abc123'
            };
            
            const middleware = requireAdmin();
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
    
    describe('requireWrite', () => {
        it('should allow access for write permission', () => {
            req.apiKey = {
                name: 'Writer-Service',
                permissions: ['write'],
                keyHash: 'abc123'
            };
            
            const middleware = requireWrite();
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
        
        it('should allow access for admin permission', () => {
            req.apiKey = {
                name: 'Admin-Service',
                permissions: ['admin'],
                keyHash: 'abc123'
            };
            
            const middleware = requireWrite();
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
        
        it('should deny access for read-only permission', () => {
            req.apiKey = {
                name: 'Reader-Service',
                permissions: ['read'],
                keyHash: 'abc123'
            };
            
            const middleware = requireWrite();
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
    
    describe('requireRead', () => {
        it('should allow access for read permission', () => {
            req.apiKey = {
                name: 'Reader-Service',
                permissions: ['read'],
                keyHash: 'abc123'
            };
            
            const middleware = requireRead();
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
        
        it('should allow access for admin permission', () => {
            req.apiKey = {
                name: 'Admin-Service',
                permissions: ['admin'],
                keyHash: 'abc123'
            };
            
            const middleware = requireRead();
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
    });
    
    describe('hasPermission utility', () => {
        it('should return false for null permissions', () => {
            expect(hasPermission(null, PERMISSIONS.READ)).toBe(false);
        });
        
        it('should return false for non-array permissions', () => {
            expect(hasPermission('read', PERMISSIONS.READ)).toBe(false);
        });
        
        it('should return true when user has exact permission', () => {
            expect(hasPermission(['read', 'write'], PERMISSIONS.READ)).toBe(true);
        });
        
        it('should return false when user lacks permission', () => {
            expect(hasPermission(['read'], PERMISSIONS.WRITE)).toBe(false);
        });
        
        it('should return true when user has admin permission', () => {
            expect(hasPermission(['admin'], PERMISSIONS.WRITE)).toBe(true);
            expect(hasPermission(['admin'], PERMISSIONS.READ)).toBe(true);
            expect(hasPermission(['admin'], PERMISSIONS.TENANTS_DELETE)).toBe(true);
        });
        
        it('should handle array of required permissions', () => {
            expect(hasPermission(['read'], [PERMISSIONS.READ, PERMISSIONS.WRITE])).toBe(true);
            expect(hasPermission(['write'], [PERMISSIONS.READ, PERMISSIONS.WRITE])).toBe(true);
            expect(hasPermission(['validate'], [PERMISSIONS.READ, PERMISSIONS.WRITE])).toBe(false);
        });
    });
    
    describe('isPlatformAdmin utility', () => {
        it('should return true for admin permission', () => {
            req.apiKey = {
                permissions: ['admin']
            };
            
            expect(isPlatformAdmin(req)).toBe(true);
        });
        
        it('should return true for admin:all permission', () => {
            req.apiKey = {
                permissions: [PERMISSIONS.ADMIN_ALL]
            };
            
            expect(isPlatformAdmin(req)).toBe(true);
        });
        
        it('should return false for non-admin', () => {
            req.apiKey = {
                permissions: ['read', 'write']
            };
            
            expect(isPlatformAdmin(req)).toBe(false);
        });
        
        it('should return false when no permissions', () => {
            expect(isPlatformAdmin(req)).toBe(false);
        });
    });
    
    describe('isHRSMBackend utility', () => {
        it('should return true for backend API key', () => {
            req.apiKey = {
                name: 'HRSM-Backend'
            };
            
            expect(isHRSMBackend(req)).toBe(true);
        });
        
        it('should return true for name containing "backend"', () => {
            req.apiKey = {
                name: 'My-Backend-Service'
            };
            
            expect(isHRSMBackend(req)).toBe(true);
        });
        
        it('should return true for name containing "hrsm"', () => {
            req.apiKey = {
                name: 'HRSM-Service'
            };
            
            expect(isHRSMBackend(req)).toBe(true);
        });
        
        it('should return false for non-backend API key', () => {
            req.apiKey = {
                name: 'Platform-Admin'
            };
            
            expect(isHRSMBackend(req)).toBe(false);
        });
        
        it('should return false when no API key', () => {
            expect(isHRSMBackend(req)).toBe(false);
        });
    });
    
    describe('Error Response Format', () => {
        it('should return standardized error for missing authentication', () => {
            const middleware = requirePermission([PERMISSIONS.READ]);
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
        
        it('should return standardized error for insufficient permissions', () => {
            req.apiKey = {
                name: 'Test-Service',
                permissions: ['read']
            };
            
            const middleware = requirePermission([PERMISSIONS.WRITE]);
            middleware(req, res, next);
            
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: expect.any(String),
                    requiredPermissions: expect.any(Array),
                    grantedPermissions: expect.any(Array),
                    statusCode: 403
                }
            });
        });
    });
    
    describe('PERMISSIONS constants', () => {
        it('should define tenant permissions', () => {
            expect(PERMISSIONS.TENANTS_READ).toBe('tenants:read');
            expect(PERMISSIONS.TENANTS_WRITE).toBe('tenants:write');
            expect(PERMISSIONS.TENANTS_DELETE).toBe('tenants:delete');
        });
        
        it('should define module permissions', () => {
            expect(PERMISSIONS.MODULES_READ).toBe('modules:read');
            expect(PERMISSIONS.MODULES_WRITE).toBe('modules:write');
        });
        
        it('should define license permissions', () => {
            expect(PERMISSIONS.LICENSES_READ).toBe('licenses:read');
            expect(PERMISSIONS.LICENSES_WRITE).toBe('licenses:write');
            expect(PERMISSIONS.LICENSES_VALIDATE).toBe('licenses:validate');
        });
        
        it('should define admin permission', () => {
            expect(PERMISSIONS.ADMIN_ALL).toBe('admin:all');
        });
    });
    
    describe('ROLES constants', () => {
        it('should define platform admin role with all permissions', () => {
            expect(ROLES.PLATFORM_ADMIN.name).toBe('platform_admin');
            expect(ROLES.PLATFORM_ADMIN.permissions).toContain(PERMISSIONS.ADMIN_ALL);
            expect(ROLES.PLATFORM_ADMIN.permissions).toContain(PERMISSIONS.TENANTS_DELETE);
        });
        
        it('should define HRSM backend role with limited permissions', () => {
            expect(ROLES.HRSM_BACKEND.name).toBe('hrsm_backend');
            expect(ROLES.HRSM_BACKEND.permissions).toContain(PERMISSIONS.TENANTS_READ);
            expect(ROLES.HRSM_BACKEND.permissions).toContain(PERMISSIONS.LICENSES_VALIDATE);
            expect(ROLES.HRSM_BACKEND.permissions).not.toContain(PERMISSIONS.TENANTS_DELETE);
        });
        
        it('should define read-only role', () => {
            expect(ROLES.READ_ONLY.name).toBe('read_only');
            expect(ROLES.READ_ONLY.permissions).toContain(PERMISSIONS.TENANTS_READ);
            expect(ROLES.READ_ONLY.permissions).not.toContain(PERMISSIONS.TENANTS_WRITE);
        });
    });
});
