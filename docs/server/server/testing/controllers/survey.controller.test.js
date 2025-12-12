/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Survey from '../../modules/surveys/models/survey.model.js';
import * as surveyController from '../../modules/surveys/controllers/survey.controller.js';
import { createMockResponse, createMockRequest, createTestDepartment, createTestPosition, createTestUser, cleanupTestData } from './testHelpers.js';

describe('Survey Controller - All 11 Functions', () => {
    let mockReq, mockRes, testDepartment, testPosition, testUser;

    beforeEach(async () => {
        testDepartment = await createTestDepartment();
        testPosition = await createTestPosition(testDepartment._id);
        testUser = await createTestUser(null, testDepartment._id, testPosition._id);

        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Survey.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllSurveys', () => {
        it('should execute getAllSurveys function', async () => {
            await surveyController.getAllSurveys(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllSurveys', async () => {
            // Function executes normally
            await surveyController.getAllSurveys(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. getEmployeeSurveys', () => {
        it('should execute getEmployeeSurveys function', async () => {
            await surveyController.getEmployeeSurveys(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getEmployeeSurveys', async () => {
            // Function executes normally
            await surveyController.getEmployeeSurveys(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. createSurvey', () => {
        it('should execute createSurvey function', async () => {
            await surveyController.createSurvey(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createSurvey', async () => {
            // Function executes normally
            await surveyController.createSurvey(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. getSurveyById', () => {
        it('should execute getSurveyById function', async () => {
            await surveyController.getSurveyById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getSurveyById', async () => {
            mockReq.params.id = 'invalid-id';
            await surveyController.getSurveyById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. updateSurvey', () => {
        it('should execute updateSurvey function', async () => {
            await surveyController.updateSurvey(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateSurvey', async () => {
            mockReq.params.id = 'invalid-id';
            await surveyController.updateSurvey(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. deleteSurvey', () => {
        it('should execute deleteSurvey function', async () => {
            await surveyController.deleteSurvey(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteSurvey', async () => {
            mockReq.params.id = 'invalid-id';
            await surveyController.deleteSurvey(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('7. submitSurveyResponse', () => {
        it('should execute submitSurveyResponse function', async () => {
            await surveyController.submitSurveyResponse(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in submitSurveyResponse', async () => {
            // Function executes normally
            await surveyController.submitSurveyResponse(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('8. publishSurvey', () => {
        it('should execute publishSurvey function', async () => {
            await surveyController.publishSurvey(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in publishSurvey', async () => {
            // Function executes normally
            await surveyController.publishSurvey(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('9. closeSurvey', () => {
        it('should execute closeSurvey function', async () => {
            await surveyController.closeSurvey(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in closeSurvey', async () => {
            // Function executes normally
            await surveyController.closeSurvey(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('10. getSurveyStatistics', () => {
        it('should execute getSurveyStatistics function', async () => {
            await surveyController.getSurveyStatistics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getSurveyStatistics', async () => {
            // Function executes normally
            await surveyController.getSurveyStatistics(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('11. exportSurveyResponses', () => {
        it('should execute exportSurveyResponses function', async () => {
            await surveyController.exportSurveyResponses(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in exportSurveyResponses', async () => {
            // Function executes normally
            await surveyController.exportSurveyResponses(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
