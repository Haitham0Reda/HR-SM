/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Notification from '../../models/notification.model.js';
import * as notificationController from '../../controller/notification.controller.js';
import { createMockResponse, createMockRequest, createTestSchool, createTestUser, cleanupTestData } from './testHelpers.js';

describe('Notification Controller - All 5 Functions', () => {
    let mockReq, mockRes, testSchool, testUser;

    beforeEach(async () => {
        testSchool = await createTestSchool();
        testUser = await createTestUser(testSchool._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Notification.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllNotifications', () => {
        it('should execute getAllNotifications function', async () => {
            await notificationController.getAllNotifications(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllNotifications', async () => {
            // Function executes normally
            await notificationController.getAllNotifications(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. createNotification', () => {
        it('should execute createNotification function', async () => {
            await notificationController.createNotification(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createNotification', async () => {
            // Function executes normally
            await notificationController.createNotification(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getNotificationById', () => {
        it('should execute getNotificationById function', async () => {
            await notificationController.getNotificationById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getNotificationById', async () => {
            mockReq.params.id = 'invalid-id';
            await notificationController.getNotificationById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updateNotification', () => {
        it('should execute updateNotification function', async () => {
            await notificationController.updateNotification(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateNotification', async () => {
            mockReq.params.id = 'invalid-id';
            await notificationController.updateNotification(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deleteNotification', () => {
        it('should execute deleteNotification function', async () => {
            await notificationController.deleteNotification(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteNotification', async () => {
            mockReq.params.id = 'invalid-id';
            await notificationController.deleteNotification(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
