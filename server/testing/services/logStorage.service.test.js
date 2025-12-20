/**
 * Tests for Log Storage Service
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    LOG_TYPES,
    PLATFORM_LOG_TYPES,
    createCompanyDirectoryStructure,
    createPlatformDirectoryStructure,
    getLogFilePath,
    getPlatformLogFilePath,
    compressLogFile,
    getCompanyStorageStats,
    getPlatformStorageStats,
    validateLogIntegrity,
    generateIntegrityHash
} from '../../services/logStorage.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test directories
const testLogsDir = path.join(__dirname, '../../../logs/test');
const testCompanyLogsDir = path.join(testLogsDir, 'companies');
const testPlatformLogsDir = path.join(testLogsDir, 'platform');

describe('Log Storage Service', () => {
    beforeAll(() => {
        // Create test directories
        if (!fs.existsSync(testLogsDir)) {
            fs.mkdirSync(testLogsDir, { recursive: true });
        }
        if (!fs.existsSync(testCompanyLogsDir)) {
            fs.mkdirSync(testCompanyLogsDir, { recursive: true });
        }
        if (!fs.existsSync(testPlatformLogsDir)) {
            fs.mkdirSync(testPlatformLogsDir, { recursive: true });
        }
    });

    afterAll(() => {
        // Clean up test directories
        if (fs.existsSync(testLogsDir)) {
            fs.rmSync(testLogsDir, { recursive: true, force: true });
        }
    });

    describe('LOG_TYPES configuration', () => {
        test('should have all required log types', () => {
            expect(LOG_TYPES).toHaveProperty('APPLICATION');
            expect(LOG_TYPES).toHaveProperty('ERROR');
            expect(LOG_TYPES).toHaveProperty('AUDIT');
            expect(LOG_TYPES).toHaveProperty('SECURITY');
            expect(LOG_TYPES).toHaveProperty('PERFORMANCE');
            expect(LOG_TYPES).toHaveProperty('COMPLIANCE');
        });

        test('should have correct retention periods for compliance logs', () => {
            expect(LOG_TYPES.AUDIT.retention).toBe(2555); // 7 years
            expect(LOG_TYPES.SECURITY.retention).toBe(1825); // 5 years
            expect(LOG_TYPES.COMPLIANCE.retention).toBe(2555); // 7 years
        });

        test('should mark audit logs as immutable', () => {
            expect(LOG_TYPES.AUDIT.immutable).toBe(true);
            expect(LOG_TYPES.SECURITY.immutable).toBe(true);
            expect(LOG_TYPES.COMPLIANCE.immutable).toBe(true);
        });
    });

    describe('PLATFORM_LOG_TYPES configuration', () => {
        test('should have all required platform log types', () => {
            expect(PLATFORM_LOG_TYPES).toHaveProperty('PLATFORM');
            expect(PLATFORM_LOG_TYPES).toHaveProperty('PLATFORM_AUDIT');
            expect(PLATFORM_LOG_TYPES).toHaveProperty('PLATFORM_SECURITY');
            expect(PLATFORM_LOG_TYPES).toHaveProperty('PLATFORM_PERFORMANCE');
            expect(PLATFORM_LOG_TYPES).toHaveProperty('PLATFORM_ERROR');
        });

        test('should have extended retention for platform audit logs', () => {
            expect(PLATFORM_LOG_TYPES.PLATFORM_AUDIT.retention).toBe(2555); // 7 years
            expect(PLATFORM_LOG_TYPES.PLATFORM_SECURITY.retention).toBe(2555); // 7 years
        });
    });

    describe('createCompanyDirectoryStructure', () => {
        test('should create company directory with subdirectories', async () => {
            const tenantId = 'test-tenant-123';
            const companyName = 'Test Company';
            
            const companyDir = await createCompanyDirectoryStructure(tenantId, companyName);
            
            expect(fs.existsSync(companyDir)).toBe(true);
            expect(fs.existsSync(path.join(companyDir, 'audit'))).toBe(true);
            expect(fs.existsSync(path.join(companyDir, 'security'))).toBe(true);
            expect(fs.existsSync(path.join(companyDir, 'performance'))).toBe(true);
            expect(fs.existsSync(path.join(companyDir, 'compliance'))).toBe(true);
            expect(fs.existsSync(path.join(companyDir, 'archives'))).toBe(true);
        });

        test('should sanitize company name for directory', async () => {
            const tenantId = 'test-tenant-456';
            const companyName = 'Test Company @#$% Inc.';
            
            const companyDir = await createCompanyDirectoryStructure(tenantId, companyName);
            
            expect(companyDir).toMatch(/test_company_inc$/);
            expect(fs.existsSync(companyDir)).toBe(true);
        });
    });

    describe('createPlatformDirectoryStructure', () => {
        test('should create platform directory with subdirectories', async () => {
            const platformDir = await createPlatformDirectoryStructure();
            
            expect(fs.existsSync(platformDir)).toBe(true);
            expect(fs.existsSync(path.join(platformDir, 'audit'))).toBe(true);
            expect(fs.existsSync(path.join(platformDir, 'security'))).toBe(true);
            expect(fs.existsSync(path.join(platformDir, 'performance'))).toBe(true);
            expect(fs.existsSync(path.join(platformDir, 'compliance'))).toBe(true);
            expect(fs.existsSync(path.join(platformDir, 'archives'))).toBe(true);
        });
    });

    describe('getLogFilePath', () => {
        test('should generate correct path for application logs', () => {
            const tenantId = 'test-tenant';
            const companyName = 'test-company';
            const date = new Date('2023-12-01');
            
            const logPath = getLogFilePath('APPLICATION', tenantId, companyName, date);
            
            expect(logPath).toMatch(/test_company[\/\\]2023-12-01-application\.log$/);
        });

        test('should generate correct path for audit logs in subdirectory', () => {
            const tenantId = 'test-tenant';
            const companyName = 'test-company';
            const date = new Date('2023-12-01');
            
            const logPath = getLogFilePath('AUDIT', tenantId, companyName, date);
            
            expect(logPath).toMatch(/test_company[\/\\]audit[\/\\]2023-12-01-audit\.log$/);
        });

        test('should throw error for unknown log type', () => {
            expect(() => {
                getLogFilePath('UNKNOWN_TYPE', 'test-tenant');
            }).toThrow('Unknown log type: UNKNOWN_TYPE');
        });
    });

    describe('getPlatformLogFilePath', () => {
        test('should generate correct path for platform logs', () => {
            const date = new Date('2023-12-01');
            
            const logPath = getPlatformLogFilePath('PLATFORM', date);
            
            expect(logPath).toMatch(/platform[\/\\]2023-12-01-platform\.log$/);
        });

        test('should generate correct path for platform audit logs', () => {
            const date = new Date('2023-12-01');
            
            const logPath = getPlatformLogFilePath('PLATFORM_AUDIT', date);
            
            expect(logPath).toMatch(/platform[\/\\]audit[\/\\]2023-12-01-platform-audit\.log$/);
        });
    });

    describe('generateIntegrityHash', () => {
        test('should generate consistent hash for same content', () => {
            const content = 'test log content';
            
            const hash1 = generateIntegrityHash(content);
            const hash2 = generateIntegrityHash(content);
            
            expect(hash1).toBe(hash2);
            expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
        });

        test('should generate different hash for different content', () => {
            const content1 = 'test log content 1';
            const content2 = 'test log content 2';
            
            const hash1 = generateIntegrityHash(content1);
            const hash2 = generateIntegrityHash(content2);
            
            expect(hash1).not.toBe(hash2);
        });
    });

    describe('validateLogIntegrity', () => {
        test('should validate log file with valid entries', async () => {
            // Create a test log file with valid entries
            const testLogFile = path.join(testLogsDir, 'test-valid.log');
            const logEntries = [
                { message: 'Test entry 1', timestamp: '2023-12-01T10:00:00Z' },
                { message: 'Test entry 2', timestamp: '2023-12-01T10:01:00Z' }
            ];
            
            const logContent = logEntries.map(entry => JSON.stringify(entry)).join('\n');
            fs.writeFileSync(testLogFile, logContent);
            
            const result = await validateLogIntegrity(testLogFile);
            
            expect(result.valid).toBe(true);
            expect(result.totalEntries).toBe(2);
            expect(result.validEntries).toBe(2);
            expect(result.invalidEntries).toBe(0);
            
            // Clean up
            fs.unlinkSync(testLogFile);
        });

        test('should detect invalid JSON entries', async () => {
            // Create a test log file with invalid JSON
            const testLogFile = path.join(testLogsDir, 'test-invalid.log');
            const logContent = 'valid json entry\n{"valid": "json"}\ninvalid json entry';
            fs.writeFileSync(testLogFile, logContent);
            
            const result = await validateLogIntegrity(testLogFile);
            
            expect(result.valid).toBe(false);
            expect(result.totalEntries).toBe(3);
            expect(result.validEntries).toBe(1);
            expect(result.invalidEntries).toBe(2);
            
            // Clean up
            fs.unlinkSync(testLogFile);
        });
    });

    describe('compressLogFile', () => {
        test('should compress log file and remove original', async () => {
            // Create a test log file
            const testLogFile = path.join(testLogsDir, 'test-compress.log');
            const testContent = 'This is test log content that should be compressed';
            fs.writeFileSync(testLogFile, testContent);
            
            const compressedPath = await compressLogFile(testLogFile);
            
            expect(compressedPath).toBe(`${testLogFile}.gz`);
            expect(fs.existsSync(compressedPath)).toBe(true);
            expect(fs.existsSync(testLogFile)).toBe(false); // Original should be removed
            
            // Clean up
            if (fs.existsSync(compressedPath)) {
                fs.unlinkSync(compressedPath);
            }
        });

        test('should throw error for non-existent file', async () => {
            const nonExistentFile = path.join(testLogsDir, 'non-existent.log');
            
            await expect(compressLogFile(nonExistentFile)).rejects.toThrow();
        });
    });
});