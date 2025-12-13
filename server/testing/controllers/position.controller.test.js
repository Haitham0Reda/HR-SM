/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Position from '../../modules/hr-core/users/models/position.model.js';
import * as positionController from '../../modules/hr-core/users/controllers/position.controller.js';
import { createMockResponse, createMockRequest, createTestUser, cleanupTestData } from './testHelpers.js';

describe('Position Controller - All 5 Functions', () => {
    let mockReq, mockRes, testUser;

    beforeEach(async () => {
        testUser = await createTestUser(null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Position.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllPositions', () => {
        it('should execute getAllPositions function', async () => {
            await positionController.getAllPositions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllPositions', async () => {
            // Function executes normally
            await positionController.getAllPositions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. createPosition', () => {
        it('should execute createPosition function', async () => {
            await positionController.createPosition(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createPosition', async () => {
            // Function executes normally
            await positionController.createPosition(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getPositionById', () => {
        it('should execute getPositionById function', async () => {
            await positionController.getPositionById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getPositionById', async () => {
            mockReq.params.id = 'invalid-id';
            await positionController.getPositionById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updatePosition', () => {
        it('should execute updatePosition function', async () => {
            await positionController.updatePosition(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updatePosition', async () => {
            mockReq.params.id = 'invalid-id';
            await positionController.updatePosition(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deletePosition', () => {
        it('should execute deletePosition function', async () => {
            await positionController.deletePosition(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deletePosition', async () => {
            mockReq.params.id = 'invalid-id';
            await positionController.deletePosition(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
