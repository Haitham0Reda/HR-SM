// testing/services/licenseFileLoader.test.js
/**
 * Unit Tests for License File Loader Service
 * 
 * Tests file loading, parsing, invalid file handling, and hot-reload functionality
 * Requirements: 5.1, 5.3
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import licenseFileLoader from '../../services/licenseFileLoader.service.js';
import { generateSampleLicenseFile, generateLicenseSignature } from '../../config/licenseFileSchema.js';
import logger from '../../utils/logger.js';

describe('License File Loader - Unit Tests', () => {
    const testLicenseDir = path.join(process.cwd(), 'test-licenses-unit');
    let originalEnv;

    beforeAll(() => {
        // Save original environment
        originalEnv = {
            DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE,
            LICENSE_FILE_PATH: process.env.LICENSE_FILE_PATH,
            LICENSE_SECRET_KEY: process.env.LICENSE_SECRET_KEY
        };

        // Create test directory
        if (!fs.existsSync(testLicenseDir)) {
            fs.mkdirSync(testLicenseDir, { recursive: true });
        }

        // Set test environment
        process.env.DEPLOYMENT_MODE = 'on-premise';
        process.env.LICENSE_SECRET_KEY = 'test-secret-key-for-unit-tests';
    });

    beforeEach(() => {
        // Reset loader state before each test
        licenseFileLoader.currentLicense = null;
        licenseFileLoader.cachedLicense = null;
        licenseFileLoader.cacheTimestamp = null;
        licenseFileLoader.loadAttempts = 0;
        licenseFileLoader.lastLoadError = null;
        licenseFileLoader.isOnPremiseMode = true;
        licenseFileLoader.secretKey = process.env.LICENSE_SECRET_KEY;

        // Close any existing file watcher
        if (licenseFileLoader.fileWatcher) {
            licenseFileLoader.fileWatcher.close();
            licenseFileLoader.fileWatcher = null;
        }

        // Clear reload timeout
        if (licenseFileLoader.reloadTimeout) {
            clearTimeout(licenseFileLoader.reloadTimeout);
            licenseFileLoader.reloadTimeout = null;
        }
    });

    afterEach(() => {
        // Clean up test files
        if (fs.existsSync(testLicenseDir)) {
            const files = fs.readdirSync(testLicenseDir);
            files.forEach(file => {
                fs.unlinkSync(path.join(testLicenseDir, file));
            });
        }

        // Shutdown loader
        licenseFileLoader.shutdown();
    });

    afterAll(() => {
        // Remove test directory
        if (fs.existsSync(testLicenseDir)) {
            fs.rmdirSync(testLicenseDir);
        }

        // Restore original environment
        if (originalEnv.DEPLOYMENT_MODE) {
            process.env.DEPLOYMENT_MODE = originalEnv.DEPLOYMENT_MODE;
        } else {
            delete process.env.DEPLOYMENT_MODE;
        }

        if (originalEnv.LICENSE_FILE_PATH) {
            process.env.LICENSE_FILE_PATH = originalEnv.LICENSE_FILE_PATH;
        } else {
            delete process.env.LICENSE_FILE_PATH;
        }

        if (originalEnv.LICENSE_SECRET_KEY) {
            process.env.LICENSE_SECRET_KEY = originalEnv.LICENSE_SECRET_KEY;
        } else {
            delete process.env.LICENSE_SECRET_KEY;
        }
    });

    describe('File Loading and Parsing', () => {
        test('should successfully load a valid license file', async () => {
            // Arrange
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-1',
                companyName: 'Test Company',
                validityDays: 365,
                modules: {
                    'hr-core': { enabled: true, tier: 'enterprise', limits: {} },
                    'attendance': { enabled: true, tier: 'business', limits: { employees: 100 } }
                }
            }, process.env.LICENSE_SECRET_KEY);

            const testFilePath = path.join(testLicenseDir, 'valid-license.json');
            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;

            // Act
            const result = await licenseFileLoader.loadLicenseFile();

            // Assert
            expect(result).toBe(true);
            expect(licenseFileLoader.currentLicense).not.toBeNull();
            expect(licenseFileLoader.currentLicense.companyId).toBe('test-company-1');
            expect(licenseFileLoader.currentLicense.companyName).toBe('Test Company');
            expect(licenseFileLoader.lastLoadError).toBeNull();
        });

        test('should parse license file with all required fields', async () => {
            // Arrange
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-2',
                companyName: 'Another Test Company',
                validityDays: 180
            }, process.env.LICENSE_SECRET_KEY);

            const testFilePath = path.join(testLicenseDir, 'complete-license.json');
            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;

            // Act
            const result = await licenseFileLoader.loadLicenseFile();

            // Assert
            expect(result).toBe(true);
            expect(licenseFileLoader.currentLicense).toHaveProperty('licenseKey');
            expect(licenseFileLoader.currentLicense).toHaveProperty('companyId');
            expect(licenseFileLoader.currentLicense).toHaveProperty('companyName');
            expect(licenseFileLoader.currentLicense).toHaveProperty('issuedAt');
            expect(licenseFileLoader.currentLicense).toHaveProperty('expiresAt');
            expect(licenseFileLoader.currentLicense).toHaveProperty('modules');
            expect(licenseFileLoader.currentLicense).toHaveProperty('signature');
        });

        test('should cache license data after successful load', async () => {
            // Arrange
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-3',
                companyName: 'Cache Test Company',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            const testFilePath = path.join(testLicenseDir, 'cache-test-license.json');
            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;

            // Act
            await licenseFileLoader.loadLicenseFile();

            // Assert
            expect(licenseFileLoader.cachedLicense).not.toBeNull();
            expect(licenseFileLoader.cacheTimestamp).not.toBeNull();
            expect(licenseFileLoader.cachedLicense.companyId).toBe('test-company-3');
        });

        test('should increment load attempts counter', async () => {
            // Arrange
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-4',
                companyName: 'Load Attempts Test',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            const testFilePath = path.join(testLicenseDir, 'load-attempts-license.json');
            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;
            licenseFileLoader.loadAttempts = 0;

            // Act
            await licenseFileLoader.loadLicenseFile();
            await licenseFileLoader.loadLicenseFile();

            // Assert
            expect(licenseFileLoader.loadAttempts).toBe(2);
        });
    });

    describe('Invalid File Handling', () => {
        test('should fail when license file does not exist', async () => {
            // Arrange
            const nonExistentPath = path.join(testLicenseDir, 'non-existent-license.json');
            licenseFileLoader.licenseFilePath = nonExistentPath;

            // Act
            const result = await licenseFileLoader.loadLicenseFile();

            // Assert
            expect(result).toBe(false);
            expect(licenseFileLoader.lastLoadError).toBe('License file not found');
            expect(licenseFileLoader.currentLicense).toBeNull();
        });

        test('should fail when license file contains invalid JSON', async () => {
            // Arrange
            const testFilePath = path.join(testLicenseDir, 'invalid-json-license.json');
            fs.writeFileSync(testFilePath, '{ invalid json content }');

            licenseFileLoader.licenseFilePath = testFilePath;

            // Act
            const result = await licenseFileLoader.loadLicenseFile();

            // Assert
            expect(result).toBe(false);
            expect(licenseFileLoader.lastLoadError).toContain('Failed to parse');
            expect(licenseFileLoader.currentLicense).toBeNull();
        });

        test('should fail when license file is missing required fields', async () => {
            // Arrange
            const incompleteLicense = {
                licenseKey: 'HRMS-TEST-1234-ABCD',
                companyId: 'test-company'
                // Missing other required fields
            };

            const testFilePath = path.join(testLicenseDir, 'incomplete-license.json');
            fs.writeFileSync(testFilePath, JSON.stringify(incompleteLicense));

            licenseFileLoader.licenseFilePath = testFilePath;

            // Act
            const result = await licenseFileLoader.loadLicenseFile();

            // Assert
            expect(result).toBe(false);
            expect(licenseFileLoader.lastLoadError).toBeTruthy();
            expect(licenseFileLoader.currentLicense).toBeNull();
        });

        test('should fail when license signature is invalid', async () => {
            // Arrange
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-5',
                companyName: 'Invalid Signature Test',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            // Tamper with the signature
            licenseData.signature = 'invalid-signature-hash';

            const testFilePath = path.join(testLicenseDir, 'invalid-signature-license.json');
            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;

            // Act
            const result = await licenseFileLoader.loadLicenseFile();

            // Assert
            expect(result).toBe(false);
            expect(licenseFileLoader.lastLoadError).toBe('Invalid license signature');
            expect(licenseFileLoader.currentLicense).toBeNull();
        });

        test('should fail to load expired license', async () => {
            // Arrange
            const expiredDate = new Date();
            expiredDate.setDate(expiredDate.getDate() - 30); // 30 days ago

            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-6',
                companyName: 'Expired License Test',
                validityDays: -30 // Expired 30 days ago
            }, process.env.LICENSE_SECRET_KEY);

            const testFilePath = path.join(testLicenseDir, 'expired-license.json');
            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;

            // Act
            const result = await licenseFileLoader.loadLicenseFile();

            // Assert
            // parseLicenseFile returns valid: false for expired licenses
            expect(result).toBe(false);
            expect(licenseFileLoader.lastLoadError).toContain('License has expired');
        });

        test('should fail when license key format is invalid', async () => {
            // Arrange
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-7',
                companyName: 'Invalid Key Format Test',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            // Change license key to invalid format
            licenseData.licenseKey = 'INVALID-KEY-FORMAT';
            // Regenerate signature with the invalid key
            licenseData.signature = generateLicenseSignature(licenseData, process.env.LICENSE_SECRET_KEY);

            const testFilePath = path.join(testLicenseDir, 'invalid-key-format-license.json');
            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;

            // Act
            const result = await licenseFileLoader.loadLicenseFile();

            // Assert
            expect(result).toBe(false);
            expect(licenseFileLoader.lastLoadError).toContain('Invalid license key format');
        });
    });

    describe('Hot-Reload Functionality', () => {
        test('should set up file watcher when setupFileWatcher is called', () => {
            // Arrange
            const testFilePath = path.join(testLicenseDir, 'watch-test-license.json');
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-8',
                companyName: 'Watch Test Company',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));
            licenseFileLoader.licenseFilePath = testFilePath;

            // Act
            licenseFileLoader.setupFileWatcher();

            // Assert
            expect(licenseFileLoader.fileWatcher).not.toBeNull();
        });

        test('should not create duplicate file watchers', () => {
            // Arrange
            const testFilePath = path.join(testLicenseDir, 'duplicate-watch-test.json');
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-9',
                companyName: 'Duplicate Watch Test',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));
            licenseFileLoader.licenseFilePath = testFilePath;

            // Act
            licenseFileLoader.setupFileWatcher();
            const firstWatcher = licenseFileLoader.fileWatcher;
            licenseFileLoader.setupFileWatcher();
            const secondWatcher = licenseFileLoader.fileWatcher;

            // Assert
            expect(firstWatcher).toBe(secondWatcher);
        });

        test('should reload license when file changes', async () => {
            // Arrange
            const testFilePath = path.join(testLicenseDir, 'reload-test-license.json');
            const initialLicense = generateSampleLicenseFile({
                companyId: 'test-company-10',
                companyName: 'Initial Company',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            fs.writeFileSync(testFilePath, JSON.stringify(initialLicense, null, 2));
            licenseFileLoader.licenseFilePath = testFilePath;

            await licenseFileLoader.loadLicenseFile();
            licenseFileLoader.setupFileWatcher();

            // Act - Update the license file
            const updatedLicense = generateSampleLicenseFile({
                companyId: 'test-company-10',
                companyName: 'Updated Company',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            fs.writeFileSync(testFilePath, JSON.stringify(updatedLicense, null, 2));

            // Wait for file watcher to detect change and reload (with debounce)
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Assert
            expect(licenseFileLoader.currentLicense.companyName).toBe('Updated Company');
        });

        test('should close file watcher on shutdown', () => {
            // Arrange
            const testFilePath = path.join(testLicenseDir, 'shutdown-test-license.json');
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-11',
                companyName: 'Shutdown Test',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));
            licenseFileLoader.licenseFilePath = testFilePath;

            licenseFileLoader.setupFileWatcher();
            expect(licenseFileLoader.fileWatcher).not.toBeNull();

            // Act
            licenseFileLoader.shutdown();

            // Assert
            expect(licenseFileLoader.fileWatcher).toBeNull();
        });
    });

    describe('Cache and Grace Period', () => {
        test('should use cached license within grace period when current license unavailable', async () => {
            // Arrange
            const testFilePath = path.join(testLicenseDir, 'cache-grace-test.json');
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-12',
                companyName: 'Cache Grace Test',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));
            licenseFileLoader.licenseFilePath = testFilePath;

            // Load license successfully
            await licenseFileLoader.loadLicenseFile();
            expect(licenseFileLoader.cachedLicense).not.toBeNull();

            // Simulate current license becoming unavailable
            licenseFileLoader.currentLicense = null;

            // Act
            const license = licenseFileLoader.getLicense();

            // Assert
            expect(license).not.toBeNull();
            expect(license.companyId).toBe('test-company-12');
        });

        test('should not use cached license after grace period expires', async () => {
            // Arrange
            const testFilePath = path.join(testLicenseDir, 'expired-cache-test.json');
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-13',
                companyName: 'Expired Cache Test',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));
            licenseFileLoader.licenseFilePath = testFilePath;

            // Load license successfully
            await licenseFileLoader.loadLicenseFile();

            // Simulate cache timestamp being older than grace period
            licenseFileLoader.cacheTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
            licenseFileLoader.currentLicense = null;

            // Act
            const license = licenseFileLoader.getLicense();

            // Assert
            expect(license).toBeNull();
        });

        test('should report correct cache status', async () => {
            // Arrange
            const testFilePath = path.join(testLicenseDir, 'cache-status-test.json');
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-14',
                companyName: 'Cache Status Test',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));
            licenseFileLoader.licenseFilePath = testFilePath;

            // Act
            await licenseFileLoader.loadLicenseFile();
            const cacheStatus = licenseFileLoader.getCacheStatus();

            // Assert
            expect(cacheStatus.hasCachedLicense).toBe(true);
            expect(cacheStatus.cacheTimestamp).not.toBeNull();
            expect(cacheStatus.canUseCached).toBe(true);
            expect(cacheStatus.gracePeriod).toBe(24 * 60 * 60 * 1000);
        });
    });

    describe('Module Access Methods', () => {
        test('should correctly identify enabled modules', async () => {
            // Arrange
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-15',
                companyName: 'Module Access Test',
                validityDays: 365,
                modules: {
                    'hr-core': { enabled: true, tier: 'enterprise', limits: {} },
                    'attendance': { enabled: true, tier: 'business', limits: { employees: 100 } },
                    'payroll': { enabled: false, tier: 'starter', limits: { employees: 50 } }
                }
            }, process.env.LICENSE_SECRET_KEY);

            const testFilePath = path.join(testLicenseDir, 'module-access-test.json');
            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;
            await licenseFileLoader.loadLicenseFile();

            // Act & Assert
            expect(licenseFileLoader.isModuleEnabled('hr-core')).toBe(true);
            expect(licenseFileLoader.isModuleEnabled('attendance')).toBe(true);
            expect(licenseFileLoader.isModuleEnabled('payroll')).toBe(false);
        });

        test('should always return true for hr-core module', () => {
            // Arrange - No license loaded
            licenseFileLoader.currentLicense = null;
            licenseFileLoader.cachedLicense = null;

            // Act & Assert
            expect(licenseFileLoader.isModuleEnabled('hr-core')).toBe(true);
        });

        test('should return module license details', async () => {
            // Arrange
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-16',
                companyName: 'Module Details Test',
                validityDays: 365,
                modules: {
                    'attendance': {
                        enabled: true,
                        tier: 'business',
                        limits: { employees: 200, devices: 10 }
                    }
                }
            }, process.env.LICENSE_SECRET_KEY);

            const testFilePath = path.join(testLicenseDir, 'module-details-test.json');
            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;
            await licenseFileLoader.loadLicenseFile();

            // Act
            const moduleLicense = licenseFileLoader.getModuleLicense('attendance');

            // Assert
            expect(moduleLicense).not.toBeNull();
            expect(moduleLicense.enabled).toBe(true);
            expect(moduleLicense.tier).toBe('business');
            expect(moduleLicense.limits.employees).toBe(200);
            expect(moduleLicense.limits.devices).toBe(10);
        });

        test('should return all enabled modules', async () => {
            // Arrange
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-17',
                companyName: 'Enabled Modules Test',
                validityDays: 365,
                modules: {
                    'hr-core': { enabled: true, tier: 'enterprise', limits: {} },
                    'attendance': { enabled: true, tier: 'business', limits: {} },
                    'leave': { enabled: true, tier: 'business', limits: {} },
                    'payroll': { enabled: false, tier: 'starter', limits: {} }
                }
            }, process.env.LICENSE_SECRET_KEY);

            const testFilePath = path.join(testLicenseDir, 'enabled-modules-test.json');
            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;
            await licenseFileLoader.loadLicenseFile();

            // Act
            const enabledModules = licenseFileLoader.getEnabledModules();

            // Assert
            expect(enabledModules).toContain('hr-core');
            expect(enabledModules).toContain('attendance');
            expect(enabledModules).toContain('leave');
            expect(enabledModules).not.toContain('payroll');
        });
    });

    describe('Status and Diagnostics', () => {
        test('should return comprehensive loader status', async () => {
            // Arrange
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-18',
                companyName: 'Status Test',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            const testFilePath = path.join(testLicenseDir, 'status-test.json');
            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;
            await licenseFileLoader.loadLicenseFile();

            // Act
            const status = licenseFileLoader.getStatus();

            // Assert
            expect(status.isOnPremiseMode).toBe(true);
            expect(status.licenseFilePath).toBe(testFilePath);
            expect(status.hasCurrentLicense).toBe(true);
            expect(status.isLicenseExpired).toBe(false);
            expect(status.loadAttempts).toBeGreaterThan(0);
            expect(status.lastLoadError).toBeNull();
            expect(status.enabledModules).toContain('hr-core');
        });

        test('should calculate days until expiration correctly', async () => {
            // Arrange
            const licenseData = generateSampleLicenseFile({
                companyId: 'test-company-19',
                companyName: 'Expiration Days Test',
                validityDays: 30
            }, process.env.LICENSE_SECRET_KEY);

            const testFilePath = path.join(testLicenseDir, 'expiration-days-test.json');
            fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;
            await licenseFileLoader.loadLicenseFile();

            // Act
            const daysUntilExpiration = licenseFileLoader.getDaysUntilExpiration();

            // Assert
            expect(daysUntilExpiration).toBeGreaterThan(0);
            expect(daysUntilExpiration).toBeLessThanOrEqual(31);
        });

        test('should support manual reload', async () => {
            // Arrange
            const initialLicense = generateSampleLicenseFile({
                companyId: 'test-company-20',
                companyName: 'Manual Reload Initial',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            const testFilePath = path.join(testLicenseDir, 'manual-reload-test.json');
            fs.writeFileSync(testFilePath, JSON.stringify(initialLicense, null, 2));

            licenseFileLoader.licenseFilePath = testFilePath;
            await licenseFileLoader.loadLicenseFile();

            expect(licenseFileLoader.currentLicense.companyName).toBe('Manual Reload Initial');

            // Update the file
            const updatedLicense = generateSampleLicenseFile({
                companyId: 'test-company-20',
                companyName: 'Manual Reload Updated',
                validityDays: 365
            }, process.env.LICENSE_SECRET_KEY);

            fs.writeFileSync(testFilePath, JSON.stringify(updatedLicense, null, 2));

            // Act
            const reloadResult = await licenseFileLoader.reload();

            // Assert
            expect(reloadResult).toBe(true);
            expect(licenseFileLoader.currentLicense.companyName).toBe('Manual Reload Updated');
        });
    });
});
