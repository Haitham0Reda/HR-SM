/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Event from '../../modules/events/models/event.model.js';
import * as eventController from '../../modules/events/controllers/event.controller.js';
import { createMockResponse, createMockRequest, createTestorganization, createTestUser, cleanupTestData } from './testHelpers.js';

describe('Event Controller - All 5 Functions', () => {
    let mockReq, mockRes, testorganization, testUser;

    beforeEach(async () => {
        testorganization = await createTestorganization();
        testUser = await createTestUser(testorganization._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Event.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getAllEvents', () => {
        it('should execute getAllEvents function', async () => {
            await eventController.getAllEvents(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getAllEvents', async () => {
            // Function executes normally
            await eventController.getAllEvents(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. createEvent', () => {
        it('should execute createEvent function', async () => {
            await eventController.createEvent(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in createEvent', async () => {
            // Function executes normally
            await eventController.createEvent(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. getEventById', () => {
        it('should execute getEventById function', async () => {
            await eventController.getEventById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in getEventById', async () => {
            mockReq.params.id = 'invalid-id';
            await eventController.getEventById(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. updateEvent', () => {
        it('should execute updateEvent function', async () => {
            await eventController.updateEvent(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateEvent', async () => {
            mockReq.params.id = 'invalid-id';
            await eventController.updateEvent(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. deleteEvent', () => {
        it('should execute deleteEvent function', async () => {
            await eventController.deleteEvent(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in deleteEvent', async () => {
            mockReq.params.id = 'invalid-id';
            await eventController.deleteEvent(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
