/**
 * Global Validation Middleware Tests
 * 
 * Tests the comprehensive input validation and sanitization middleware
 * Validates: Requirements 6.3 - Input validation and sanitization
 */

import request from 'supertest';
import express from 'express';
import { 
    globalInputSanitization,
    preventNoSQLInjection,
    preventXSS,
    validateRequestSize,
    validateContentType,
    validateCommonParameters,
    comprehensiveValidation
} from '../../middleware/globalValidation.middleware.js';

describe('Global Validation Middleware', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    describe('Global Input Sanitization', () => {
        beforeEach(() => {
            app.use(globalInputSanitization);
            app.post('/test', (req, res) => {
                res.json({ body: req.body, query: req.query, params: req.params });
            });
        });

        test('should sanitize HTML content in request body', async () => {
            const response = await request(app)
                .post('/test')
                .send({
                    name: '<script>alert("xss")</script>John',
                    description: '<p>Valid content</p><script>malicious()</script>'
                });

            expect(response.status).toBe(200);
            expect(response.body.body.name).not.toContain('<script>');
            expect(response.body.body.name).toContain('John');
            expect(response.body.body.description).toContain('<p>Valid content</p>');
            expect(response.body.body.description).not.toContain('<script>');
        });

        test('should remove null bytes and control characters', async () => {
            const response = await request(app)
                .post('/test')
                .send({
                    data: 'test\x00\x01\x02data'
                });

            expect(response.status).toBe(200);
            expect(response.body.body.data).toBe('testdata');
        });

        test('should sanitize nested objects', async () => {
            const response = await request(app)
                .post('/test')
                .send({
                    user: {
                        name: '<script>alert(1)</script>John',
                        profile: {
                            bio: '<p>Bio</p><script>hack()</script>'
                        }
                    }
                });

            expect(response.status).toBe(200);
            expect(response.body.body.user.name).not.toContain('<script>');
            expect(response.body.body.user.profile.bio).not.toContain('<script>');
        });

        test('should prevent prototype pollution', async () => {
            const response = await request(app)
                .post('/test')
                .send({
                    '__proto__': { polluted: true },
                    'constructor': { polluted: true },
                    'prototype': { polluted: true },
                    'validField': 'validValue'
                });

            expect(response.status).toBe(200);
            // The sanitization removes dangerous keys, so they won't be present
            expect(Object.keys(response.body.body)).not.toContain('__proto__');
            expect(Object.keys(response.body.body)).not.toContain('constructor');
            expect(Object.keys(response.body.body)).not.toContain('prototype');
            expect(response.body.body.validField).toBe('validValue');
        });
    });

    describe('NoSQL Injection Prevention', () => {
        beforeEach(() => {
            app.use(preventNoSQLInjection);
            app.post('/test', (req, res) => {
                res.json({ success: true });
            });
        });

        test('should block MongoDB operators in request body', async () => {
            const response = await request(app)
                .post('/test')
                .send({
                    username: { $ne: null },
                    password: { $regex: '.*' }
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid request format');
        });

        test('should block dangerous JavaScript patterns', async () => {
            const response = await request(app)
                .post('/test')
                .send({
                    code: 'javascript:alert(1)',
                    eval: 'eval(maliciousCode)'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should block keys starting with $ or containing dots', async () => {
            const response = await request(app)
                .post('/test')
                .send({
                    '$where': 'this.username == "admin"',
                    'user.role': 'admin'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should allow valid data', async () => {
            const response = await request(app)
                .post('/test')
                .send({
                    username: 'john_doe',
                    email: 'john@example.com',
                    age: 30
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('XSS Prevention', () => {
        beforeEach(() => {
            app.use(preventXSS);
            app.post('/test', (req, res) => {
                res.json({ success: true });
            });
        });

        test('should block script tags', async () => {
            const response = await request(app)
                .post('/test')
                .send({
                    content: '<script>alert("xss")</script>'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should block event handlers', async () => {
            const response = await request(app)
                .post('/test')
                .send({
                    html: '<div onclick="malicious()">Click me</div>'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should block javascript: URLs', async () => {
            const response = await request(app)
                .post('/test')
                .send({
                    link: 'javascript:alert(1)'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should allow safe content', async () => {
            const response = await request(app)
                .post('/test')
                .send({
                    content: 'This is safe content',
                    html: '<p>Safe HTML</p>'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('Request Size Validation', () => {
        beforeEach(() => {
            app.use(validateRequestSize({ maxQueryParams: 5, maxUrlLength: 100 }));
            app.get('/test', (req, res) => {
                res.json({ success: true });
            });
        });

        test('should block requests with too many query parameters', async () => {
            const response = await request(app)
                .get('/test?a=1&b=2&c=3&d=4&e=5&f=6');

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Too many query parameters');
        });

        test('should block URLs that are too long', async () => {
            const longPath = '/test?' + 'a'.repeat(200);
            const response = await request(app)
                .get(longPath);

            expect(response.status).toBe(414);
            expect(response.body.message).toContain('URL too long');
        });

        test('should allow valid requests', async () => {
            const response = await request(app)
                .get('/test?param1=value1&param2=value2');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('Content-Type Validation', () => {
        beforeEach(() => {
            app.use(validateContentType);
            app.post('/test', (req, res) => {
                res.json({ success: true });
            });
        });

        test('should allow JSON content type', async () => {
            const response = await request(app)
                .post('/test')
                .set('Content-Type', 'application/json')
                .send({ data: 'test' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('should allow form data content type', async () => {
            const response = await request(app)
                .post('/test')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send('data=test');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('should block invalid content types for requests with body', async () => {
            const response = await request(app)
                .post('/test')
                .set('Content-Type', 'text/plain')
                .send('invalid data');

            expect(response.status).toBe(415);
            expect(response.body.message).toContain('Unsupported content type');
        });

        test('should allow requests without body regardless of content type', async () => {
            const response = await request(app)
                .post('/test')
                .set('Content-Type', 'text/plain')
                .send(); // No body

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('Common Parameters Validation', () => {
        beforeEach(() => {
            app.use(validateCommonParameters);
            app.get('/test/:id', (req, res) => {
                res.json({ success: true });
            });
            app.get('/test', (req, res) => {
                res.json({ success: true });
            });
        });

        test('should validate MongoDB ObjectId parameters', async () => {
            const response = await request(app)
                .get('/test/invalid-id');

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid id format');
        });

        test('should validate pagination parameters', async () => {
            const response = await request(app)
                .get('/test?page=0&limit=2000');

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Page must be between 1 and 10000');
        });

        test('should validate date parameters', async () => {
            const response = await request(app)
                .get('/test?startDate=invalid-date');

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid startDate format');
        });

        test('should allow valid parameters', async () => {
            const validId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .get(`/test/${validId}?page=1&limit=10&startDate=2023-01-01T00:00:00Z`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('Comprehensive Validation Stack', () => {
        beforeEach(() => {
            app.use(comprehensiveValidation);
            app.post('/test/:id', (req, res) => {
                res.json({ 
                    success: true, 
                    body: req.body,
                    params: req.params,
                    query: req.query
                });
            });
        });

        test('should apply all validation layers', async () => {
            const validId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .post(`/test/${validId}`)
                .set('Content-Type', 'application/json')
                .send({
                    name: '<p>John Doe</p>',
                    email: 'john@example.com',
                    age: 30
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.body.name).toBe('<p>John Doe</p>');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
        });

        test('should block malicious requests at multiple layers', async () => {
            const response = await request(app)
                .post('/test/invalid-id')
                .set('Content-Type', 'application/json')
                .send({
                    '$where': 'this.admin = true',
                    content: '<script>alert("xss")</script>'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
});