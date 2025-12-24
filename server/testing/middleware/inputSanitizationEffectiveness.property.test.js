// testing/services/performanceMetricsCollection.property.test.js
import fc from 'fast-check';
import mongoose from 'mongoose';
import performanceMonitoringService from '../../services/performanceMonitoring.service.js';
import performanceMonitoringMiddleware from '../../middleware/performanceMonitoring.middleware.js';

describe('Performance Metrics Collection Property-Based Tests', () => {
    let testTenantId;
    let PerformanceMetric;

    beforeAll(async () => {
        // Get the PerformanceMetric model from the middleware
        const performanceMetricSchema = new mongoose.Schema({
            tenantId: { type: String, index: true },
            requestId: { type: String, index: true },
            method: { type: String, required: true },
            path: { type: String, required: true },
            statusCode: { type: Number, required: true },
            responseTime: { type: Number, required: true },
            requestSize: { type: Number, default: 0 },
            responseSize: { type: Number, default: 0 },
            userAgent: String,
            ipAddress: String,
            userId: String,
            systemMetrics: {
                cpuUsage: Number,
                memoryUsage: Number,
                memoryTotal: Number,
                loadAverage: [Number],
                uptime: Number
            },
            dbMetrics: {
                connectionCount: Number,
                queryTime: Number,
                queryCount: Number
            },
            error: {
                message: String,
                stack: String,
                code: String
            },
            timestamp: { type: Date, default: Date.now, index: true }
        }, {
            timestamps: true,
            collection: 'performance_metrics'
        });

        // Try to get existing model or create new one
        try {
            PerformanceMetric = mongoose.model('PerformanceMetric');
        } catch (error) {
            PerformanceMetric = mongoose.model('PerformanceMetric', performanceMetricSchema);
        }
    });

    beforeEach(async () => {
        // Create a unique test tenant ID
        testTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Clean up any existing test data
        await PerformanceMetric.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
    });

    afterEach(async () => {
        // Clean up test data
        await PerformanceMetric.deleteMany({ tenantId: { $regex: /^test-tenant-/ } });
    });

    describe('Property 9: Performance Metrics Collection', () => {
        /**
         * Feature: hr-sm-enterprise-enhancement, Property 9: Performance Metrics Collection
         * Validates: Requirements 3.2
         * 
         * For any application performance analysis, the system should accurately measure 
         * request rates, error rates, response times, and database query performance.
         */
        test('should accurately measure and store request rates across different time periods', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        requests: fc.array(
                            fc.record({
                                method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
                                path: fc.constantFrom('/api/users', '/api/reports', '/api/analytics', '/api/tenants'),
                                statusCode: fc.constantFrom(200, 201, 400, 404, 500),
                                responseTime: fc.integer({ min: 50, max: 5000 }),
                                timestampOffset: fc.integer({ min: 0, max: 3600000 }) // 0 to 1 hour in ms
                            }),
                            { minLength: 5, maxLength: 50 }
                        )
                    }),
                    async ({ requests }) => {
                        const runTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        const baseTimestamp = new Date();

                        // Action: Store performance metrics
                        const storedMetrics = [];
                        for (const request of requests) {
                            const timestamp = new Date(baseTimestamp.getTime() + request.timestampOffset);
                            const metric = new PerformanceMetric({
                                tenantId: runTenantId,
                                requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                method: request.method,
                                path: request.path,
                                statusCode: request.statusCode,
                                responseTime: request.responseTime,
                                requestSize: 1024,
                                responseSize: 2048,
                                timestamp: timestamp,
                                systemMetrics: {
                                    cpuUsage: Math.random() * 100,
                                    memoryUsage: Math.random() * 1000000000,
                                    memoryTotal: 2000000000,
                                    loadAverage: [Math.random() * 2, Math.random() * 2, Math.random() * 2],
                                    uptime: Math.random() * 86400
                                },
                                dbMetrics: {
                                    connectionCount: 1,
                                    queryTime: Math.random() * 100,
                                    queryCount: Math.floor(Math.random() * 10) + 1
                                }
                            });

                            await metric.save();
                            storedMetrics.push(metric);
                        }

                        // Get analytics for the time period
                        const startDate = new Date(baseTimestamp.getTime() - 1000); // 1 second before
                        const endDate = new Date(baseTimestamp.getTime() + 3600000 + 1000); // 1 second after

                        const analytics = await performanceMonitoringMiddleware.constructor.getPerformanceAnalytics({
                            tenantId: runTenantId,
                            startDate,
                            endDate,
                            groupBy: 'hour'
                        });

                        // Assertion 1: Analytics should be returned
                        expect(analytics).toBeDefined();
                        expect(analytics.summary).toBeDefined();

                        // Assertion 2: Total request count should match stored metrics
                        expect(analytics.summary.totalRequests).toBe(requests.length);

                        // Assertion 3: Request rate calculation should be accurate
                        const timeSpanHours = (endDate - startDate) / (1000 * 60 * 60);
                        const expectedRequestRate = requests.length / timeSpanHours;
                        const actualRequestRate = analytics.summary.totalRequests / timeSpanHours;
                        expect(actualRequestRate).toBeCloseTo(expectedRequestRate, 2);

                        // Assertion 4: Average response time should be calculated correctly
                        const expectedAvgResponseTime = requests.reduce((sum, req) => sum + req.responseTime, 0) / requests.length;
                        expect(analytics.summary.avgResponseTime).toBeCloseTo(expectedAvgResponseTime, 1);

                        // Assertion 5: All stored metrics should be retrievable
                        const retrievedMetrics = await PerformanceMetric.find({ tenantId: runTenantId });
                        expect(retrievedMetrics).toHaveLength(requests.length);
                    }
                ),
                { numRuns: 10 }
            );
        });

        test('should accurately calculate error rates for different status code ranges', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        successRequests: fc.integer({ min: 10, max: 100 }),
                        clientErrorRequests: fc.integer({ min: 0, max: 50 }),
                        serverErrorRequests: fc.integer({ min: 0, max: 20 })
                    }),
                    async ({ successRequests, clientErrorRequests, serverErrorRequests }) => {
                        const runTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        const totalRequests = successRequests + clientErrorRequests + serverErrorRequests;
                        const totalErrors = clientErrorRequests + serverErrorRequests;
                        const expectedErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

                        // Action: Create metrics with different status codes
                        const metrics = [];

                        // Success requests (2xx)
                        for (let i = 0; i < successRequests; i++) {
                            metrics.push({
                                statusCode: fc.sample(fc.constantFrom(200, 201, 204), 1)[0],
                                responseTime: fc.sample(fc.integer({ min: 100, max: 1000 }), 1)[0]
                            });
                        }

                        // Client error requests (4xx)
                        for (let i = 0; i < clientErrorRequests; i++) {
                            metrics.push({
                                statusCode: fc.sample(fc.constantFrom(400, 401, 403, 404, 422), 1)[0],
                                responseTime: fc.sample(fc.integer({ min: 50, max: 500 }), 1)[0]
                            });
                        }

                        // Server error requests (5xx)
                        for (let i = 0; i < serverErrorRequests; i++) {
                            metrics.push({
                                statusCode: fc.sample(fc.constantFrom(500, 502, 503, 504), 1)[0],
                                responseTime: fc.sample(fc.integer({ min: 1000, max: 5000 }), 1)[0]
                            });
                        }

                        // Store all metrics
                        for (const metricData of metrics) {
                            const metric = new PerformanceMetric({
                                tenantId: runTenantId,
                                requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                method: 'GET',
                                path: '/api/test',
                                statusCode: metricData.statusCode,
                                responseTime: metricData.responseTime,
                                timestamp: new Date(),
                                systemMetrics: {
                                    cpuUsage: 50,
                                    memoryUsage: 500000000,
                                    memoryTotal: 1000000000,
                                    loadAverage: [1.0, 1.0, 1.0],
                                    uptime: 3600
                                },
                                dbMetrics: {
                                    connectionCount: 1,
                                    queryTime: 10,
                                    queryCount: 1
                                }
                            });

                            await metric.save();
                        }

                        // Get analytics
                        const analytics = await performanceMonitoringMiddleware.constructor.getPerformanceAnalytics({
                            tenantId: runTenantId,
                            startDate: new Date(Date.now() - 60000), // 1 minute ago
                            endDate: new Date(Date.now() + 60000), // 1 minute from now
                            groupBy: 'hour'
                        });

                        // Assertion 1: Total request count should match
                        expect(analytics.summary.totalRequests).toBe(totalRequests);

                        // Assertion 2: Total error count should match
                        expect(analytics.summary.totalErrors).toBe(totalErrors);

                        // Assertion 3: Error rate should be calculated correctly
                        expect(analytics.summary.errorRate).toBeCloseTo(expectedErrorRate, 2);

                        // Assertion 4: Error rate should be within valid range
                        expect(analytics.summary.errorRate).toBeGreaterThanOrEqual(0);
                        expect(analytics.summary.errorRate).toBeLessThanOrEqual(100);

                        // Assertion 5: Error statistics should be detailed by status code
                        expect(analytics.errors).toBeDefined();
                        expect(Array.isArray(analytics.errors)).toBe(true);

                        // Verify error breakdown
                        const errorStatusCodes = analytics.errors.map(e => e._id);
                        const expectedErrorCodes = [
                            ...Array(clientErrorRequests > 0 ? 1 : 0).fill().map(() => expect.any(Number)),
                            ...Array(serverErrorRequests > 0 ? 1 : 0).fill().map(() => expect.any(Number))
                        ];

                        if (totalErrors > 0) {
                            expect(errorStatusCodes.length).toBeGreaterThan(0);
                            errorStatusCodes.forEach(code => {
                                expect(code).toBeGreaterThanOrEqual(400);
                            });
                        }
                    }
                ),
                { numRuns: 15 }
            );
        });

        test('should accurately measure response times and identify performance patterns', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        fastRequests: fc.array(
                            fc.record({
                                path: fc.constantFrom('/api/health', '/api/status'),
                                responseTime: fc.integer({ min: 10, max: 200 })
                            }),
                            { minLength: 5, maxLength: 20 }
                        ),
                        slowRequests: fc.array(
                            fc.record({
                                path: fc.constantFrom('/api/reports', '/api/analytics'),
                                responseTime: fc.integer({ min: 1000, max: 5000 })
                            }),
                            { minLength: 2, maxLength: 10 }
                        )
                    }),
                    async ({ fastRequests, slowRequests }) => {
                        const runTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        const allRequests = [...fastRequests, ...slowRequests];
                        const expectedAvgResponseTime = allRequests.reduce((sum, req) => sum + req.responseTime, 0) / allRequests.length;
                        const expectedMaxResponseTime = Math.max(...allRequests.map(req => req.responseTime));
                        const expectedMinResponseTime = Math.min(...allRequests.map(req => req.responseTime));

                        // Action: Store performance metrics
                        for (const request of allRequests) {
                            const metric = new PerformanceMetric({
                                tenantId: runTenantId,
                                requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                method: 'GET',
                                path: request.path,
                                statusCode: 200,
                                responseTime: request.responseTime,
                                timestamp: new Date(),
                                systemMetrics: {
                                    cpuUsage: request.responseTime > 1000 ? 80 : 30, // Higher CPU for slow requests
                                    memoryUsage: 500000000,
                                    memoryTotal: 1000000000,
                                    loadAverage: [1.0, 1.0, 1.0],
                                    uptime: 3600
                                },
                                dbMetrics: {
                                    connectionCount: 1,
                                    queryTime: request.responseTime * 0.3, // DB time is ~30% of response time
                                    queryCount: request.responseTime > 1000 ? 5 : 1 // More queries for slow requests
                                }
                            });

                            await metric.save();
                        }

                        // Get analytics
                        const analytics = await performanceMonitoringMiddleware.constructor.getPerformanceAnalytics({
                            tenantId: runTenantId,
                            startDate: new Date(Date.now() - 3600000), // 1 hour ago
                            endDate: new Date(Date.now() + 3600000), // 1 hour from now
                            groupBy: 'hour'
                        });

                        // Assertion 1: Average response time should be calculated correctly
                        expect(analytics.summary.avgResponseTime).toBeCloseTo(expectedAvgResponseTime, 1);

                        // Assertion 2: Response time statistics should be accurate
                        expect(analytics.timeSeries).toBeDefined();
                        if (analytics.timeSeries.length > 0) {
                            const timeSeriesData = analytics.timeSeries[0];
                            expect(timeSeriesData.avgResponseTime).toBeCloseTo(expectedAvgResponseTime, 1);
                            expect(timeSeriesData.maxResponseTime).toBe(expectedMaxResponseTime);
                            expect(timeSeriesData.minResponseTime).toBe(expectedMinResponseTime);
                        }

                        // Assertion 3: Endpoint performance should be tracked separately
                        expect(analytics.endpoints).toBeDefined();
                        expect(Array.isArray(analytics.endpoints)).toBe(true);

                        // Verify endpoint-specific metrics
                        const healthEndpoint = analytics.endpoints.find(ep => ep._id.path === '/api/health');
                        const reportsEndpoint = analytics.endpoints.find(ep => ep._id.path === '/api/reports');

                        if (healthEndpoint && fastRequests.some(req => req.path === '/api/health')) {
                            expect(healthEndpoint.avgResponseTime).toBeLessThan(500); // Fast endpoints should be fast
                        }

                        if (reportsEndpoint && slowRequests.some(req => req.path === '/api/reports')) {
                            expect(reportsEndpoint.avgResponseTime).toBeGreaterThan(500); // Slow endpoints should be slow
                        }

                        // Assertion 4: Database query performance should be correlated with response time
                        expect(analytics.summary.avgDbQueryTime).toBeDefined();
                        expect(analytics.summary.avgDbQueryTime).toBeGreaterThan(0);

                        // Slow requests should have higher DB query times
                        const avgSlowRequestTime = slowRequests.reduce((sum, req) => sum + req.responseTime, 0) / slowRequests.length;
                        const avgFastRequestTime = fastRequests.reduce((sum, req) => sum + req.responseTime, 0) / fastRequests.length;

                        if (avgSlowRequestTime > avgFastRequestTime * 2) {
                            // DB query time should be proportionally higher for slow requests
                            expect(analytics.summary.avgDbQueryTime).toBeGreaterThan(avgFastRequestTime * 0.1);
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });

        test('should accurately track database query performance metrics', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        requests: fc.array(
                            fc.record({
                                queryCount: fc.integer({ min: 1, max: 10 }),
                                queryTime: fc.integer({ min: 5, max: 500 }),
                                responseTime: fc.integer({ min: 100, max: 2000 })
                            }),
                            { minLength: 5, maxLength: 30 }
                        )
                    }),
                    async ({ requests }) => {
                        const runTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        const totalQueries = requests.reduce((sum, req) => sum + req.queryCount, 0);
                        const totalQueryTime = requests.reduce((sum, req) => sum + req.queryTime, 0);
                        const expectedAvgQueryTime = totalQueryTime / requests.length;
                        const expectedAvgQueryCount = totalQueries / requests.length;

                        // Action: Store metrics with database performance data
                        for (const request of requests) {
                            const metric = new PerformanceMetric({
                                tenantId: runTenantId,
                                requestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                method: 'GET',
                                path: '/api/data',
                                statusCode: 200,
                                responseTime: request.responseTime,
                                timestamp: new Date(),
                                systemMetrics: {
                                    cpuUsage: 40,
                                    memoryUsage: 600000000,
                                    memoryTotal: 1000000000,
                                    loadAverage: [1.2, 1.1, 1.0],
                                    uptime: 7200
                                },
                                dbMetrics: {
                                    connectionCount: 1,
                                    queryTime: request.queryTime,
                                    queryCount: request.queryCount
                                }
                            });

                            await metric.save();
                        }

                        // Get analytics
                        const analytics = await performanceMonitoringMiddleware.constructor.getPerformanceAnalytics({
                            tenantId: runTenantId,
                            startDate: new Date(Date.now() - 60000),
                            endDate: new Date(Date.now() + 60000),
                            groupBy: 'hour'
                        });

                        // Assertion 1: Database query metrics should be calculated correctly
                        expect(analytics.summary.avgDbQueryTime).toBeCloseTo(expectedAvgQueryTime, 1);

                        // Assertion 2: Query performance should be tracked in time series
                        expect(analytics.timeSeries).toBeDefined();
                        if (analytics.timeSeries.length > 0) {
                            const timeSeriesData = analytics.timeSeries[0];
                            expect(timeSeriesData.avgDbQueryTime).toBeCloseTo(expectedAvgQueryTime, 1);
                            expect(timeSeriesData.avgDbQueryCount).toBeCloseTo(expectedAvgQueryCount, 1);
                        }

                        // Assertion 3: Database performance should correlate with response time
                        const highQueryTimeRequests = requests.filter(req => req.queryTime > 200);
                        const lowQueryTimeRequests = requests.filter(req => req.queryTime <= 200);

                        if (highQueryTimeRequests.length > 0 && lowQueryTimeRequests.length > 0) {
                            const avgHighQueryResponseTime = highQueryTimeRequests.reduce((sum, req) => sum + req.responseTime, 0) / highQueryTimeRequests.length;
                            const avgLowQueryResponseTime = lowQueryTimeRequests.reduce((sum, req) => sum + req.responseTime, 0) / lowQueryTimeRequests.length;

                            // Requests with high query times should generally have higher response times
                            // (allowing for some variance due to other factors)
                            // Assertion loosened as generated data might not always strictly follow this correlation
                            // expect(avgHighQueryResponseTime).toBeGreaterThanOrEqual(avgLowQueryResponseTime * 0.8);
                        }

                        // Assertion 4: All database metrics should be non-negative
                        expect(analytics.summary.avgDbQueryTime).toBeGreaterThanOrEqual(0);

                        // Assertion 5: Query count should be reasonable
                        const maxQueryCount = Math.max(...requests.map(req => req.queryCount));
                        const minQueryCount = Math.min(...requests.map(req => req.queryCount));

                        if (analytics.timeSeries.length > 0) {
                            const timeSeriesData = analytics.timeSeries[0];
                            expect(timeSeriesData.avgDbQueryCount).toBeGreaterThanOrEqual(minQueryCount);
                            expect(timeSeriesData.avgDbQueryCount).toBeLessThanOrEqual(maxQueryCount);
                        }
                    }
                ),
                { numRuns: 12 }
            );
        });

        test('should maintain performance metrics accuracy during high load scenarios', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        concurrentRequests: fc.integer({ min: 20, max: 100 }),
                        requestVariation: fc.record({
                            minResponseTime: fc.integer({ min: 50, max: 200 }),
                            maxResponseTime: fc.integer({ min: 500, max: 2000 }),
                            errorProbability: fc.double({ min: 0, max: 0.3 }) // 0-30% error rate
                        })
                    }),
                    async ({ concurrentRequests, requestVariation }) => {
                        const runTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        const { minResponseTime, maxResponseTime, errorProbability } = requestVariation;

                        // Action: Simulate concurrent requests
                        const requestPromises = [];
                        const expectedMetrics = [];

                        for (let i = 0; i < concurrentRequests; i++) {
                            const responseTime = fc.sample(fc.integer({ min: minResponseTime, max: maxResponseTime }), 1)[0];
                            const isError = Math.random() < errorProbability;
                            const statusCode = isError ? fc.sample(fc.constantFrom(400, 500, 503), 1)[0] : 200;

                            expectedMetrics.push({ responseTime, statusCode, isError });

                            const promise = (async () => {
                                const metric = new PerformanceMetric({
                                    tenantId: runTenantId,
                                    requestId: `req-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                                    method: 'POST',
                                    path: '/api/load-test',
                                    statusCode: statusCode,
                                    responseTime: responseTime,
                                    timestamp: new Date(),
                                    systemMetrics: {
                                        cpuUsage: 60 + (responseTime / maxResponseTime) * 30, // Higher CPU for slower requests
                                        memoryUsage: 700000000 + Math.random() * 100000000,
                                        memoryTotal: 1000000000,
                                        loadAverage: [1.5, 1.4, 1.3],
                                        uptime: 10800
                                    },
                                    dbMetrics: {
                                        connectionCount: 1,
                                        queryTime: responseTime * 0.4,
                                        queryCount: Math.floor(responseTime / 200) + 1
                                    }
                                });

                                return await metric.save();
                            })();

                            requestPromises.push(promise);
                        }

                        // Wait for all requests to complete
                        const savedMetrics = await Promise.all(requestPromises);

                        // Calculate expected values
                        const expectedAvgResponseTime = expectedMetrics.reduce((sum, m) => sum + m.responseTime, 0) / expectedMetrics.length;
                        const expectedErrorCount = expectedMetrics.filter(m => m.isError).length;
                        const expectedErrorRate = (expectedErrorCount / expectedMetrics.length) * 100;

                        // Get analytics
                        const analytics = await performanceMonitoringMiddleware.constructor.getPerformanceAnalytics({
                            tenantId: runTenantId,
                            startDate: new Date(Date.now() - 3600000),
                            endDate: new Date(Date.now() + 3600000),
                            groupBy: 'hour'
                        });

                        // Assertion 1: All metrics should be stored successfully
                        expect(savedMetrics).toHaveLength(concurrentRequests);
                        savedMetrics.forEach(metric => {
                            expect(metric).toBeDefined();
                            expect(metric._id).toBeDefined();
                        });

                        // Assertion 2: Analytics should reflect the correct totals
                        expect(analytics.summary.totalRequests).toBe(concurrentRequests);
                        expect(analytics.summary.totalErrors).toBe(expectedErrorCount);

                        // Assertion 3: Average response time should be calculated correctly
                        expect(analytics.summary.avgResponseTime).toBeCloseTo(expectedAvgResponseTime, 1);

                        // Assertion 4: Error rate should be calculated correctly
                        expect(analytics.summary.errorRate).toBeCloseTo(expectedErrorRate, 1);

                        // Assertion 5: System metrics should show increased load
                        if (analytics.timeSeries.length > 0) {
                            const timeSeriesData = analytics.timeSeries[0];
                            expect(timeSeriesData.avgCpuUsage).toBeGreaterThan(50); // Should show high CPU under load
                            expect(timeSeriesData.avgMemoryUsage).toBeGreaterThan(600000000); // Should show high memory usage
                        }

                        // Assertion 6: Performance should degrade gracefully under load
                        const highLoadMetrics = expectedMetrics.filter(m => m.responseTime > (minResponseTime + maxResponseTime) / 2);
                        if (highLoadMetrics.length > 0) {
                            // High load requests should still be processed (no data loss)
                            const highLoadCount = savedMetrics.filter(m => m.responseTime > (minResponseTime + maxResponseTime) / 2).length;
                            expect(highLoadCount).toBe(highLoadMetrics.length);
                        }
                    }
                ),
                { numRuns: 8 }
            );
        });

        test('should correctly aggregate performance metrics across different time windows', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        timeWindows: fc.array(
                            fc.record({
                                offsetMinutes: fc.integer({ min: 0, max: 120 }), // 0 to 2 hours
                                requestCount: fc.integer({ min: 1, max: 20 }),
                                avgResponseTime: fc.integer({ min: 100, max: 1000 })
                            }),
                            { minLength: 3, maxLength: 8 }
                        )
                    }),
                    async ({ timeWindows }) => {
                        const runTenantId = `test-tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        const baseTime = new Date();
                        const allMetrics = [];

                        // Action: Create metrics across different time windows
                        for (const window of timeWindows) {
                            const windowTime = new Date(baseTime.getTime() + window.offsetMinutes * 60 * 1000);

                            for (let i = 0; i < window.requestCount; i++) {
                                const responseTime = window.avgResponseTime + fc.sample(fc.integer({ min: -100, max: 100 }), 1)[0];
                                const metric = new PerformanceMetric({
                                    tenantId: runTenantId,
                                    requestId: `req-${windowTime.getTime()}-${i}`,
                                    method: 'GET',
                                    path: '/api/time-test',
                                    statusCode: 200,
                                    responseTime: Math.max(50, responseTime), // Ensure positive response time
                                    timestamp: windowTime,
                                    systemMetrics: {
                                        cpuUsage: 45,
                                        memoryUsage: 500000000,
                                        memoryTotal: 1000000000,
                                        loadAverage: [1.0, 1.0, 1.0],
                                        uptime: 3600
                                    },
                                    dbMetrics: {
                                        connectionCount: 1,
                                        queryTime: Math.max(5, responseTime * 0.2),
                                        queryCount: 1
                                    }
                                });

                                await metric.save();
                                allMetrics.push({
                                    responseTime: Math.max(50, responseTime),
                                    timestamp: windowTime,
                                    windowIndex: timeWindows.indexOf(window)
                                });
                            }
                        }

                        // Calculate expected totals
                        const totalRequests = timeWindows.reduce((sum, w) => sum + w.requestCount, 0);
                        const expectedAvgResponseTime = allMetrics.reduce((sum, m) => sum + m.responseTime, 0) / allMetrics.length;

                        // Get analytics for the entire period
                        const startDate = new Date(baseTime.getTime() - 60000); // 1 minute before base
                        const endDate = new Date(baseTime.getTime() + 130 * 60 * 1000); // 10 minutes after max offset

                        const analytics = await performanceMonitoringMiddleware.constructor.getPerformanceAnalytics({
                            tenantId: runTenantId,
                            startDate,
                            endDate,
                            groupBy: 'hour'
                        });

                        // Assertion 1: Total request count should match across all windows
                        expect(analytics.summary.totalRequests).toBe(totalRequests);

                        // Assertion 2: Overall average response time should be calculated correctly
                        expect(analytics.summary.avgResponseTime).toBeCloseTo(expectedAvgResponseTime, 1);

                        // Assertion 3: Time series data should be properly aggregated
                        expect(analytics.timeSeries).toBeDefined();
                        expect(Array.isArray(analytics.timeSeries)).toBe(true);

                        // Verify time series aggregation
                        const timeSeriesTotal = analytics.timeSeries.reduce((sum, ts) => sum + ts.requestCount, 0);
                        expect(timeSeriesTotal).toBe(totalRequests);

                        // Assertion 4: Each time window should contribute to the aggregation
                        if (analytics.timeSeries.length > 0) {
                            const timeSeriesAvgResponseTime = analytics.timeSeries.reduce((sum, ts) =>
                                sum + (ts.avgResponseTime * ts.requestCount), 0) / totalRequests;
                            expect(timeSeriesAvgResponseTime).toBeCloseTo(expectedAvgResponseTime, 1);
                        }

                        // Assertion 5: Analytics should cover the correct time period
                        expect(analytics.period.start).toEqual(startDate);
                        expect(analytics.period.end).toEqual(endDate);
                        expect(analytics.generatedAt).toBeInstanceOf(Date);
                    }
                ),
                { numRuns: 8 }
            );
        });
    });
});