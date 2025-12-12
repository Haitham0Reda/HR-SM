/**
 * Unit Tests for Error Handling
 * 
 * Tests error response format consistency and correct status codes
 * Requirements: 15.5
 */

import express from 'express';
import request from 'supertest';
import AppError from '../../core/errors/AppError.js';
import { errorHandler, notFound, catchAsync } from '../../core/errors/errorHandler.js';
import { ERROR_TYPES } from '../../core/errors/errorTypes.js';

describe('Error Handling', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        
        // Mock request ID for consistent testing
        app.use((req, res, next) => {
            req.id = 'test-request-id';
            next();
        });
    });

    describe('AppError Class', () => {
        it('should create error with all properties', () => {
            const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'test' });

            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe('TEST_ERROR');
            expect(error.details).toEqual({ field: 'test' });
            expect(error.status).toBe('fail');
            expect(error.isOperational).toBe(true);
            expect(error.timestamp).toBeDefined();
        });

        it('should default to 500 status code', () => {
            const error = new AppError('Test error');

            expect(error.statusCode).toBe(500);
            expect(error.code).toBe('INTERNAL_SERVER_ERROR');
            expect(error.status).toBe('error');
        });

        it('should set status to "fail" for 4xx errors', () => {
            const error = new AppError('Test error', 404);

            expect(error.status).toBe('fail');
        });

        it('should set status to "error" for 5xx errors', () => {
            const error = new AppError('Test error', 500);

            expect(error.status).toBe('error');
        });

        it('should capture stack trace', () => {
            const error = new AppError('Test error');

            expect(error.stack).toBeDefined();
            expect(error.stack).toContain('Test error');
        });
    });

    describe('Error Response Format Consistency', () => {
        it('should return consistent error format for AppError', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError('Test error', 400, 'TEST_ERROR', { field: 'test' }));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(400);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code', 'TEST_ERROR');
            expect(response.body.error).toHaveProperty('message', 'Test error');
            expect(response.body.error).toHaveProperty('details', { field: 'test' });
            expect(response.body).toHaveProperty('meta');
            expect(response.body.meta).toHaveProperty('timestamp');
            expect(response.body.meta).toHaveProperty('requestId', 'test-request-id');
            expect(response.body.meta).toHaveProperty('path', '/test');
            expect(response.body.meta).toHaveProperty('method', 'GET');
        });

        it('should return consistent format for generic errors', async () => {
            app.get('/test', (req, res, next) => {
                const error = new Error('Generic error');
                next(error);
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(500);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code');
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error).toHaveProperty('details');
            expect(response.body).toHaveProperty('meta');
        });

        it('should include tenant context when available', async () => {
            app.use((req, res, next) => {
                req.tenant = { id: 'tenant_123' };
                next();
            });
            app.get('/test', (req, res, next) => {
                next(new AppError('Test error', 400, 'TEST_ERROR'));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(400);

            expect(response.body.success).toBe(false);
            // Tenant context is logged but not exposed in response
        });
    });

    describe('Error Status Codes', () => {
        it('should return 400 for validation errors', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError('Validation failed', 400, ERROR_TYPES.VALIDATION_ERROR));
            });
            app.use(errorHandler);

            await request(app)
                .get('/test')
                .expect(400);
        });

        it('should return 401 for authentication errors', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError('Unauthorized', 401, ERROR_TYPES.UNAUTHORIZED));
            });
            app.use(errorHandler);

            await request(app)
                .get('/test')
                .expect(401);
        });

        it('should return 403 for permission errors', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError('Forbidden', 403, ERROR_TYPES.INSUFFICIENT_PERMISSIONS));
            });
            app.use(errorHandler);

            await request(app)
                .get('/test')
                .expect(403);
        });

        it('should return 404 for not found errors', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError('Not found', 404, ERROR_TYPES.NOT_FOUND));
            });
            app.use(errorHandler);

            await request(app)
                .get('/test')
                .expect(404);
        });

        it('should return 409 for conflict errors', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError('Conflict', 409, ERROR_TYPES.CONFLICT));
            });
            app.use(errorHandler);

            await request(app)
                .get('/test')
                .expect(409);
        });

        it('should return 500 for internal server errors', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError('Internal error', 500, ERROR_TYPES.INTERNAL_SERVER_ERROR));
            });
            app.use(errorHandler);

            await request(app)
                .get('/test')
                .expect(500);
        });

        it('should default to 500 for errors without status code', async () => {
            app.get('/test', (req, res, next) => {
                next(new Error('Unknown error'));
            });
            app.use(errorHandler);

            await request(app)
                .get('/test')
                .expect(500);
        });
    });

    describe('Platform Layer Errors', () => {
        it('should handle PLATFORM_INITIALIZATION_ERROR with 500', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Platform initialization failed',
                    500,
                    ERROR_TYPES.PLATFORM_INITIALIZATION_ERROR
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(500);

            expect(response.body.error.code).toBe(ERROR_TYPES.PLATFORM_INITIALIZATION_ERROR);
        });

        it('should handle PLATFORM_DATABASE_ERROR with 500', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Database connection failed',
                    500,
                    ERROR_TYPES.PLATFORM_DATABASE_ERROR
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(500);

            expect(response.body.error.code).toBe(ERROR_TYPES.PLATFORM_DATABASE_ERROR);
        });

        it('should handle SYSTEM_CONFIGURATION_ERROR with 500', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Invalid system configuration',
                    500,
                    ERROR_TYPES.SYSTEM_CONFIGURATION_ERROR
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(500);

            expect(response.body.error.code).toBe(ERROR_TYPES.SYSTEM_CONFIGURATION_ERROR);
        });
    });

    describe('Tenant Layer Errors', () => {
        it('should handle TENANT_NOT_FOUND with 404', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Tenant not found',
                    404,
                    ERROR_TYPES.TENANT_NOT_FOUND
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(404);

            expect(response.body.error.code).toBe(ERROR_TYPES.TENANT_NOT_FOUND);
        });

        it('should handle TENANT_SUSPENDED with 403', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Tenant is suspended',
                    403,
                    ERROR_TYPES.TENANT_SUSPENDED
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(403);

            expect(response.body.error.code).toBe(ERROR_TYPES.TENANT_SUSPENDED);
        });

        it('should handle TENANT_QUOTA_EXCEEDED with 429', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Tenant quota exceeded',
                    429,
                    ERROR_TYPES.TENANT_QUOTA_EXCEEDED
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(429);

            expect(response.body.error.code).toBe(ERROR_TYPES.TENANT_QUOTA_EXCEEDED);
        });

        it('should handle INVALID_TENANT_ID with 400', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Invalid tenant ID format',
                    400,
                    ERROR_TYPES.INVALID_TENANT_ID
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(400);

            expect(response.body.error.code).toBe(ERROR_TYPES.INVALID_TENANT_ID);
        });
    });

    describe('Module Layer Errors', () => {
        it('should handle MODULE_NOT_FOUND with 404', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Module not found',
                    404,
                    ERROR_TYPES.MODULE_NOT_FOUND
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(404);

            expect(response.body.error.code).toBe(ERROR_TYPES.MODULE_NOT_FOUND);
        });

        it('should handle MODULE_DISABLED with 403', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Module is disabled',
                    403,
                    ERROR_TYPES.MODULE_DISABLED
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(403);

            expect(response.body.error.code).toBe(ERROR_TYPES.MODULE_DISABLED);
        });

        it('should handle MODULE_DEPENDENCY_MISSING with 424', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Module dependencies not met',
                    424,
                    ERROR_TYPES.MODULE_DEPENDENCY_MISSING
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(424);

            expect(response.body.error.code).toBe(ERROR_TYPES.MODULE_DEPENDENCY_MISSING);
        });

        it('should handle MODULE_LOAD_FAILED with 500', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Module failed to load',
                    500,
                    ERROR_TYPES.MODULE_LOAD_FAILED
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(500);

            expect(response.body.error.code).toBe(ERROR_TYPES.MODULE_LOAD_FAILED);
        });
    });

    describe('Authentication Errors', () => {
        it('should handle INVALID_PLATFORM_TOKEN with 401', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Invalid platform token',
                    401,
                    ERROR_TYPES.INVALID_PLATFORM_TOKEN
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(401);

            expect(response.body.error.code).toBe(ERROR_TYPES.INVALID_PLATFORM_TOKEN);
        });

        it('should handle INVALID_TENANT_TOKEN with 401', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Invalid tenant token',
                    401,
                    ERROR_TYPES.INVALID_TENANT_TOKEN
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(401);

            expect(response.body.error.code).toBe(ERROR_TYPES.INVALID_TENANT_TOKEN);
        });

        it('should handle TOKEN_EXPIRED with 401', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Token has expired',
                    401,
                    ERROR_TYPES.TOKEN_EXPIRED
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(401);

            expect(response.body.error.code).toBe(ERROR_TYPES.TOKEN_EXPIRED);
        });

        it('should handle INSUFFICIENT_PERMISSIONS with 403', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Insufficient permissions',
                    403,
                    ERROR_TYPES.INSUFFICIENT_PERMISSIONS
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(403);

            expect(response.body.error.code).toBe(ERROR_TYPES.INSUFFICIENT_PERMISSIONS);
        });
    });

    describe('Validation Errors', () => {
        it('should handle INVALID_INPUT with 400', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Invalid input',
                    400,
                    ERROR_TYPES.INVALID_INPUT
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(400);

            expect(response.body.error.code).toBe(ERROR_TYPES.INVALID_INPUT);
        });

        it('should handle MISSING_REQUIRED_FIELD with 400', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Missing required field',
                    400,
                    ERROR_TYPES.MISSING_REQUIRED_FIELD,
                    { field: 'email' }
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(400);

            expect(response.body.error.code).toBe(ERROR_TYPES.MISSING_REQUIRED_FIELD);
            expect(response.body.error.details).toEqual({ field: 'email' });
        });

        it('should handle Mongoose ValidationError', async () => {
            app.get('/test', (req, res, next) => {
                const error = new Error('Validation failed');
                error.name = 'ValidationError';
                error.errors = {
                    email: {
                        path: 'email',
                        message: 'Email is required'
                    },
                    name: {
                        path: 'name',
                        message: 'Name is required'
                    }
                };
                next(error);
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(400);

            expect(response.body.error.code).toBe(ERROR_TYPES.VALIDATION_ERROR);
            expect(response.body.error.details.errors).toHaveLength(2);
        });

        it('should handle Mongoose CastError', async () => {
            app.get('/test', (req, res, next) => {
                const error = new Error('Cast failed');
                error.name = 'CastError';
                error.path = 'id';
                error.value = 'invalid-id';
                next(error);
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(400);

            expect(response.body.error.code).toBe(ERROR_TYPES.INVALID_INPUT);
            expect(response.body.error.message).toContain('Invalid id');
        });

        it('should handle Mongoose duplicate key error', async () => {
            app.get('/test', (req, res, next) => {
                const error = new Error('Duplicate key');
                error.code = 11000;
                error.keyPattern = { email: 1 };
                next(error);
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(409);

            expect(response.body.error.code).toBe(ERROR_TYPES.CONFLICT);
            expect(response.body.error.message).toContain('email already exists');
        });
    });

    describe('JWT Errors', () => {
        it('should handle JsonWebTokenError', async () => {
            app.get('/test', (req, res, next) => {
                const error = new Error('Invalid token');
                error.name = 'JsonWebTokenError';
                next(error);
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(401);

            expect(response.body.error.code).toBe(ERROR_TYPES.UNAUTHORIZED);
            expect(response.body.error.message).toBe('Invalid token');
        });

        it('should handle TokenExpiredError', async () => {
            app.get('/test', (req, res, next) => {
                const error = new Error('Token expired');
                error.name = 'TokenExpiredError';
                next(error);
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(401);

            expect(response.body.error.code).toBe(ERROR_TYPES.TOKEN_EXPIRED);
            expect(response.body.error.message).toBe('Token has expired');
        });
    });

    describe('notFound Middleware', () => {
        it('should handle 404 for undefined routes', async () => {
            app.use(notFound);
            app.use(errorHandler);

            const response = await request(app)
                .get('/undefined-route')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe(ERROR_TYPES.NOT_FOUND);
            expect(response.body.error.message).toContain('/undefined-route');
        });
    });

    describe('catchAsync Utility', () => {
        it('should catch async errors', async () => {
            app.get('/test', catchAsync(async (req, res, next) => {
                throw new AppError('Async error', 400, 'ASYNC_ERROR');
            }));
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(400);

            expect(response.body.error.code).toBe('ASYNC_ERROR');
        });

        it('should catch promise rejections', async () => {
            app.get('/test', catchAsync(async (req, res, next) => {
                await Promise.reject(new AppError('Promise rejected', 500, 'PROMISE_ERROR'));
            }));
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(500);

            expect(response.body.error.code).toBe('PROMISE_ERROR');
        });
    });

    describe('Error Details', () => {
        it('should include error details in response', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError(
                    'Validation failed',
                    400,
                    ERROR_TYPES.VALIDATION_ERROR,
                    { fields: ['email', 'password'] }
                ));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(400);

            expect(response.body.error.details).toEqual({ fields: ['email', 'password'] });
        });

        it('should default to empty object for missing details', async () => {
            app.get('/test', (req, res, next) => {
                next(new AppError('Error without details', 400, 'TEST_ERROR'));
            });
            app.use(errorHandler);

            const response = await request(app)
                .get('/test')
                .expect(400);

            expect(response.body.error.details).toEqual({});
        });
    });
});
