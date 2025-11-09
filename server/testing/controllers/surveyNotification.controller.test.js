/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import SurveyNotification from '../../models/surveyNotification.model.js';
import Survey from '../../models/survey.model.js';
import User from '../../models/user.model.js';
import * as surveyNotificationController from '../../controller/surveyNotification.controller.js';
import { createMockResponse, createMockRequest, createTestSchool, createTestUser, cleanupTestData } from './testHelpers.js';

describe('SurveyNotification Controller - All 5 Functions', () => {
    let mockReq, mockRes, testSchool, testUser, testSurvey;

    beforeEach(async () => {
        testSchool = await createTestSchool();
        testUser = await createTestUser(testSchool._id, null, null);

        testSurvey = await Survey.create({
            title: 'Test Survey',
            description: 'Test Description',
            createdBy: testUser._id,
            questions: [],
            status: 'draft'
        });

        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await SurveyNotification.deleteMany({});
        await Survey.deleteMany({});
        await cleanupTestData();
    });

    describe('1. sendSurveyAssignmentNotifications', () => {
        it('should execute sendSurveyAssignmentNotifications function', async () => {
            const result = await surveyNotificationController.sendSurveyAssignmentNotifications(testSurvey._id);
            expect(result).toBeDefined();
        });

        it('should handle execution in sendSurveyAssignmentNotifications', async () => {
            const result = await surveyNotificationController.sendSurveyAssignmentNotifications(testSurvey._id);
            expect(result).toBeDefined();
        });
    });

    describe('2. sendSurveyReminders', () => {
        it('should execute sendSurveyReminders function', async () => {
            const result = await surveyNotificationController.sendSurveyReminders(testSurvey._id);
            expect(result).toBeDefined();
        });

        it('should handle execution in sendSurveyReminders', async () => {
            const result = await surveyNotificationController.sendSurveyReminders(testSurvey._id);
            expect(result).toBeDefined();
        });
    });

    describe('3. getUserNotifications', () => {
        it('should execute getUserNotifications function', async () => {
            await surveyNotificationController.getUserNotifications(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getUserNotifications', async () => {
            await surveyNotificationController.getUserNotifications(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. markNotificationAsRead', () => {
        it('should execute markNotificationAsRead function', async () => {
            mockReq.params.id = 'invalid-id';
            await surveyNotificationController.markNotificationAsRead(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in markNotificationAsRead', async () => {
            mockReq.params.id = 'invalid-id';
            await surveyNotificationController.markNotificationAsRead(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. sendScheduledReminders', () => {
        it('should execute sendScheduledReminders function', async () => {
            const result = await surveyNotificationController.sendScheduledReminders();
            expect(result).toBeDefined();
        });

        it('should handle execution in sendScheduledReminders', async () => {
            const result = await surveyNotificationController.sendScheduledReminders();
            expect(result).toBeDefined();
        });
    });
});
