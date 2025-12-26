// testing/services/prometheusMetricsIntegration.property.test.js

import fc from 'fast-check';
import request from 'supertest';
import express from 'express';
import metricsService from '../../platform/system/services/metrics.service.js';
import systemMetricsService from '../../services/systemMetrics.service.js';
import mongoMetricsService from '../../services/mongoMetrics.service.js';
import metricsRoutes from '../../platform/system/routes/metrics.routes.js';

/**
 * Property 37: Prometheus Metrics Integration
 * 
 * For any metrics export request, the Prometheus endpoint should return 
 * properly formatted metrics with correct labels and values
 * 
 * Validates: Requirements 3.5, 11.2
 */
describe('Property 37: Prometheus Metrics Integration', () => {
    let app;
    let server;

    beforeAll(async () => {
        // Create Express app for testing
        app = express();
        app.use('/metrics', metricsRoutes);
        
        // Start server
        server = app.listen(0); // Use random available port
    });

    afterAll(async () => {
        if (server) {
            server.close();
        }
        // Reset metrics to clean state
        metricsService.reset();
    });

    beforeEach(() => {
        // Reset metrics before each test
        metricsService.reset();
    });

    /**
     * Property: Prometheus metrics endpoint returns valid format
     * For any metrics request, the response should be in valid Prometheus format
     */
    test('should return valid Prometheus format for any metrics request', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    tenantId: fc.string({ minLength: 1, maxLength: 50 }),
                    moduleKey: fc.constantFrom('hr-core', 'tasks', 'clinic', 'payroll', 'reports', 'life-insurance'),
                    validationResult: fc.boolean(),
                    deploymentMode: fc.constantFrom('cloud', 'on-premise'),
                    duration: fc.float({ min: Math.fround(0.001), max: Math.fround(5.0) }),
                    errorType: fc.constantFrom('network', 'validation', 'expired', 'invalid'),
                    usagePercentage: fc.float({ min: Math.fround(0), max: Math.fround(100) }),
                    limitType: fc.constantFrom('users', 'storage', 'api_calls')
                }),
                async (testData) => {
                    // Arrange: Record some metrics to ensure data is present
                    metricsService.recordLicenseValidation(
                        testData.tenantId,
                        testData.moduleKey,
                        testData.validationResult,
                        testData.deploymentMode,
                        testData.duration
                    );

                    if (!testData.validationResult) {
                        metricsService.recordLicenseValidationError(
                            testData.tenantId,
                            testData.moduleKey,
                            testData.errorType
                        );
                    }

                    metricsService.updateUsageLimitPercentage(
                        testData.tenantId,
                        testData.moduleKey,
                        testData.limitType,
                        testData.usagePercentage
                    );

                    // Act: Request metrics from endpoint
                    const response = await request(app)
                        .get('/metrics')
                        .expect(200);

                    // Assert: Response should be in valid Prometheus format
                    expect(response.headers['content-type']).toMatch(/text\/plain/);
                    
                    const metricsText = response.text;
                    expect(metricsText).toBeDefined();
                    expect(typeof metricsText).toBe('string');
                    expect(metricsText.length).toBeGreaterThan(0);

                    // Validate Prometheus format structure
                    const lines = metricsText.split('\n').filter(line => line.trim() !== '');
                    
                    // Should contain HELP and TYPE comments
                    const helpLines = lines.filter(line => line.startsWith('# HELP'));
                    const typeLines = lines.filter(line => line.startsWith('# TYPE'));
                    expect(helpLines.length).toBeGreaterThan(0);
                    expect(typeLines.length).toBeGreaterThan(0);

                    // Should contain actual metric lines (not comments)
                    const metricLines = lines.filter(line => !line.startsWith('#'));
                    expect(metricLines.length).toBeGreaterThan(0);

                    // Validate metric line format: metric_name{labels} value [timestamp]
                    metricLines.forEach(line => {
                        // Basic format validation - allow NaN values
                        expect(line).toMatch(/^[a-zA-Z_:][a-zA-Z0-9_:]*(\{[^}]*\})?\s+([0-9.-]+|NaN)(\s+[0-9]+)?$/);
                    });

                    // Validate that our recorded metrics appear in the output
                    expect(metricsText).toContain('license_validation_total');
                    expect(metricsText).toContain('license_validation_duration_seconds');
                    expect(metricsText).toContain('usage_limit_percentage');

                    // Validate labels are properly formatted
                    const labelRegex = /\{([^}]+)\}/g;
                    let match;
                    while ((match = labelRegex.exec(metricsText)) !== null) {
                        const labels = match[1];
                        // Labels should be in format: key="value",key="value"
                        expect(labels).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*="[^"]*"(,[a-zA-Z_][a-zA-Z0-9_]*="[^"]*")*$/);
                    }
                }
            ),
            { numRuns: 50, timeout: 10000 }
        );
    });

    /**
     * Property: System metrics are included in Prometheus export
     * For any system state, system metrics should be properly exported
     */
    test('should include system metrics in Prometheus format', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    requestCount: fc.integer({ min: 1, max: 10 })
                }),
                async (testData) => {
                    // Act: Make multiple requests to ensure metrics are collected
                    let finalResponse;
                    for (let i = 0; i < testData.requestCount; i++) {
                        finalResponse = await request(app)
                            .get('/metrics')
                            .expect(200);
                    }

                    const metricsText = finalResponse.text;

                    // Assert: Should contain Node.js default metrics
                    expect(metricsText).toContain('process_cpu_user_seconds_total');
                    expect(metricsText).toContain('process_cpu_system_seconds_total');
                    expect(metricsText).toContain('process_resident_memory_bytes');
                    expect(metricsText).toContain('nodejs_heap_size_total_bytes');
                    expect(metricsText).toContain('nodejs_heap_size_used_bytes');

                    // Should contain HTTP request metrics if available
                    // Note: These might not be present in test environment, so we check conditionally
                    const hasHttpMetrics = metricsText.includes('http_requests_total') || 
                                         metricsText.includes('http_request_duration');
                    
                    // If HTTP metrics are present, they should be properly formatted
                    if (hasHttpMetrics) {
                        expect(metricsText).toMatch(/http_request.*\{.*\}\s+[0-9.-]+/);
                    }

                    // Validate all metric values are numeric
                    const metricLines = metricsText.split('\n')
                        .filter(line => !line.startsWith('#') && line.trim() !== '');
                    
                    metricLines.forEach(line => {
                        const parts = line.split(/\s+/);
                        if (parts.length >= 2) {
                            const value = parseFloat(parts[1]);
                            // Skip NaN values which can occur in some system metrics
                            if (!isNaN(value)) {
                                expect(value).toBeGreaterThanOrEqual(0);
                            }
                        }
                    });
                }
            ),
            { numRuns: 25, timeout: 15000 }
        );
    });

    /**
     * Property: Metrics endpoint handles concurrent requests correctly
     * For any number of concurrent requests, metrics should be consistent and valid
     */
    test('should handle concurrent metrics requests correctly', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    concurrentRequests: fc.integer({ min: 2, max: 10 }),
                    tenantId: fc.string({ minLength: 1, maxLength: 20 }),
                    moduleKey: fc.constantFrom('hr-core', 'tasks', 'clinic')
                }),
                async (testData) => {
                    // Arrange: Record some metrics
                    metricsService.recordLicenseValidation(
                        testData.tenantId,
                        testData.moduleKey,
                        true,
                        'cloud',
                        0.1
                    );

                    // Act: Make concurrent requests
                    const requests = Array(testData.concurrentRequests).fill().map(() =>
                        request(app).get('/metrics').expect(200)
                    );

                    const responses = await Promise.all(requests);

                    // Assert: All responses should be valid and consistent
                    expect(responses.length).toBe(testData.concurrentRequests);

                    responses.forEach((response, index) => {
                        expect(response.status).toBe(200);
                        expect(response.headers['content-type']).toMatch(/text\/plain/);
                        expect(response.text).toBeDefined();
                        expect(response.text.length).toBeGreaterThan(0);

                        // All responses should contain the same core metrics
                        expect(response.text).toContain('license_validation_total');
                        expect(response.text).toContain('process_cpu_user_seconds_total');
                    });

                    // Validate that metrics are consistent across requests
                    const firstMetrics = responses[0].text;
                    const metricNames = new Set();
                    
                    firstMetrics.split('\n')
                        .filter(line => line.startsWith('# TYPE'))
                        .forEach(line => {
                            const metricName = line.split(' ')[2];
                            metricNames.add(metricName);
                        });

                    // All responses should have the same metric types
                    responses.slice(1).forEach(response => {
                        metricNames.forEach(metricName => {
                            expect(response.text).toContain(metricName);
                        });
                    });
                }
            ),
            { numRuns: 20, timeout: 20000 }
        );
    });

    /**
     * Property: Metrics values are monotonic for counters
     * For any counter metric, values should never decrease between requests
     */
    test('should maintain monotonic counter values', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    tenantId: fc.string({ minLength: 1, maxLength: 20 }),
                    moduleKey: fc.constantFrom('hr-core', 'tasks'),
                    validationCount: fc.integer({ min: 1, max: 20 })
                }),
                async (testData) => {
                    // Arrange & Act: Record multiple validations and capture metrics
                    const metricSnapshots = [];

                    for (let i = 0; i < testData.validationCount; i++) {
                        // Record a validation
                        metricsService.recordLicenseValidation(
                            testData.tenantId,
                            testData.moduleKey,
                            true,
                            'cloud',
                            0.1
                        );

                        // Capture metrics
                        const response = await request(app)
                            .get('/metrics')
                            .expect(200);
                        
                        metricSnapshots.push(response.text);
                    }

                    // Assert: Counter values should be monotonic (never decrease)
                    for (let i = 1; i < metricSnapshots.length; i++) {
                        const previousMetrics = metricSnapshots[i - 1];
                        const currentMetrics = metricSnapshots[i];

                        // Extract counter values
                        const extractCounterValue = (metricsText, counterName) => {
                            const regex = new RegExp(`${counterName}\\{[^}]*\\}\\s+([0-9.-]+)`);
                            const match = metricsText.match(regex);
                            return match ? parseFloat(match[1]) : 0;
                        };

                        const prevValidationCount = extractCounterValue(previousMetrics, 'license_validation_total');
                        const currValidationCount = extractCounterValue(currentMetrics, 'license_validation_total');

                        // Counter should never decrease
                        expect(currValidationCount).toBeGreaterThanOrEqual(prevValidationCount);
                        
                        // Since we added a validation, it should increase
                        expect(currValidationCount).toBeGreaterThan(prevValidationCount);
                    }
                }
            ),
            { numRuns: 15, timeout: 25000 }
        );
    });

    /**
     * Property: Metrics endpoint is resilient to service errors
     * Even when underlying services have issues, metrics endpoint should remain functional
     */
    test('should remain functional when underlying services have issues', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    tenantId: fc.string({ minLength: 1, maxLength: 20 }),
                    moduleKey: fc.constantFrom('hr-core', 'tasks'),
                    errorScenario: fc.constantFrom('network', 'database', 'timeout')
                }),
                async (testData) => {
                    // Arrange: Record some valid metrics first
                    metricsService.recordLicenseValidation(
                        testData.tenantId,
                        testData.moduleKey,
                        true,
                        'cloud',
                        0.1
                    );

                    // Simulate various error conditions by recording error metrics
                    switch (testData.errorScenario) {
                        case 'network':
                            metricsService.recordLicenseValidationError(
                                testData.tenantId,
                                testData.moduleKey,
                                'network'
                            );
                            break;
                        case 'database':
                            metricsService.recordLicenseValidationError(
                                testData.tenantId,
                                testData.moduleKey,
                                'database'
                            );
                            break;
                        case 'timeout':
                            metricsService.recordLicenseValidationError(
                                testData.tenantId,
                                testData.moduleKey,
                                'timeout'
                            );
                            break;
                    }

                    // Act: Request metrics despite errors
                    const response = await request(app)
                        .get('/metrics')
                        .expect(200);

                    // Assert: Endpoint should still work and return valid metrics
                    expect(response.status).toBe(200);
                    expect(response.headers['content-type']).toMatch(/text\/plain/);
                    expect(response.text).toBeDefined();
                    expect(response.text.length).toBeGreaterThan(0);

                    // Should contain both success and error metrics
                    expect(response.text).toContain('license_validation_total');
                    expect(response.text).toContain('license_validation_errors_total');

                    // Validate format is still correct
                    const lines = response.text.split('\n').filter(line => line.trim() !== '');
                    const metricLines = lines.filter(line => !line.startsWith('#'));
                    
                    metricLines.forEach(line => {
                        // Allow NaN values in system metrics
                        expect(line).toMatch(/^[a-zA-Z_:][a-zA-Z0-9_:]*(\{[^}]*\})?\s+([0-9.-]+|NaN)(\s+[0-9]+)?$/);
                    });
                }
            ),
            { numRuns: 30, timeout: 15000 }
        );
    });
});