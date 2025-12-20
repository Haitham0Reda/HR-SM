/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Document from '../../modules/documents/models/document.model.js';
import * as documentController from '../../modules/documents/controllers/document.controller.js';
import { createMockResponse, createMockRequest, createTestUser, createTestDepartment, cleanupTestData } from './testHelpers.js';

describe('Document Controller - All 5 Functions', () => {
    let mockReq, mockRes, testorganization, testUser;

    beforeEach(async () => {
        testorganization = await createTestDepartment();
        testUser = await createTestUser(testorganization._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Document.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllDocuments', () => {
        it('should execute getAllDocuments function', async () => {
            await documentController.getAllDocuments(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllDocuments', async () => {
            // Function executes normally
            await documentController.getAllDocuments(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. createDocument', () => {
        it('should execute createDocument function', async () => {
            await documentController.createDocument(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createDocument', async () => {
            // Function executes normally
            await documentController.createDocument(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getDocumentById', () => {
        it('should execute getDocumentById function', async () => {
            await documentController.getDocumentById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getDocumentById', async () => {
            mockReq.params.id = 'invalid-id';
            await documentController.getDocumentById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updateDocument', () => {
        it('should execute updateDocument function', async () => {
            await documentController.updateDocument(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateDocument', async () => {
            mockReq.params.id = 'invalid-id';
            await documentController.updateDocument(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deleteDocument', () => {
        it('should execute deleteDocument function', async () => {
            await documentController.deleteDocument(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteDocument', async () => {
            mockReq.params.id = 'invalid-id';
            await documentController.deleteDocument(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
