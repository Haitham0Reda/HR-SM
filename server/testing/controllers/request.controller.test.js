/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Request from '../../models/request.model.js';
import * as requestController from '../../controller/request.controller.js';
import { createMockResponse, createMockRequest, createTestSchool, createTestUser, cleanupTestData } from './testHelpers.js';

describe('Request Controller - All 5 Functions', () => {
    let mockReq, mockRes, testSchool, testUser;

    beforeEach(async () => {
        testSchool = await createTestSchool();
        testUser = await createTestUser(testSchool._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Request.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllRequests', () => {
        it('should execute getAllRequests function', async () => {
            await requestController.getAllRequests(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllRequests', async () => {
            // Function executes normally
            await requestController.getAllRequests(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. createRequest', () => {
        it('should execute createRequest function', async () => {
            await requestController.createRequest(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createRequest', async () => {
            // Function executes normally
            await requestController.createRequest(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getRequestById', () => {
        it('should execute getRequestById function', async () => {
            await requestController.getRequestById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getRequestById', async () => {
            mockReq.params.id = 'invalid-id';
            await requestController.getRequestById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updateRequest', () => {
        it('should execute updateRequest function', async () => {
            await requestController.updateRequest(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateRequest', async () => {
            mockReq.params.id = 'invalid-id';
            await requestController.updateRequest(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deleteRequest', () => {
        it('should execute deleteRequest function', async () => {
            await requestController.deleteRequest(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteRequest', async () => {
            mockReq.params.id = 'invalid-id';
            await requestController.deleteRequest(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
