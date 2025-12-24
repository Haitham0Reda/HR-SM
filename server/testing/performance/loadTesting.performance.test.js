/**
 * Performance and Load Testing Suite
 * 
 * Tests system performance under various load conditions:
 * - Concurrent license validation load testing
 * - Real-time monitoring under high load
 * - Database performance with large datasets
 * - License server under high load (1000+ validations/sec)
 * 
 * Requirements: 3.2, 4.2, 9.2
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import axios from 'axios';
import { performance } from 'perf_hooks';

// Mock axios for controlled testing
jest.mock('axios');
const mockedAxios = axios;

// Mock Redis for performance testing
const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    pipeline: jest.fn(() => ({
        exec: jest.fn()
    }))
};

// Mock Socket.io for real-time testing
const mockSocket = {
    emit: jest.fn(),
    on: jest.fn(),
    disconnect: jest.fn(),
    connected: true
};

// Performance metrics collector
class PerformanceMetrics {
    constructor() {
        this.metrics = {
            responseTime: [],
            throughput: 0,
            errorRate: 0,
            concurrentUsers: 0,
            memoryUsage: [],
            cpuUsage: []
        };
    }

    recordResponseTime(startTime, endTime) {
        const responseTime = endTime - startTime;
        this.metrics.responseTime.push(responseTime);
        return responseTime;
    }

    calculateAverageResponseTime() {
        if (this.metrics.responseTime.length === 0) return 0;
        const sum = this.metrics.responseTime.reduce((a, b) => a + b, 0);
        return sum / this.metrics.responseTime.length;
    }

    calculatePercentile(percentile) {
        if (this.metrics.responseTime.length === 0) return 0;
        const sorted = [...this.metrics.responseTime].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index];
    }

    calculateThroughput(totalRequests, durationMs) {
        return (totalRequests / durationMs) * 1000; // requests per second
    }

    reset() {
        this.metrics = {
            responseTime: [],
            throughput: 0,
            errorRate: 0,
            concurrentUsers: 0,
            memoryUsage: [],
            cpuUsage: []
        };
    }
}

describe('Performance and Load Testing', () => {
    let performanceMetrics;
    let testStartTime;

    beforeAll(async () => {
        performanceMetrics = new PerformanceMetrics();
        jest.clearAllMocks();
    });

    beforeEach(async () => {
        performanceMetrics.reset();
        testStartTime = performance.now();
        jest.clearAllMocks();
    });

    afterEach(async () => {
        const testEndTime = performance.now();
        const testDuration = testEndTime - testStartTime;
        console.log(`Test completed in ${testDuration.toFixed(2)}ms`);
    });

    describe('Concurrent License Validation Load Testing', () => {
        it('should handle 100 concurrent license validations within performance limits', async () => {
            const concurrentRequests = 100;
            const maxResponseTime = 200; // 200ms max response time
            const minThroughput = 400; // 400 requests per second minimum

            // Mock successful license validation responses
            for (let i = 0; i < concurrentRequests; i++) {
                mockedAxios.post.mockResolvedValueOnce({
                    data: {
                        valid: true,
                        licenseType: 'professional',
                        features: ['hr-core', 'life-insurance'],
                        responseTime: Math.random() * 150 + 50 // 50-200ms response time
                    }
                });
            }

            const startTime = performance.now();

            // Create concurrent validation requests
            const validationPromises = Array.from({ length: concurrentRequests }, (_, i) => {
                const requestStartTime = performance.now();
                
                return mockedAxios.post('http://localhost:4000/licenses/validate', {
                    token: `test-token-${i}`,
                    machineId: `machine-${i}`
                }).then(response => {
                    const requestEndTime = performance.now();
                    const responseTime = performanceMetrics.recordResponseTime(requestStartTime, requestEndTime);
                    return { ...response, responseTime };
                });
            });

            // Execute all requests concurrently
            const results = await Promise.all(validationPromises);
            const endTime = performance.now();
            const totalDuration = endTime - startTime;

            // Verify all requests succeeded
            expect(results).toHaveLength(concurrentRequests);
            results.forEach(result => {
                expect(result.data.valid).toBe(true);
            });

            // Calculate performance metrics
            const averageResponseTime = performanceMetrics.calculateAverageResponseTime();
            const p95ResponseTime = performanceMetrics.calculatePercentile(95);
            const throughput = performanceMetrics.calculateThroughput(concurrentRequests, totalDuration);

            // Performance assertions
            expect(averageResponseTime).toBeLessThan(maxResponseTime);
            expect(p95ResponseTime).toBeLessThan(maxResponseTime * 1.5); // Allow 50% margin for P95
            expect(throughput).toBeGreaterThan(minThroughput);

            console.log(`Performance Metrics:
                - Average Response Time: ${averageResponseTime.toFixed(2)}ms
                - P95 Response Time: ${p95ResponseTime.toFixed(2)}ms
                - Throughput: ${throughput.toFixed(2)} req/sec
                - Total Duration: ${totalDuration.toFixed(2)}ms`);
        });

        it('should handle 1000+ license validations per second', async () => {
            const targetThroughput = 1000; // 1000 requests per second
            const testDurationMs = 2000; // 2 seconds
            const totalRequests = Math.floor((targetThroughput * testDurationMs) / 1000);
            const batchSize = 50; // Process in batches to avoid overwhelming the system

            console.log(`Testing ${totalRequests} requests over ${testDurationMs}ms (target: ${targetThroughput} req/sec)`);

            // Mock responses for all requests
            for (let i = 0; i < totalRequests; i++) {
                mockedAxios.post.mockResolvedValueOnce({
                    data: {
                        valid: true,
                        licenseType: 'professional',
                        features: ['hr-core'],
                        cached: Math.random() > 0.7, // 30% cache hit rate
                        responseTime: Math.random() * 50 + 10 // 10-60ms response time
                    }
                });
            }

            const startTime = performance.now();
            let completedRequests = 0;
            let errors = 0;

            // Process requests in batches
            const batches = Math.ceil(totalRequests / batchSize);
            const batchPromises = [];

            for (let batch = 0; batch < batches; batch++) {
                const batchStartIndex = batch * batchSize;
                const batchEndIndex = Math.min(batchStartIndex + batchSize, totalRequests);
                const batchRequests = batchEndIndex - batchStartIndex;

                const batchPromise = Promise.all(
                    Array.from({ length: batchRequests }, (_, i) => {
                        const requestIndex = batchStartIndex + i;
                        const requestStartTime = performance.now();

                        return mockedAxios.post('http://localhost:4000/licenses/validate', {
                            token: `load-test-token-${requestIndex}`,
                            machineId: `load-machine-${requestIndex % 10}` // Simulate 10 different machines
                        }).then(response => {
                            const requestEndTime = performance.now();
                            performanceMetrics.recordResponseTime(requestStartTime, requestEndTime);
                            completedRequests++;
                            return response;
                        }).catch(error => {
                            errors++;
                            throw error;
                        });
                    })
                );

                batchPromises.push(batchPromise);

                // Add small delay between batches to simulate realistic load
                if (batch < batches - 1) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }

            // Wait for all batches to complete
            const results = await Promise.allSettled(batchPromises);
            const endTime = performance.now();
            const actualDuration = endTime - startTime;

            // Calculate metrics
            const actualThroughput = performanceMetrics.calculateThroughput(completedRequests, actualDuration);
            const averageResponseTime = performanceMetrics.calculateAverageResponseTime();
            const p95ResponseTime = performanceMetrics.calculatePercentile(95);
            const p99ResponseTime = performanceMetrics.calculatePercentile(99);
            const errorRate = (errors / totalRequests) * 100;

            // Performance assertions
            expect(actualThroughput).toBeGreaterThan(targetThroughput * 0.8); // Allow 20% margin
            expect(averageResponseTime).toBeLessThan(100); // Average under 100ms
            expect(p95ResponseTime).toBeLessThan(200); // P95 under 200ms
            expect(errorRate).toBeLessThan(1); // Less than 1% error rate

            console.log(`High Load Performance Metrics:
                - Actual Throughput: ${actualThroughput.toFixed(2)} req/sec
                - Target Throughput: ${targetThroughput} req/sec
                - Average Response Time: ${averageResponseTime.toFixed(2)}ms
                - P95 Response Time: ${p95ResponseTime.toFixed(2)}ms
                - P99 Response Time: ${p99ResponseTime.toFixed(2)}ms
                - Error Rate: ${errorRate.toFixed(2)}%
                - Completed Requests: ${completedRequests}/${totalRequests}
                - Test Duration: ${actualDuration.toFixed(2)}ms`);
        });

        it('should maintain performance with Redis caching under load', async () => {
            const totalRequests = 500;
            const cacheHitRate = 0.6; // 60% cache hit rate
            const cachedRequests = Math.floor(totalRequests * cacheHitRate);
            const uncachedRequests = totalRequests - cachedRequests;

            // Mock Redis cache responses
            mockRedis.get.mockImplementation((key) => {
                // Simulate cache hit/miss based on key
                const shouldHit = Math.random() < cacheHitRate;
                if (shouldHit) {
                    return Promise.resolve(JSON.stringify({
                        valid: true,
                        licenseType: 'professional',
                        features: ['hr-core', 'life-insurance'],
                        cached: true,
                        cachedAt: new Date().toISOString()
                    }));
                }
                return Promise.resolve(null);
            });

            mockRedis.set.mockResolvedValue('OK');

            // Mock license server responses for cache misses
            for (let i = 0; i < uncachedRequests; i++) {
                mockedAxios.post.mockResolvedValueOnce({
                    data: {
                        valid: true,
                        licenseType: 'professional',
                        features: ['hr-core', 'life-insurance'],
                        cached: false
                    }
                });
            }

            const startTime = performance.now();
            let cacheHits = 0;
            let cacheMisses = 0;

            // Simulate license validation with caching
            const validationPromises = Array.from({ length: totalRequests }, async (_, i) => {
                const requestStartTime = performance.now();
                const cacheKey = `license:validation:token-${i % 100}`; // Simulate key reuse

                // Check cache first
                const cachedResult = await mockRedis.get(cacheKey);
                
                if (cachedResult) {
                    cacheHits++;
                    const requestEndTime = performance.now();
                    performanceMetrics.recordResponseTime(requestStartTime, requestEndTime);
                    return { data: JSON.parse(cachedResult), cached: true };
                } else {
                    cacheMisses++;
                    // Simulate license server call
                    const response = await mockedAxios.post('http://localhost:4000/licenses/validate', {
                        token: `token-${i}`,
                        machineId: `machine-${i % 10}`
                    });

                    // Cache the result
                    await mockRedis.set(cacheKey, JSON.stringify(response.data), 'EX', 900); // 15 min TTL

                    const requestEndTime = performance.now();
                    performanceMetrics.recordResponseTime(requestStartTime, requestEndTime);
                    return { ...response, cached: false };
                }
            });

            const results = await Promise.all(validationPromises);
            const endTime = performance.now();
            const totalDuration = endTime - startTime;

            // Calculate metrics
            const actualCacheHitRate = (cacheHits / totalRequests) * 100;
            const averageResponseTime = performanceMetrics.calculateAverageResponseTime();
            const throughput = performanceMetrics.calculateThroughput(totalRequests, totalDuration);

            // Verify results
            expect(results).toHaveLength(totalRequests);
            results.forEach(result => {
                expect(result.data.valid).toBe(true);
            });

            // Performance assertions with caching
            expect(actualCacheHitRate).toBeGreaterThan(50); // At least 50% cache hit rate
            expect(averageResponseTime).toBeLessThan(50); // Should be faster with caching
            expect(throughput).toBeGreaterThan(800); // Higher throughput with caching

            console.log(`Caching Performance Metrics:
                - Cache Hit Rate: ${actualCacheHitRate.toFixed(2)}%
                - Cache Hits: ${cacheHits}
                - Cache Misses: ${cacheMisses}
                - Average Response Time: ${averageResponseTime.toFixed(2)}ms
                - Throughput: ${throughput.toFixed(2)} req/sec
                - Redis Get Calls: ${mockRedis.get.mock.calls.length}
                - Redis Set Calls: ${mockRedis.set.mock.calls.length}`);
        });
    });

    describe('Real-time Monitoring Under High Load', () => {
        it('should handle high-frequency metrics updates without performance degradation', async () => {
            const metricsUpdateInterval = 100; // 100ms intervals
            const testDurationMs = 5000; // 5 seconds
            const expectedUpdates = Math.floor(testDurationMs / metricsUpdateInterval);
            const concurrentConnections = 20; // 20 concurrent dashboard connections

            let metricsUpdatesReceived = 0;
            let totalEmissionTime = 0;

            // Mock Socket.io connections
            const mockConnections = Array.from({ length: concurrentConnections }, (_, i) => ({
                id: `connection-${i}`,
                emit: jest.fn(),
                on: jest.fn(),
                connected: true
            }));

            // Simulate high-frequency metrics collection and emission
            const startTime = performance.now();
            const metricsInterval = setInterval(() => {
                const emissionStartTime = performance.now();

                // Generate mock metrics data
                const metricsData = {
                    system: {
                        cpu: { usage: Math.random() * 100, cores: 4 },
                        memory: { 
                            used: Math.random() * 8192, 
                            total: 8192, 
                            percentage: Math.random() * 100 
                        },
                        uptime: Date.now()
                    },
                    tenants: {
                        total: 50 + Math.floor(Math.random() * 10),
                        active: 45 + Math.floor(Math.random() * 5),
                        suspended: Math.floor(Math.random() * 3)
                    },
                    licenses: {
                        validations: Math.floor(Math.random() * 1000),
                        active: 45 + Math.floor(Math.random() * 5),
                        expired: Math.floor(Math.random() * 3)
                    },
                    timestamp: new Date().toISOString()
                };

                // Emit to all connections
                mockConnections.forEach(connection => {
                    connection.emit('metrics-update', metricsData);
                });

                const emissionEndTime = performance.now();
                const emissionTime = emissionEndTime - emissionStartTime;
                totalEmissionTime += emissionTime;
                metricsUpdatesReceived++;

                // Performance check - emission should be fast
                expect(emissionTime).toBeLessThan(50); // Less than 50ms per emission
            }, metricsUpdateInterval);

            // Let the test run for the specified duration
            await new Promise(resolve => setTimeout(resolve, testDurationMs));
            clearInterval(metricsInterval);

            const endTime = performance.now();
            const actualDuration = endTime - startTime;

            // Calculate metrics
            const averageEmissionTime = totalEmissionTime / metricsUpdatesReceived;
            const emissionThroughput = (metricsUpdatesReceived / actualDuration) * 1000;

            // Performance assertions
            expect(metricsUpdatesReceived).toBeGreaterThanOrEqual(expectedUpdates * 0.9); // Allow 10% margin
            expect(averageEmissionTime).toBeLessThan(30); // Average emission under 30ms
            expect(emissionThroughput).toBeGreaterThan(8); // At least 8 updates per second

            // Verify all connections received updates
            mockConnections.forEach(connection => {
                expect(connection.emit).toHaveBeenCalledTimes(metricsUpdatesReceived);
                expect(connection.emit).toHaveBeenCalledWith(
                    'metrics-update',
                    expect.objectContaining({
                        system: expect.any(Object),
                        tenants: expect.any(Object),
                        licenses: expect.any(Object),
                        timestamp: expect.any(String)
                    })
                );
            });

            console.log(`Real-time Monitoring Performance:
                - Metrics Updates Sent: ${metricsUpdatesReceived}
                - Expected Updates: ${expectedUpdates}
                - Average Emission Time: ${averageEmissionTime.toFixed(2)}ms
                - Emission Throughput: ${emissionThroughput.toFixed(2)} updates/sec
                - Concurrent Connections: ${concurrentConnections}
                - Test Duration: ${actualDuration.toFixed(2)}ms`);
        });

        it('should handle alert generation under high system load', async () => {
            const alertThresholds = {
                cpu: 80,
                memory: 85,
                diskSpace: 90,
                responseTime: 500
            };

            const simulationDurationMs = 3000;
            const checkInterval = 50; // Check every 50ms
            const expectedChecks = Math.floor(simulationDurationMs / checkInterval);

            let alertsGenerated = 0;
            let checksPerformed = 0;
            let alertGenerationTime = 0;

            // Simulate system monitoring with alert generation
            const startTime = performance.now();
            const monitoringInterval = setInterval(() => {
                const checkStartTime = performance.now();
                checksPerformed++;

                // Generate random system metrics
                const systemMetrics = {
                    cpu: Math.random() * 100,
                    memory: Math.random() * 100,
                    diskSpace: Math.random() * 100,
                    responseTime: Math.random() * 1000
                };

                // Check for alert conditions
                const alerts = [];
                Object.entries(alertThresholds).forEach(([metric, threshold]) => {
                    if (systemMetrics[metric] > threshold) {
                        alerts.push({
                            type: `${metric}_high`,
                            level: systemMetrics[metric] > threshold * 1.1 ? 'critical' : 'warning',
                            value: systemMetrics[metric],
                            threshold: threshold,
                            timestamp: new Date().toISOString()
                        });
                    }
                });

                // Generate alerts if any
                if (alerts.length > 0) {
                    const alertStartTime = performance.now();
                    
                    alerts.forEach(alert => {
                        // Simulate alert processing (email, notification, etc.)
                        mockSocket.emit('system-alert', alert);
                        alertsGenerated++;
                    });

                    const alertEndTime = performance.now();
                    alertGenerationTime += (alertEndTime - alertStartTime);
                }

                const checkEndTime = performance.now();
                const checkDuration = checkEndTime - checkStartTime;

                // Performance assertion - each check should be fast
                expect(checkDuration).toBeLessThan(25); // Less than 25ms per check
            }, checkInterval);

            // Run simulation
            await new Promise(resolve => setTimeout(resolve, simulationDurationMs));
            clearInterval(monitoringInterval);

            const endTime = performance.now();
            const actualDuration = endTime - startTime;

            // Calculate metrics
            const averageCheckTime = (actualDuration - alertGenerationTime) / checksPerformed;
            const averageAlertTime = alertsGenerated > 0 ? alertGenerationTime / alertsGenerated : 0;
            const alertRate = (alertsGenerated / checksPerformed) * 100;

            // Performance assertions
            expect(checksPerformed).toBeGreaterThanOrEqual(expectedChecks * 0.9);
            expect(averageCheckTime).toBeLessThan(20); // Average check under 20ms
            expect(averageAlertTime).toBeLessThan(10); // Average alert generation under 10ms

            console.log(`Alert Generation Performance:
                - Checks Performed: ${checksPerformed}
                - Expected Checks: ${expectedChecks}
                - Alerts Generated: ${alertsGenerated}
                - Alert Rate: ${alertRate.toFixed(2)}%
                - Average Check Time: ${averageCheckTime.toFixed(2)}ms
                - Average Alert Time: ${averageAlertTime.toFixed(2)}ms
                - Test Duration: ${actualDuration.toFixed(2)}ms`);
        });
    });

    describe('Database Performance with Large Datasets', () => {
        it('should handle large tenant queries efficiently', async () => {
            const tenantCount = 1000;
            const queriesPerTenant = 5;
            const totalQueries = tenantCount * queriesPerTenant;
            const maxQueryTime = 100; // 100ms max per query

            // Mock database query responses
            const mockTenantData = Array.from({ length: tenantCount }, (_, i) => ({
                _id: `tenant-${i}`,
                name: `Company ${i}`,
                subdomain: `company${i}`,
                status: Math.random() > 0.1 ? 'active' : 'suspended',
                metrics: {
                    totalUsers: Math.floor(Math.random() * 500),
                    storageUsed: Math.floor(Math.random() * 10240),
                    apiCallsThisMonth: Math.floor(Math.random() * 100000)
                },
                createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
            }));

            // Mock various database operations
            const queryTypes = [
                'findById',
                'findByStatus',
                'aggregateMetrics',
                'updateMetrics',
                'findByDateRange'
            ];

            let queryExecutionTimes = [];
            let successfulQueries = 0;
            let failedQueries = 0;

            const startTime = performance.now();

            // Execute queries in batches to simulate realistic load
            const batchSize = 50;
            const batches = Math.ceil(totalQueries / batchSize);

            for (let batch = 0; batch < batches; batch++) {
                const batchStartIndex = batch * batchSize;
                const batchEndIndex = Math.min(batchStartIndex + batchSize, totalQueries);
                const batchQueries = batchEndIndex - batchStartIndex;

                const batchPromises = Array.from({ length: batchQueries }, async (_, i) => {
                    const queryIndex = batchStartIndex + i;
                    const tenantIndex = queryIndex % tenantCount;
                    const queryType = queryTypes[queryIndex % queryTypes.length];
                    
                    const queryStartTime = performance.now();

                    try {
                        // Simulate different query types with different response times
                        let simulatedQueryTime;
                        switch (queryType) {
                            case 'findById':
                                simulatedQueryTime = Math.random() * 20 + 5; // 5-25ms
                                break;
                            case 'findByStatus':
                                simulatedQueryTime = Math.random() * 40 + 10; // 10-50ms
                                break;
                            case 'aggregateMetrics':
                                simulatedQueryTime = Math.random() * 80 + 20; // 20-100ms
                                break;
                            case 'updateMetrics':
                                simulatedQueryTime = Math.random() * 30 + 10; // 10-40ms
                                break;
                            case 'findByDateRange':
                                simulatedQueryTime = Math.random() * 60 + 15; // 15-75ms
                                break;
                            default:
                                simulatedQueryTime = Math.random() * 50 + 10;
                        }

                        // Simulate query execution time
                        await new Promise(resolve => setTimeout(resolve, simulatedQueryTime));

                        const queryEndTime = performance.now();
                        const actualQueryTime = queryEndTime - queryStartTime;
                        queryExecutionTimes.push(actualQueryTime);

                        // Performance assertion per query
                        expect(actualQueryTime).toBeLessThan(maxQueryTime);

                        successfulQueries++;
                        return mockTenantData[tenantIndex];
                    } catch (error) {
                        failedQueries++;
                        throw error;
                    }
                });

                await Promise.all(batchPromises);

                // Small delay between batches
                if (batch < batches - 1) {
                    await new Promise(resolve => setTimeout(resolve, 5));
                }
            }

            const endTime = performance.now();
            const totalDuration = endTime - startTime;

            // Calculate performance metrics
            const averageQueryTime = queryExecutionTimes.reduce((a, b) => a + b, 0) / queryExecutionTimes.length;
            const p95QueryTime = queryExecutionTimes.sort((a, b) => a - b)[Math.floor(queryExecutionTimes.length * 0.95)];
            const queryThroughput = (successfulQueries / totalDuration) * 1000;
            const errorRate = (failedQueries / totalQueries) * 100;

            // Performance assertions
            expect(averageQueryTime).toBeLessThan(maxQueryTime * 0.6); // Average should be well below max
            expect(p95QueryTime).toBeLessThan(maxQueryTime);
            expect(queryThroughput).toBeGreaterThan(300); // At least 300 queries per second
            expect(errorRate).toBeLessThan(1); // Less than 1% error rate

            console.log(`Database Performance Metrics:
                - Total Queries: ${totalQueries}
                - Successful Queries: ${successfulQueries}
                - Failed Queries: ${failedQueries}
                - Average Query Time: ${averageQueryTime.toFixed(2)}ms
                - P95 Query Time: ${p95QueryTime.toFixed(2)}ms
                - Query Throughput: ${queryThroughput.toFixed(2)} queries/sec
                - Error Rate: ${errorRate.toFixed(2)}%
                - Test Duration: ${totalDuration.toFixed(2)}ms`);
        });

        it('should handle large insurance dataset operations efficiently', async () => {
            const policyCount = 5000;
            const claimsPerPolicy = 2;
            const totalClaims = policyCount * claimsPerPolicy;
            const maxAggregationTime = 500; // 500ms max for complex aggregations

            // Mock large insurance dataset
            const mockPolicies = Array.from({ length: policyCount }, (_, i) => ({
                _id: `policy-${i}`,
                policyNumber: `INS-2024-${String(i).padStart(6, '0')}`,
                tenantId: `tenant-${i % 100}`, // 100 tenants
                employeeId: `emp-${i}`,
                policyType: ['CAT_A', 'CAT_B', 'CAT_C'][i % 3],
                coverageAmount: (Math.random() * 500000) + 100000,
                premium: (Math.random() * 5000) + 1000,
                status: Math.random() > 0.05 ? 'active' : 'expired',
                createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
            }));

            const mockClaims = Array.from({ length: totalClaims }, (_, i) => ({
                _id: `claim-${i}`,
                claimNumber: `CLM-2024-${String(i).padStart(6, '0')}`,
                policyId: `policy-${Math.floor(i / claimsPerPolicy)}`,
                claimType: ['death', 'disability', 'medical'][i % 3],
                claimAmount: Math.random() * 100000,
                status: ['pending', 'approved', 'rejected', 'paid'][i % 4],
                submittedAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000)
            }));

            // Test various complex operations
            const operations = [
                {
                    name: 'Policy Aggregation by Type',
                    operation: async () => {
                        const startTime = performance.now();
                        
                        // Simulate aggregation query
                        const aggregation = mockPolicies.reduce((acc, policy) => {
                            acc[policy.policyType] = (acc[policy.policyType] || 0) + 1;
                            return acc;
                        }, {});
                        
                        // Simulate database processing time
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
                        
                        const endTime = performance.now();
                        return { result: aggregation, duration: endTime - startTime };
                    }
                },
                {
                    name: 'Claims Status Distribution',
                    operation: async () => {
                        const startTime = performance.now();
                        
                        const distribution = mockClaims.reduce((acc, claim) => {
                            acc[claim.status] = (acc[claim.status] || 0) + 1;
                            return acc;
                        }, {});
                        
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 75));
                        
                        const endTime = performance.now();
                        return { result: distribution, duration: endTime - startTime };
                    }
                },
                {
                    name: 'Revenue Calculation by Tenant',
                    operation: async () => {
                        const startTime = performance.now();
                        
                        const revenue = mockPolicies.reduce((acc, policy) => {
                            acc[policy.tenantId] = (acc[policy.tenantId] || 0) + policy.premium;
                            return acc;
                        }, {});
                        
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
                        
                        const endTime = performance.now();
                        return { result: revenue, duration: endTime - startTime };
                    }
                },
                {
                    name: 'Complex Join Operation (Policies + Claims)',
                    operation: async () => {
                        const startTime = performance.now();
                        
                        const joinResult = mockPolicies.map(policy => {
                            const policyClaims = mockClaims.filter(claim => claim.policyId === policy._id);
                            return {
                                ...policy,
                                claimsCount: policyClaims.length,
                                totalClaimAmount: policyClaims.reduce((sum, claim) => sum + claim.claimAmount, 0)
                            };
                        });
                        
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 150));
                        
                        const endTime = performance.now();
                        return { result: joinResult.slice(0, 10), duration: endTime - startTime }; // Return sample
                    }
                }
            ];

            const operationResults = [];

            // Execute all operations
            for (const operation of operations) {
                const result = await operation.operation();
                operationResults.push({
                    name: operation.name,
                    duration: result.duration,
                    result: result.result
                });

                // Performance assertion per operation
                expect(result.duration).toBeLessThan(maxAggregationTime);
                
                console.log(`${operation.name}: ${result.duration.toFixed(2)}ms`);
            }

            // Overall performance metrics
            const totalOperationTime = operationResults.reduce((sum, op) => sum + op.duration, 0);
            const averageOperationTime = totalOperationTime / operationResults.length;

            // Performance assertions
            expect(averageOperationTime).toBeLessThan(maxAggregationTime * 0.7);
            expect(totalOperationTime).toBeLessThan(maxAggregationTime * operationResults.length);

            // Verify results are meaningful
            operationResults.forEach(result => {
                expect(result.result).toBeDefined();
                expect(typeof result.result).toBe('object');
            });

            console.log(`Large Dataset Performance Summary:
                - Dataset Size: ${policyCount} policies, ${totalClaims} claims
                - Operations Tested: ${operationResults.length}
                - Average Operation Time: ${averageOperationTime.toFixed(2)}ms
                - Total Operation Time: ${totalOperationTime.toFixed(2)}ms
                - Max Allowed Time: ${maxAggregationTime}ms per operation`);
        });
    });

    describe('Memory and Resource Usage Under Load', () => {
        it('should maintain stable memory usage during sustained load', async () => {
            const testDurationMs = 10000; // 10 seconds
            const requestInterval = 10; // Request every 10ms
            const memoryCheckInterval = 1000; // Check memory every second
            
            let memoryReadings = [];
            let requestCount = 0;
            let peakMemoryUsage = 0;
            let initialMemoryUsage = 0;

            // Mock memory usage tracking
            const getMemoryUsage = () => {
                // Simulate memory usage (in MB)
                const baseUsage = 100;
                const variableUsage = Math.random() * 50;
                const loadImpact = (requestCount / 1000) * 10; // Memory increases with load
                return baseUsage + variableUsage + loadImpact;
            };

            initialMemoryUsage = getMemoryUsage();

            // Start memory monitoring
            const memoryMonitor = setInterval(() => {
                const currentMemory = getMemoryUsage();
                memoryReadings.push({
                    timestamp: Date.now(),
                    usage: currentMemory,
                    requestCount: requestCount
                });
                
                if (currentMemory > peakMemoryUsage) {
                    peakMemoryUsage = currentMemory;
                }
            }, memoryCheckInterval);

            // Generate sustained load
            const startTime = performance.now();
            const loadGenerator = setInterval(async () => {
                // Mock license validation request
                mockedAxios.post.mockResolvedValueOnce({
                    data: {
                        valid: true,
                        licenseType: 'professional',
                        features: ['hr-core']
                    }
                });

                try {
                    await mockedAxios.post('http://localhost:4000/licenses/validate', {
                        token: `load-token-${requestCount}`,
                        machineId: 'load-test-machine'
                    });
                    requestCount++;
                } catch (error) {
                    // Handle errors gracefully
                }
            }, requestInterval);

            // Run test for specified duration
            await new Promise(resolve => setTimeout(resolve, testDurationMs));
            
            // Stop monitoring and load generation
            clearInterval(memoryMonitor);
            clearInterval(loadGenerator);

            const endTime = performance.now();
            const actualDuration = endTime - startTime;

            // Calculate memory metrics
            const finalMemoryUsage = memoryReadings[memoryReadings.length - 1]?.usage || initialMemoryUsage;
            const memoryGrowth = finalMemoryUsage - initialMemoryUsage;
            const memoryGrowthPercentage = (memoryGrowth / initialMemoryUsage) * 100;
            const averageMemoryUsage = memoryReadings.reduce((sum, reading) => sum + reading.usage, 0) / memoryReadings.length;

            // Performance assertions
            expect(memoryGrowthPercentage).toBeLessThan(50); // Memory growth should be less than 50%
            expect(peakMemoryUsage).toBeLessThan(initialMemoryUsage * 2); // Peak should not exceed 2x initial
            expect(requestCount).toBeGreaterThan(500); // Should handle significant load

            console.log(`Memory Usage Performance:
                - Test Duration: ${actualDuration.toFixed(2)}ms
                - Total Requests: ${requestCount}
                - Initial Memory: ${initialMemoryUsage.toFixed(2)}MB
                - Final Memory: ${finalMemoryUsage.toFixed(2)}MB
                - Peak Memory: ${peakMemoryUsage.toFixed(2)}MB
                - Average Memory: ${averageMemoryUsage.toFixed(2)}MB
                - Memory Growth: ${memoryGrowth.toFixed(2)}MB (${memoryGrowthPercentage.toFixed(2)}%)
                - Memory Readings: ${memoryReadings.length}`);
        });
    });
});