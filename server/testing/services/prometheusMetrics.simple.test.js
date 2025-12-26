// Simple Prometheus Metrics Test
import fc from 'fast-check';
import request from 'supertest';
import express from 'express';
import metricsService from '../../platform/system/services/metrics.service.js';
import metricsRoutes from '../../platform/system/routes/metrics.routes.js';

/**
 * Simple Property Test for Prometheus Metrics Integration
 * Property 37: Prometheus Metrics Integration
 * Validates: Requirements 3.5, 11.2
 */
describe('Property 37: Prometheus Metrics Integration (Simple)', () => {
    let app;
    let server;

    beforeAll(async () => {
        app = express();
        app.use('/metrics', metricsRoutes);
        server = app.listen(0);
    });

    afterAll(async () => {
        if (server) {
            server.close();
        }
        metricsService.reset();
    });

    beforeEach(() => {
        metricsService.reset();
    });

    /**
     * Basic property: Metrics endpoint returns valid Prometheus format
     */
    test('should return valid Prometheus format', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    tenantId: fc.string({ minLength: 1, maxLength: 20 }),
                    moduleKey: fc.constantFrom('hr-core', 'tasks'),
                    validationResult: fc.boolean()
                }),
                async (testData) => {
                    // Record a metric
                    metricsService.recordLicenseValidation(
                        testData.tenantId,
                        testData.moduleKey,
                        testData.validationResult,
                        'cloud',
                        0.1
                    );

                    // Get metrics
                    const response = await request(app)
                        .get('/metrics')
                        .expect(200);

                    // Basic validations
                    expect(response.headers['content-type']).toMatch(/text\/plain/);
                    expect(response.text).toBeDefined();
                    expect(response.text.length).toBeGreaterThan(0);

                    // Should contain our metrics
                    expect(response.text).toContain('license_validation_total');
                    expect(response.text).toContain('process_cpu_user_seconds_total');

                    // Should have HELP and TYPE comments
                    const lines = response.text.split('\n');
                    const helpLines = lines.filter(line => line.startsWith('# HELP'));
                    const typeLines = lines.filter(line => line.startsWith('# TYPE'));
                    
                    expect(helpLines.length).toBeGreaterThan(0);
                    expect(typeLines.length).toBeGreaterThan(0);
                }
            ),
            { numRuns: 10, timeout: 5000 }
        );
    });

    /**
     * Property: Metrics are consistent across requests
     */
    test('should provide consistent metrics across requests', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    tenantId: fc.string({ minLength: 1, maxLength: 10 }),
                    moduleKey: fc.constantFrom('hr-core', 'tasks')
                }),
                async (testData) => {
                    // Record metrics
                    metricsService.recordLicenseValidation(
                        testData.tenantId,
                        testData.moduleKey,
                        true,
                        'cloud',
                        0.1
                    );

                    // Make two requests
                    const response1 = await request(app).get('/metrics').expect(200);
                    const response2 = await request(app).get('/metrics').expect(200);

                    // Both should contain the same core metrics
                    expect(response1.text).toContain('license_validation_total');
                    expect(response2.text).toContain('license_validation_total');
                    
                    expect(response1.text).toContain('process_cpu_user_seconds_total');
                    expect(response2.text).toContain('process_cpu_user_seconds_total');
                }
            ),
            { numRuns: 5, timeout: 5000 }
        );
    });
});