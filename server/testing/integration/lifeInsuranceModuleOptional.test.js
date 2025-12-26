/**
 * Life Insurance Module Optional Integration Test
 * 
 * Verifies that the life insurance module is properly configured as optional
 * and requires the "life-insurance" license feature.
 * 
 * Requirements: 5.1, 4.2, 4.5
 */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { tenantContext } from '../../core/middleware/tenantContext.js';
import { dynamicModuleLoader } from '../../middleware/dynamicModuleLoader.middleware.js';
import { requireModuleAvailability } from '../../middleware/dynamicModuleLoader.middleware.js';
import moduleAvailabilityRoutes from '../../routes/moduleAvailability.routes.js';
import Tenant from '../../platform/tenants/models/Tenant.js';
import { MODULES } from '../../shared/constants/modules.js';

describe('Life Insurance Module Optional Integration', () => {
    let mongoServer;
    let app;
    let testTenant;

    beforeAll(async () => {
        // Start in-memory MongoDB
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Clear database
        await mongoose.connection.db.dropDatabase();

        // Create test tenant
        testTenant = await Tenant.create({
            name: 'Test Company',
            subdomain: 'testcompany',
            email: 'admin@testcompany.com',
            enabledModules: [MODULES.HR_CORE, MODULES.LIFE_INSURANCE], // Life insurance enabled
            licenseNumber: 'LIC-2024-000001',
            licenseKey: 'test-license-key',
            licenseStatus: 'active',
            licenseExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        });

        // Setup Express app
        app = express();
        app.use(express.json());

        // Mock tenant context middleware
        app.use((req, res, next) => {
            req.tenant = testTenant;
            req.tenantId = testTenant._id.toString();
            next();
        });

        // Mock license validation middleware
        app.use((req, res, next) => {
            // Default: valid license with life-insurance feature
            req.licenseInfo = {
                valid: true,
                features: ['life-insurance', 'hr-core'],
                licenseType: 'enterprise',
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            };
            next();
        });

        // Add dynamic module loader
        app.use(dynamicModuleLoader);

        // Add module availability routes
        app.use('/api/v1/modules', moduleAvailabilityRoutes);

        // Test route for life insurance (protected by module availability)
        app.get('/api/v1/life-insurance/test', 
            requireModuleAvailability(MODULES.LIFE_INSURANCE),
            (req, res) => {
                res.json({ 
                    success: true, 
                    message: 'Life insurance module accessible',
                    availableModules: req.availableModules
                });
            }
        );

        // Test route for hr-core (always available)
        app.get('/api/v1/hr-core/test', 
            requireModuleAvailability(MODULES.HR_CORE),
            (req, res) => {
                res.json({ 
                    success: true, 
                    message: 'HR core module accessible',
                    availableModules: req.availableModules
                });
            }
        );
    });

    describe('Module Availability API', () => {
        it('should return available modules including life-insurance when licensed', async () => {
            const response = await request(app)
                .get('/api/v1/modules/availability')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.modules.available).toContain(MODULES.LIFE_INSURANCE);
            expect(response.body.data.modules.core).toContain(MODULES.HR_CORE);
            expect(response.body.data.license.valid).toBe(true);
            expect(response.body.data.license.features).toContain('life-insurance');
        });

        it('should not include life-insurance when module is disabled at tenant level', async () => {
            // Update tenant to disable life-insurance module
            testTenant.enabledModules = [MODULES.HR_CORE]; // Remove life-insurance
            await testTenant.save();

            const response = await request(app)
                .get('/api/v1/modules/availability')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.modules.available).not.toContain(MODULES.LIFE_INSURANCE);
            expect(response.body.data.modules.unavailable.some(m => m.name === MODULES.LIFE_INSURANCE)).toBe(true);
            
            // Find the unavailable life-insurance module
            const unavailableModule = response.body.data.modules.unavailable.find(m => m.name === MODULES.LIFE_INSURANCE);
            expect(unavailableModule.reason).toBe('module_disabled');
        });

        it('should not include life-insurance when license feature is missing', async () => {
            // Mock license without life-insurance feature
            app.use((req, res, next) => {
                req.licenseInfo = {
                    valid: true,
                    features: ['hr-core'], // No life-insurance feature
                    licenseType: 'basic',
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                };
                next();
            });

            const response = await request(app)
                .get('/api/v1/modules/availability')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.modules.available).not.toContain(MODULES.LIFE_INSURANCE);
            expect(response.body.data.modules.unavailable.some(m => m.name === MODULES.LIFE_INSURANCE)).toBe(true);
            
            // Find the unavailable life-insurance module
            const unavailableModule = response.body.data.modules.unavailable.find(m => m.name === MODULES.LIFE_INSURANCE);
            expect(unavailableModule.reason).toBe('feature_not_licensed');
            expect(unavailableModule.details.requiredFeature).toBe('life-insurance');
        });

        it('should not include life-insurance when license is invalid', async () => {
            // Mock invalid license
            app.use((req, res, next) => {
                req.licenseInfo = {
                    valid: false,
                    features: [],
                    licenseType: null,
                    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired
                };
                next();
            });

            const response = await request(app)
                .get('/api/v1/modules/availability')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.modules.available).not.toContain(MODULES.LIFE_INSURANCE);
            expect(response.body.data.modules.unavailable.some(m => m.name === MODULES.LIFE_INSURANCE)).toBe(true);
            
            // Find the unavailable life-insurance module
            const unavailableModule = response.body.data.modules.unavailable.find(m => m.name === MODULES.LIFE_INSURANCE);
            expect(unavailableModule.reason).toBe('license_invalid');
        });

        it('should always include hr-core module regardless of license', async () => {
            // Mock invalid license
            app.use((req, res, next) => {
                req.licenseInfo = {
                    valid: false,
                    features: [],
                    licenseType: null,
                    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired
                };
                next();
            });

            const response = await request(app)
                .get('/api/v1/modules/availability')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.modules.core).toContain(MODULES.HR_CORE);
        });
    });

    describe('Module Access Control', () => {
        it('should allow access to life-insurance when module is available', async () => {
            const response = await request(app)
                .get('/api/v1/life-insurance/test')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Life insurance module accessible');
            expect(response.body.availableModules).toContain(MODULES.LIFE_INSURANCE);
        });

        it('should block access to life-insurance when module is disabled', async () => {
            // Update tenant to disable life-insurance module
            testTenant.enabledModules = [MODULES.HR_CORE]; // Remove life-insurance
            await testTenant.save();

            const response = await request(app)
                .get('/api/v1/life-insurance/test')
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('MODULE_NOT_AVAILABLE');
            expect(response.body.message).toContain(MODULES.LIFE_INSURANCE);
            expect(response.body.moduleName).toBe(MODULES.LIFE_INSURANCE);
        });

        it('should block access to life-insurance when license feature is missing', async () => {
            // Create new app with license without life-insurance feature
            const testApp = express();
            testApp.use(express.json());

            testApp.use((req, res, next) => {
                req.tenant = testTenant;
                req.tenantId = testTenant._id.toString();
                next();
            });

            testApp.use((req, res, next) => {
                req.licenseInfo = {
                    valid: true,
                    features: ['hr-core'], // No life-insurance feature
                    licenseType: 'basic',
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                };
                next();
            });

            testApp.use(dynamicModuleLoader);

            testApp.get('/api/v1/life-insurance/test', 
                requireModuleAvailability(MODULES.LIFE_INSURANCE),
                (req, res) => {
                    res.json({ success: true, message: 'Should not reach here' });
                }
            );

            const response = await request(testApp)
                .get('/api/v1/life-insurance/test')
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('MODULE_NOT_AVAILABLE');
            expect(response.body.moduleName).toBe(MODULES.LIFE_INSURANCE);
        });

        it('should always allow access to hr-core module', async () => {
            // Even with invalid license, hr-core should be accessible
            const testApp = express();
            testApp.use(express.json());

            testApp.use((req, res, next) => {
                req.tenant = testTenant;
                req.tenantId = testTenant._id.toString();
                next();
            });

            testApp.use((req, res, next) => {
                req.licenseInfo = {
                    valid: false,
                    features: [],
                    licenseType: null,
                    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired
                };
                next();
            });

            testApp.use(dynamicModuleLoader);

            testApp.get('/api/v1/hr-core/test', 
                requireModuleAvailability(MODULES.HR_CORE),
                (req, res) => {
                    res.json({ 
                        success: true, 
                        message: 'HR core module accessible',
                        availableModules: req.availableModules
                    });
                }
            );

            const response = await request(testApp)
                .get('/api/v1/hr-core/test')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('HR core module accessible');
            expect(response.body.availableModules).toContain(MODULES.HR_CORE);
        });
    });

    describe('Module Configuration Validation', () => {
        it('should validate that life-insurance is configured as optional module', async () => {
            const response = await request(app)
                .post('/api/v1/modules/validate')
                .send({
                    modules: [MODULES.HR_CORE, MODULES.LIFE_INSURANCE]
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.valid).toBe(true);
            expect(response.body.data.validModules).toContain(MODULES.LIFE_INSURANCE);
            expect(response.body.data.validModules).toContain(MODULES.HR_CORE);
        });

        it('should fail validation when requesting unlicensed modules', async () => {
            // Create app with license that doesn't include life-insurance
            const testApp = express();
            testApp.use(express.json());

            testApp.use((req, res, next) => {
                req.tenant = testTenant;
                req.tenantId = testTenant._id.toString();
                next();
            });

            testApp.use((req, res, next) => {
                req.licenseInfo = {
                    valid: true,
                    features: ['hr-core'], // No life-insurance feature
                    licenseType: 'basic',
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                };
                next();
            });

            testApp.use(dynamicModuleLoader);
            testApp.use('/api/v1/modules', moduleAvailabilityRoutes);

            const response = await request(testApp)
                .post('/api/v1/modules/validate')
                .send({
                    modules: [MODULES.HR_CORE, MODULES.LIFE_INSURANCE]
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.valid).toBe(false);
            expect(response.body.data.validModules).toContain(MODULES.HR_CORE);
            expect(response.body.data.invalidModules.some(m => m.name === MODULES.LIFE_INSURANCE)).toBe(true);
            
            const invalidModule = response.body.data.invalidModules.find(m => m.name === MODULES.LIFE_INSURANCE);
            expect(invalidModule.reason).toBe('feature_not_licensed');
        });
    });
});