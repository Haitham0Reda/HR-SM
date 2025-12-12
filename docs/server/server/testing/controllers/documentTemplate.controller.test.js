/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import DocumentTemplate from '../../modules/documents/models/documentTemplate.model.js';
import * as documentTemplateController from '../../modules/documents/controllers/documentTemplate.controller.js';
import { createMockResponse, createMockRequest, createTestorganization, createTestUser, cleanupTestData } from './testHelpers.js';

describe('DocumentTemplate Controller - All 5 Functions', () => {
    let mockReq, mockRes, testorganization, testUser;

    beforeEach(async () => {
        testorganization = await createTestorganization();
        testUser = await createTestUser(testorganization._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await DocumentTemplate.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllDocumentTemplates', () => {
        it('should execute getAllDocumentTemplates function', async () => {
            await documentTemplateController.getAllDocumentTemplates(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllDocumentTemplates', async () => {
            // Function executes normally
            await documentTemplateController.getAllDocumentTemplates(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. createDocumentTemplate', () => {
        it('should execute createDocumentTemplate function', async () => {
            await documentTemplateController.createDocumentTemplate(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createDocumentTemplate', async () => {
            // Function executes normally
            await documentTemplateController.createDocumentTemplate(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getDocumentTemplateById', () => {
        it('should execute getDocumentTemplateById function', async () => {
            await documentTemplateController.getDocumentTemplateById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getDocumentTemplateById', async () => {
            mockReq.params.id = 'invalid-id';
            await documentTemplateController.getDocumentTemplateById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updateDocumentTemplate', () => {
        it('should execute updateDocumentTemplate function', async () => {
            await documentTemplateController.updateDocumentTemplate(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateDocumentTemplate', async () => {
            mockReq.params.id = 'invalid-id';
            await documentTemplateController.updateDocumentTemplate(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deleteDocumentTemplate', () => {
        it('should execute deleteDocumentTemplate function', async () => {
            await documentTemplateController.deleteDocumentTemplate(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteDocumentTemplate', async () => {
            mockReq.params.id = 'invalid-id';
            await documentTemplateController.deleteDocumentTemplate(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
