/**
 * Tenant Status Access Control Tests
 * 
 * Tests for tenant status access control implementation
 * Validates Requirements 1.5
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { protect } from '../../../middleware/authMiddleware.js';

// Mock the Tenant model
const mockTenant = {
    findOne: jest.fn()
};

// Mock the User model
const mockUser = {
    findById: jest.fn()
};

// Mock the imports
jest.mock('../../../platform/tenants/models/Tenant.js', () => ({
    default: mockTenant
}));

jest.mock('../../../modules/hr-core/users/models/user.model.js', () => ({
    default: mockUser
}));

// Mock the activity logger
jest.mock('../../../middleware/activityLogger.js', () => ({
    logAuthEvent: jest.fn(),
    logAccessControl: jest.fn()
}));

describe('Tenant Status Access Control', () => {
    let app;
    let validToken;
    let mockUserData;

    beforeEach(() => {
        // Create Express app for testing
        app = express();
        app.use(express.json());
        
        // Add the protect middleware
        app.use(protect);
        
        // Add a test route
        app.get('/test', (req, res) => {
            res.json({ success: true, message: 'Access granted' });
        });

        // Create a valid JWT token
        validToken = jwt.sign(
            { 
                id: 'user123',
                tenantId: 'test_tenant_123'
            },
            process.env.TENANT_JWT_SECRET || process.env.JWT_SECRET || 'test-secret'
        );

        // Mock user data
        mockUserData = {
            _id: 'user123',
            email: 'test@example.com',
            role: 'employee',
            tenantId: 'test_tenant_123',
            select: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis()
        };

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('Active Tenant Access', () => {
        test('should allow access for active tenant', async () => {
            // Mock active tenant
            mockTenant.findOne.mockResolvedValue({
                tenantId: 'test_tenant_123',
                status: 'active',
                enabledModules: [],
                config: {}
            });

            // Mock user lookup
            mockUser.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(mockUserData)
                })
            });

            const response = await request(app)
                .get('/test')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Access granted');
        });
    });

    describe('Suspended Tenant Access', () => {
        test('should deny access for suspended tenant', async () => {
            // Mock suspended tenant
            mockTenant.findOne.mockResolvedValue({
                tenantId: 'test_tenant_123',
                status: 'suspended',
                enabledModules: [],
                config: {}
            });

            const response = await request(app)
                .get('/test')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Tenant account is suspended');
        });
    });

    describe('Cancelled Tenant Access', () => {
        test('should deny access for cancelled tenant', async () => {
            // Mock cancelled tenant
            mockTenant.findOne.mockResolvedValue({
                tenantId: 'test_tenant_123',
                status: 'cancelled',
                enabledModules: [],
                config: {}
            });

            const response = await request(app)
                .get('/test')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Tenant account is cancelled');
        });
    });

    describe('Trial Tenant Access', () => {
        test('should allow access for trial tenant', async () => {
            // Mock trial tenant
            mockTenant.findOne.mockResolvedValue({
                tenantId: 'test_tenant_123',
                status: 'trial',
                enabledModules: [],
                config: {}
            });

            // Mock user lookup
            mockUser.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(mockUserData)
                })
            });

            const response = await request(app)
                .get('/test')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Access granted');
        });
    });

    describe('Error Response Format', () => {
        test('should return standardized error format for suspended tenant', async () => {
            // Mock suspended tenant
            mockTenant.findOne.mockResolvedValue({
                tenantId: 'test_tenant_123',
                status: 'suspended',
                enabledModules: [],
                config: {}
            });

            const response = await request(app)
                .get('/test')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                success: false,
                message: 'Tenant account is suspended'
            });
            
            // Should not have nested error object
            expect(response.body.error).toBeUndefined();
        });

        test('should return standardized error format for cancelled tenant', async () => {
            // Mock cancelled tenant
            mockTenant.findOne.mockResolvedValue({
                tenantId: 'test_tenant_123',
                status: 'cancelled',
                enabledModules: [],
                config: {}
            });

            const response = await request(app)
                .get('/test')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                success: false,
                message: 'Tenant account is cancelled'
            });
            
            // Should not have nested error object
            expect(response.body.error).toBeUndefined();
        });
    });
});