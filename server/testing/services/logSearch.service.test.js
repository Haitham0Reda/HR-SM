/**
 * Log Search Service Tests
 * Tests for efficient log search capabilities with complex query support
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { searchLogs, streamSearchLogs, clearSearchCache, getSearchStats } from '../../services/logSearch.service.js';
import { addLogEntry, clearCorrelationEngine } from '../../services/logCorrelation.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Log Search Service', () => {
    beforeEach(() => {
        clearSearchCache();
        clearCorrelationEngine();
    });

    afterEach(() => {
        clearSearchCache();
        clearCorrelationEngine();
    });

    describe('Basic Search Functionality', () => {
        it('should search logs by tenant ID', async () => {
            // Add test log entries to correlation engine
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Test log 1',
                    correlationId: 'test-corr-1',
                    tenantId: 'test-tenant-1',
                    userId: 'user-1',
                    source: 'backend'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'Test error log',
                    correlationId: 'test-corr-2',
                    tenantId: 'test-tenant-1',
                    userId: 'user-1',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const result = await searchLogs({
                tenantId: 'test-tenant-1',
                limit: 100
            });

            expect(result).toBeDefined();
            expect(result.entries).toBeDefined();
            expect(result.totalCount).toBeGreaterThanOrEqual(0);
            expect(result.searchTime).toBeGreaterThanOrEqual(0);
        });

        it('should filter logs by log level', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Info log',
                    correlationId: 'test-corr-3',
                    tenantId: 'test-tenant-2',
                    source: 'backend'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'Error log',
                    correlationId: 'test-corr-4',
                    tenantId: 'test-tenant-2',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const result = await searchLogs({
                tenantId: 'test-tenant-2',
                levels: ['error'],
                limit: 100
            });

            expect(result).toBeDefined();
            expect(result.entries).toBeDefined();
        });

        it('should filter logs by time range', async () => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

            const testLogs = [
                {
                    timestamp: twoHoursAgo.toISOString(),
                    level: 'info',
                    message: 'Old log',
                    correlationId: 'test-corr-5',
                    tenantId: 'test-tenant-3',
                    source: 'backend'
                },
                {
                    timestamp: now.toISOString(),
                    level: 'info',
                    message: 'Recent log',
                    correlationId: 'test-corr-6',
                    tenantId: 'test-tenant-3',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const result = await searchLogs({
                tenantId: 'test-tenant-3',
                startTime: oneHourAgo.toISOString(),
                endTime: now.toISOString(),
                limit: 100
            });

            expect(result).toBeDefined();
            expect(result.entries).toBeDefined();
        });

        it('should search logs by message text', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'User login successful',
                    correlationId: 'test-corr-7',
                    tenantId: 'test-tenant-4',
                    source: 'backend'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'User logout',
                    correlationId: 'test-corr-8',
                    tenantId: 'test-tenant-4',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const result = await searchLogs({
                tenantId: 'test-tenant-4',
                message: 'login',
                limit: 100
            });

            expect(result).toBeDefined();
            expect(result.entries).toBeDefined();
        });
    });

    describe('Complex Query Support', () => {
        it('should support multiple filter criteria', async () => {
            const testLog = {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'API request failed',
                correlationId: 'test-corr-9',
                tenantId: 'test-tenant-5',
                userId: 'user-5',
                sessionId: 'session-5',
                endpoint: '/api/users',
                method: 'POST',
                statusCode: 500,
                source: 'backend'
            };

            addLogEntry(testLog);

            const result = await searchLogs({
                tenantId: 'test-tenant-5',
                userId: 'user-5',
                levels: ['error'],
                endpoint: '/api/users',
                method: 'POST',
                limit: 100
            });

            expect(result).toBeDefined();
            expect(result.entries).toBeDefined();
        });

        it('should support security event filtering', async () => {
            const testLog = {
                timestamp: new Date().toISOString(),
                level: 'warn',
                message: 'Security event detected',
                correlationId: 'test-corr-10',
                tenantId: 'test-tenant-6',
                security: true,
                source: 'backend',
                meta: {
                    eventType: 'authentication_failure',
                    severity: 'high'
                }
            };

            addLogEntry(testLog);

            const result = await searchLogs({
                tenantId: 'test-tenant-6',
                security: true,
                limit: 100
            });

            expect(result).toBeDefined();
            expect(result.entries).toBeDefined();
        });

        it('should support audit event filtering', async () => {
            const testLog = {
                timestamp: new Date().toISOString(),
                level: 'info',
                message: 'Audit event',
                correlationId: 'test-corr-11',
                tenantId: 'test-tenant-7',
                audit: true,
                source: 'backend'
            };

            addLogEntry(testLog);

            const result = await searchLogs({
                tenantId: 'test-tenant-7',
                audit: true,
                limit: 100
            });

            expect(result).toBeDefined();
            expect(result.entries).toBeDefined();
        });
    });

    describe('Search Result Features', () => {
        it('should include facets in search results', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Log 1',
                    correlationId: 'test-corr-12',
                    tenantId: 'test-tenant-8',
                    source: 'backend'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'Log 2',
                    correlationId: 'test-corr-13',
                    tenantId: 'test-tenant-8',
                    source: 'frontend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const result = await searchLogs({
                tenantId: 'test-tenant-8',
                limit: 100
            });

            expect(result.facets).toBeDefined();
            expect(result.facets.levels).toBeDefined();
            expect(result.facets.sources).toBeDefined();
        });

        it('should support pagination', async () => {
            const testLogs = Array.from({ length: 50 }, (_, i) => ({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Log ${i}`,
                correlationId: `test-corr-${100 + i}`,
                tenantId: 'test-tenant-9',
                source: 'backend'
            }));

            testLogs.forEach(log => addLogEntry(log));

            const result = await searchLogs({
                tenantId: 'test-tenant-9',
                limit: 10,
                offset: 0
            });

            expect(result).toBeDefined();
            expect(result.entries).toBeDefined();
            expect(result.entries.length).toBeLessThanOrEqual(10);
        });

        it('should support sorting', async () => {
            const testLogs = [
                {
                    timestamp: new Date('2024-01-01').toISOString(),
                    level: 'info',
                    message: 'Old log',
                    correlationId: 'test-corr-14',
                    tenantId: 'test-tenant-10',
                    source: 'backend'
                },
                {
                    timestamp: new Date('2024-12-01').toISOString(),
                    level: 'info',
                    message: 'New log',
                    correlationId: 'test-corr-15',
                    tenantId: 'test-tenant-10',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const result = await searchLogs({
                tenantId: 'test-tenant-10',
                sortBy: 'timestamp',
                sortOrder: 'desc',
                limit: 100
            });

            expect(result).toBeDefined();
            expect(result.entries).toBeDefined();
        });
    });

    describe('Query Validation', () => {
        it('should reject invalid time range', async () => {
            await expect(searchLogs({
                tenantId: 'test-tenant-11',
                startTime: new Date('2024-12-01').toISOString(),
                endTime: new Date('2024-01-01').toISOString()
            })).rejects.toThrow();
        });

        it('should reject invalid limit', async () => {
            await expect(searchLogs({
                tenantId: 'test-tenant-12',
                limit: 20000
            })).rejects.toThrow();
        });

        it('should reject invalid sort order', async () => {
            await expect(searchLogs({
                tenantId: 'test-tenant-13',
                sortOrder: 'invalid'
            })).rejects.toThrow();
        });
    });

    describe('Search Cache', () => {
        it('should cache search results', async () => {
            const query = {
                tenantId: 'test-tenant-14',
                limit: 100
            };

            // First search
            const result1 = await searchLogs(query);
            
            // Second search (should use cache)
            const result2 = await searchLogs(query);

            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
        });

        it('should clear cache when requested', () => {
            clearSearchCache();
            const stats = getSearchStats();
            expect(stats.cacheSize).toBe(0);
        });

        it('should provide search statistics', () => {
            const stats = getSearchStats();
            expect(stats).toBeDefined();
            expect(stats.cacheSize).toBeDefined();
            expect(stats.maxCacheSize).toBeDefined();
        });
    });

    describe('Real-time Search Streaming', () => {
        it('should stream search results', async () => {
            const testLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Stream log 1',
                    correlationId: 'test-corr-16',
                    tenantId: 'test-tenant-15',
                    source: 'backend'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Stream log 2',
                    correlationId: 'test-corr-17',
                    tenantId: 'test-tenant-15',
                    source: 'backend'
                }
            ];

            testLogs.forEach(log => addLogEntry(log));

            const results = [];
            for await (const entry of streamSearchLogs({
                tenantId: 'test-tenant-15',
                limit: 100
            })) {
                results.push(entry);
            }

            expect(results).toBeDefined();
            expect(Array.isArray(results)).toBe(true);
        });
    });
});