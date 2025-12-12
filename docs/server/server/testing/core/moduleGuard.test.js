/**
 * Unit Tests for Module Guard Middleware
 * 
 * Tests module access control functionality
 * Requirements: 1.5, 3.2, 7.3
 */

import { moduleGuard, anyModuleGuard, allModulesGuard, isModuleAvailable } from '../../core/middleware/moduleGuard.js';
import moduleRegistry from '../../core/registry/moduleRegistry.js';
import AppError from '../../core/errors/AppError.js';
import { ERROR_TYPES } from '../../core/errors/errorTypes.js';

describe('Module Guard Middleware', () => {
    // Mock request, response, and next
    let req, res, next;

    beforeEach(() => {
        // Clear module registry before each test
        moduleRegistry.clear();

        // Register test modules
        moduleRegistry.register({
            name: 'test-module',
            displayName: 'Test Module',
            version: '1.0.0',
            description: 'Test module for unit tests',
            dependencies: [],
            optionalDependencies: []
        });

        moduleRegistry.register({
            name: 'dependent-module',
            displayName: 'Dependent Module',
            version: '1.0.0',
            description: 'Module with dependencies',
            dependencies: ['test-module'],
            optionalDependencies: []
        });

        moduleRegistry.register({
            name: 'optional-dep-module',
            displayName: 'Optional Dependency Module',
            version: '1.0.0',
            description: 'Module with optional dependencies',
            dependencies: [],
            optionalDependencies: ['email-service']
        });

        // Setup mock request, response, and next
        req = {
            tenant: {
                id: 'tenant_123',
                name: 'Test Tenant',
                enabledModules: ['test-module', 'dependent-module']
            }
        };

        res = {
            status: function() { return this; },
            json: function() { return this; }
        };

        // Create a simple mock for next function
        next = function(error) {
            next.called = true;
            next.callCount = (next.callCount || 0) + 1;
            next.error = error;
        };
        next.called = false;
        next.callCount = 0;
        next.error = null;
    });

    afterEach(() => {
        // Reset next function
        if (next) {
            next.called = false;
            next.callCount = 0;
            next.error = null;
        }
    });

    describe('moduleGuard - Basic Functionality', () => {
        it('should allow access when module is enabled for tenant', async () => {
            const middleware = moduleGuard('test-module');

            await middleware(req, res, next);

            expect(next.called).toBe(true);
            expect(next.callCount).toBe(1);
            expect(next.error).toBeUndefined();
            expect(req.moduleAvailable).toBe(true);
            expect(req.module).toEqual({
                name: 'test-module',
                enabled: true,
                missingOptionalDependencies: []
            });
        });

        it('should block access (HTTP 403) when module is disabled for tenant', async () => {
            const middleware = moduleGuard('disabled-module');

            // Register the disabled module
            moduleRegistry.register({
                name: 'disabled-module',
                displayName: 'Disabled Module',
                version: '1.0.0',
                description: 'Module that is disabled',
                dependencies: []
            });

            await middleware(req, res, next);

            expect(next.called).toBe(true);
            expect(next.callCount).toBe(1);
            expect(next.error).toBeInstanceOf(AppError);
            expect(next.error.statusCode).toBe(403);
            expect(next.error.code).toBe(ERROR_TYPES.MODULE_DISABLED);
            expect(next.error.message).toContain('disabled-module');
            expect(next.error.message).toContain('not enabled');
        });

        it('should return 404 when module does not exist in registry', async () => {
            const middleware = moduleGuard('non-existent-module');

            await middleware(req, res, next);

            expect(next.called).toBe(true);
            expect(next.callCount).toBe(1);
            expect(next.error).toBeInstanceOf(AppError);
            expect(next.error.statusCode).toBe(404);
            expect(next.error.code).toBe(ERROR_TYPES.MODULE_NOT_FOUND);
            expect(next.error.message).toContain('non-existent-module');
        });

        it('should return 401 when tenant context is missing', async () => {
            const middleware = moduleGuard('test-module');
            req.tenant = null;

            await middleware(req, res, next);

            expect(next.called).toBe(true);
            expect(next.callCount).toBe(1);
            expect(next.error).toBeInstanceOf(AppError);
            expect(next.error.statusCode).toBe(401);
            expect(next.error.code).toBe(ERROR_TYPES.UNAUTHORIZED);
            expect(next.error.message).toContain('Tenant context required');
        });
    });

    describe('moduleGuard - Requirements Validation', () => {
        it('should enforce requirement 1.5: Check if module is enabled for tenant', async () => {
            // Requirement 1.5: Module guard checks if module is enabled for tenant
            const middleware = moduleGuard('test-module');

            await middleware(req, res, next);

            expect(next.called).toBe(true);
            expect(next.error).toBeUndefined();
            expect(req.moduleAvailable).toBe(true);
        });

        it('should enforce requirement 1.5: Return HTTP 403 if module is disabled', async () => {
            // Requirement 1.5: Return HTTP 403 if module is disabled
            moduleRegistry.register({
                name: 'disabled-module',
                displayName: 'Disabled Module',
                version: '1.0.0',
                description: 'Disabled module',
                dependencies: []
            });

            const middleware = moduleGuard('disabled-module');

            await middleware(req, res, next);

            expect(next.error.statusCode).toBe(403);
            expect(next.error.code).toBe(ERROR_TYPES.MODULE_DISABLED);
        });

        it('should enforce requirement 3.2: Disabled modules block all access', async () => {
            // Requirement 3.2: Disabled modules return 403
            moduleRegistry.register({
                name: 'blocked-module',
                displayName: 'Blocked Module',
                version: '1.0.0',
                description: 'Module to be blocked',
                dependencies: []
            });

            const middleware = moduleGuard('blocked-module');

            await middleware(req, res, next);

            expect(next.error).toBeInstanceOf(AppError);
            expect(next.error.statusCode).toBe(403);
            expect(next.error.message).toContain('not enabled');
        });

        it('should enforce requirement 7.3: Support optional dependencies with graceful degradation', async () => {
            // Requirement 7.3: Optional dependencies allow graceful degradation
            req.tenant.enabledModules.push('optional-dep-module');

            const middleware = moduleGuard('optional-dep-module');

            await middleware(req, res, next);

            expect(next.called).toBe(true);
            expect(next.error).toBeUndefined();
            expect(req.moduleAvailable).toBe(true);
            expect(req.module.missingOptionalDependencies).toContain('email-service');
        });
    });
});
