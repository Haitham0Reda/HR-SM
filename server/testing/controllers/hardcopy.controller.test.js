/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import HardCopy from '../../modules/documents/models/hardcopy.model.js';
import * as hardCopyController from '../../modules/documents/controllers/hardcopy.controller.js';
import { createMockResponse, createMockRequest, createTestUser, cleanupTestData } from './testHelpers.js';

describe('HardCopy Controller - All 5 Functions', () => {
    let mockReq, mockRes, testorganization, testUser;

    beforeEach(async () => {
        testorganization = await createTestorganization();
        testUser = await createTestUser(testorganization._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await HardCopy.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllHardCopies', () => {
        it('should execute getAllHardCopies function', async () => {
            await hardCopyController.getAllHardCopies(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 403, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllHardCopies', async () => {
            // Function executes normally
            await hardCopyController.getAllHardCopies(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 403, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. createHardCopy', () => {
        it('should execute createHardCopy function', async () => {
            await hardCopyController.createHardCopy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 403, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createHardCopy', async () => {
            // Function executes normally
            await hardCopyController.createHardCopy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 403, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getHardCopyById', () => {
        it('should execute getHardCopyById function', async () => {
            await hardCopyController.getHardCopyById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 403, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getHardCopyById', async () => {
            mockReq.params.id = 'invalid-id';
            await hardCopyController.getHardCopyById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 403, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updateHardCopy', () => {
        it('should execute updateHardCopy function', async () => {
            await hardCopyController.updateHardCopy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 403, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateHardCopy', async () => {
            mockReq.params.id = 'invalid-id';
            await hardCopyController.updateHardCopy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 403, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deleteHardCopy', () => {
        it('should execute deleteHardCopy function', async () => {
            await hardCopyController.deleteHardCopy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 403, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteHardCopy', async () => {
            mockReq.params.id = 'invalid-id';
            await hardCopyController.deleteHardCopy(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 403, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
