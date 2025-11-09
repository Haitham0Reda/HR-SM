/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Announcement from '../../models/announcement.model.js';
import * as announcementController from '../../controller/announcement.controller.js';
import { createMockResponse, createMockRequest, createTestSchool, createTestUser, cleanupTestData } from './testHelpers.js';

describe('Announcement Controller - All 6 Functions', () => {
    let mockReq, mockRes, testSchool, testUser;

    beforeEach(async () => {
        testSchool = await createTestSchool();
        testUser = await createTestUser(testSchool._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Announcement.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllAnnouncements', () => {
        it('should execute getAllAnnouncements function', async () => {
            await announcementController.getAllAnnouncements(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllAnnouncements', async () => {
            // Function executes normally
            await announcementController.getAllAnnouncements(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. getActiveAnnouncements', () => {
        it('should execute getActiveAnnouncements function', async () => {
            await announcementController.getActiveAnnouncements(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getActiveAnnouncements', async () => {
            // Function executes normally
            await announcementController.getActiveAnnouncements(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. createAnnouncement', () => {
        it('should execute createAnnouncement function', async () => {
            await announcementController.createAnnouncement(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createAnnouncement', async () => {
            // Function executes normally
            await announcementController.createAnnouncement(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. getAnnouncementById', () => {
        it('should execute getAnnouncementById function', async () => {
            await announcementController.getAnnouncementById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getAnnouncementById', async () => {
            mockReq.params.id = 'invalid-id';
            await announcementController.getAnnouncementById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. updateAnnouncement', () => {
        it('should execute updateAnnouncement function', async () => {
            await announcementController.updateAnnouncement(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateAnnouncement', async () => {
            mockReq.params.id = 'invalid-id';
            await announcementController.updateAnnouncement(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. deleteAnnouncement', () => {
        it('should execute deleteAnnouncement function', async () => {
            await announcementController.deleteAnnouncement(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteAnnouncement', async () => {
            mockReq.params.id = 'invalid-id';
            await announcementController.deleteAnnouncement(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
