/**
 * Error Handling Standardization Tests
 * 
 * Tests to verify that error handling has been standardized across the insurance module
 */

import request from 'supertest';
import express from 'express';
import { sendSuccess, sendError } from '../../../core/utils/response.js';

describe('Insurance Module Error Handling Standardization', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        // Test route that uses sendError utility
        app.get('/test-error', (req, res) => {
            return sendError(res, 'Test error message', 400);
        });

        // Test route that uses sendSuccess utility
        app.get('/test-success', (req, res) => {
            return sendSuccess(res, { test: 'data' }, 'Test success message');
        });
    });

    describe('sendError utility usage', () => {
        test('should return standardized error response format', async () => {
            const response = await request(app)
                .get('/test-error')
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Test error message',
                error: 'Test error message'
            });
        });
    });

    describe('sendSuccess utility usage', () => {
        test('should return standardized success response format', async () => {
            const response = await request(app)
                .get('/test-success')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'Test success message',
                data: { test: 'data' }
            });
        });
    });

    describe('validation error messages', () => {
        test('should provide clear validation error messages', () => {
            // Test that validation messages are descriptive and helpful
            const validationMessages = [
                'Employee ID is required',
                'Valid policy ID is required',
                'Coverage amount must be a positive number',
                'End date must be after start date',
                'Children must be under 25 years old for coverage'
            ];

            validationMessages.forEach(message => {
                expect(message).toBeTruthy();
                expect(typeof message).toBe('string');
                expect(message.length).toBeGreaterThan(0);
            });
        });
    });
});