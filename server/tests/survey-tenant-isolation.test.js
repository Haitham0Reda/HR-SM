/**
 * Survey Tenant Isolation Test
 * 
 * Comprehensive test to verify that survey data is properly isolated between tenants
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import Survey from '../modules/surveys/models/survey.model.js';
import User from '../modules/hr-core/users/models/user.model.js';
import jwt from 'jsonwebtoken';

describe('Survey Tenant Isolation', () => {
    let tenant1Token, tenant2Token;
    let tenant1User, tenant2User;
    let tenant1Survey, tenant2Survey;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrsm_test');
        }

        // Clean up existing test data
        await Survey.deleteMany({ title: { $regex: /Test Survey/ } });
        await User.deleteMany({ email: { $regex: /@testcompany/ } });
    });

    beforeEach(async () => {
        // Create test users for different tenants
        tenant1User = await User.create({
            username: 'tenant1user',
            email: 'user@testcompany1.com',
            password: 'password123',
            tenantId: 'tenant_1',
            role: 'hr',
            profile: {
                firstName: 'Tenant1',
                lastName: 'User'
            }
        });

        tenant2User = await User.create({
            username: 'tenant2user',
            email: 'user@testcompany2.com',
            password: 'password123',
            tenantId: 'tenant_2',
            role: 'hr',
            profile: {
                firstName: 'Tenant2',
                lastName: 'User'
            }
        });

        // Generate JWT tokens for each tenant
        tenant1Token = jwt.sign(
            { 
                id: tenant1User._id, 
                tenantId: 'tenant_1',
                role: 'hr'
            },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1h' }
        );

        tenant2Token = jwt.sign(
            { 
                id: tenant2User._id, 
                tenantId: 'tenant_2',
                role: 'hr'
            },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1h' }
        );

        // Create test surveys for each tenant
        tenant1Survey = await Survey.create({
            title: 'Test Survey Tenant 1',
            description: 'Survey for tenant 1 only',
            tenantId: 'tenant_1',
            createdBy: tenant1User._id,
            questions: [{
                questionText: 'How satisfied are you?',
                questionType: 'rating',
                ratingScale: { min: 1, max: 5 },
                required: true,
                order: 1
            }],
            status: 'active',
            assignedTo: {
                allEmployees: true
            }
        });

        tenant2Survey = await Survey.create({
            title: 'Test Survey Tenant 2',
            description: 'Survey for tenant 2 only',
            tenantId: 'tenant_2',
            createdBy: tenant2User._id,
            questions: [{
                questionText: 'Rate your experience',
                questionType: 'rating',
                ratingScale: { min: 1, max: 5 },
                required: true,
                order: 1
            }],
            status: 'active',
            assignedTo: {
                allEmployees: true
            }
        });
    });

    afterEach(async () => {
        // Clean up test data
        await Survey.deleteMany({ title: { $regex: /Test Survey/ } });
        await User.deleteMany({ email: { $regex: /@testcompany/ } });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('Survey List Isolation', () => {
        test('Tenant 1 should only see their own surveys', async () => {
            const response = await request(app)
                .get('/api/v1/surveys')
                .set('Authorization', `Bearer ${tenant1Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.surveys).toHaveLength(1);
            expect(response.body.surveys[0].title).toBe('Test Survey Tenant 1');
            expect(response.body.surveys[0].tenantId).toBe('tenant_1');
        });

        test('Tenant 2 should only see their own surveys', async () => {
            const response = await request(app)
                .get('/api/v1/surveys')
                .set('Authorization', `Bearer ${tenant2Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.surveys).toHaveLength(1);
            expect(response.body.surveys[0].title).toBe('Test Survey Tenant 2');
            expect(response.body.surveys[0].tenantId).toBe('tenant_2');
        });

        test('Employee surveys should be tenant-isolated', async () => {
            const response1 = await request(app)
                .get('/api/v1/surveys/my-surveys')
                .set('Authorization', `Bearer ${tenant1Token}`)
                .expect(200);

            const response2 = await request(app)
                .get('/api/v1/surveys/my-surveys')
                .set('Authorization', `Bearer ${tenant2Token}`)
                .expect(200);

            expect(response1.body.surveys).toHaveLength(1);
            expect(response1.body.surveys[0].tenantId).toBe('tenant_1');

            expect(response2.body.surveys).toHaveLength(1);
            expect(response2.body.surveys[0].tenantId).toBe('tenant_2');
        });
    });

    describe('Survey Access Isolation', () => {
        test('Tenant 1 cannot access Tenant 2 survey by ID', async () => {
            await request(app)
                .get(`/api/v1/surveys/${tenant2Survey._id}`)
                .set('Authorization', `Bearer ${tenant1Token}`)
                .expect(404);
        });

        test('Tenant 2 cannot access Tenant 1 survey by ID', async () => {
            await request(app)
                .get(`/api/v1/surveys/${tenant1Survey._id}`)
                .set('Authorization', `Bearer ${tenant2Token}`)
                .expect(404);
        });

        test('Tenant can access their own survey by ID', async () => {
            const response = await request(app)
                .get(`/api/v1/surveys/${tenant1Survey._id}`)
                .set('Authorization', `Bearer ${tenant1Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.survey.tenantId).toBe('tenant_1');
        });
    });

    describe('Survey Modification Isolation', () => {
        test('Tenant 1 cannot update Tenant 2 survey', async () => {
            await request(app)
                .put(`/api/v1/surveys/${tenant2Survey._id}`)
                .set('Authorization', `Bearer ${tenant1Token}`)
                .send({
                    title: 'Hacked Survey Title'
                })
                .expect(404);
        });

        test('Tenant 2 cannot delete Tenant 1 survey', async () => {
            await request(app)
                .delete(`/api/v1/surveys/${tenant1Survey._id}`)
                .set('Authorization', `Bearer ${tenant2Token}`)
                .expect(404);
        });

        test('Tenant can update their own survey', async () => {
            const response = await request(app)
                .put(`/api/v1/surveys/${tenant1Survey._id}`)
                .set('Authorization', `Bearer ${tenant1Token}`)
                .send({
                    title: 'Updated Survey Title'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.survey.title).toBe('Updated Survey Title');
        });
    });

    describe('Survey Response Isolation', () => {
        test('Tenant 1 cannot submit response to Tenant 2 survey', async () => {
            await request(app)
                .post(`/api/v1/surveys/${tenant2Survey._id}/respond`)
                .set('Authorization', `Bearer ${tenant1Token}`)
                .send({
                    responses: [{
                        questionId: tenant2Survey.questions[0]._id,
                        answer: 5
                    }]
                })
                .expect(404);
        });

        test('Tenant can submit response to their own survey', async () => {
            const response = await request(app)
                .post(`/api/v1/surveys/${tenant1Survey._id}/respond`)
                .set('Authorization', `Bearer ${tenant1Token}`)
                .send({
                    responses: [{
                        questionId: tenant1Survey.questions[0]._id,
                        answer: 4
                    }]
                })
                .expect(201);

            expect(response.body.success).toBe(true);
        });
    });

    describe('Survey Statistics Isolation', () => {
        test('Tenant 1 cannot access Tenant 2 survey statistics', async () => {
            await request(app)
                .get(`/api/v1/surveys/${tenant2Survey._id}/statistics`)
                .set('Authorization', `Bearer ${tenant1Token}`)
                .expect(404);
        });

        test('Tenant can access their own survey statistics', async () => {
            const response = await request(app)
                .get(`/api/v1/surveys/${tenant1Survey._id}/statistics`)
                .set('Authorization', `Bearer ${tenant1Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.statistics.survey._id.toString()).toBe(tenant1Survey._id.toString());
        });
    });

    describe('Survey Creation Isolation', () => {
        test('Created surveys are automatically assigned to correct tenant', async () => {
            const response = await request(app)
                .post('/api/v1/surveys')
                .set('Authorization', `Bearer ${tenant1Token}`)
                .send({
                    title: 'New Survey for Tenant 1',
                    description: 'Test survey creation',
                    questions: [{
                        questionText: 'Test question',
                        questionType: 'text',
                        required: true,
                        order: 1
                    }],
                    status: 'draft',
                    assignedTo: {
                        allEmployees: true
                    }
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.survey.tenantId).toBe('tenant_1');
            expect(response.body.survey.createdBy.toString()).toBe(tenant1User._id.toString());
        });
    });

    describe('Cross-Tenant Data Leakage Prevention', () => {
        test('Survey queries should never return cross-tenant data', async () => {
            // Create additional surveys for both tenants
            await Survey.create({
                title: 'Additional Survey Tenant 1',
                tenantId: 'tenant_1',
                createdBy: tenant1User._id,
                questions: [{ questionText: 'Test', questionType: 'text', order: 1 }],
                status: 'active',
                assignedTo: { allEmployees: true }
            });

            await Survey.create({
                title: 'Additional Survey Tenant 2',
                tenantId: 'tenant_2',
                createdBy: tenant2User._id,
                questions: [{ questionText: 'Test', questionType: 'text', order: 1 }],
                status: 'active',
                assignedTo: { allEmployees: true }
            });

            // Verify each tenant only sees their own surveys
            const tenant1Response = await request(app)
                .get('/api/v1/surveys')
                .set('Authorization', `Bearer ${tenant1Token}`)
                .expect(200);

            const tenant2Response = await request(app)
                .get('/api/v1/surveys')
                .set('Authorization', `Bearer ${tenant2Token}`)
                .expect(200);

            // Each tenant should see exactly 2 surveys (original + additional)
            expect(tenant1Response.body.surveys).toHaveLength(2);
            expect(tenant2Response.body.surveys).toHaveLength(2);

            // Verify all surveys belong to correct tenant
            tenant1Response.body.surveys.forEach(survey => {
                expect(survey.tenantId).toBe('tenant_1');
            });

            tenant2Response.body.surveys.forEach(survey => {
                expect(survey.tenantId).toBe('tenant_2');
            });
        });
    });
});