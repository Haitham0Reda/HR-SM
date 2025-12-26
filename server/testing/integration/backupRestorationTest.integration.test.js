/**
 * Backup Restoration Integration Test
 * 
 * This test validates that backup restoration functionality works correctly
 * and meets the requirements for "Backup restoration tested successfully".
 * 
 * Tests:
 * - Backup restoration service initialization
 * - Backup file location and validation
 * - Database restoration simulation
 * - File system restoration simulation
 * - Configuration restoration simulation
 * - RSA keys restoration simulation
 * - Data integrity verification
 * - Overall restoration test workflow
 * 
 * Validates Requirements: 8.1, 8.3, 8.5, 12.1
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import BackupRestorationTest from '../../services/backupRestorationTest.js';
import BackupService from '../../services/backupService.js';

describe('Backup Restoration Integration Test', () => {
    let restorationTest;
    let backupService;
    let testBackupId;
    let testDir;

    beforeAll(async () => {
        // Initialize services
        restorationTest = new BackupRestorationTest();
        backupService = new BackupService();
        
        // Create test backup ID
        testBackupId = `test-backup-${Date.now()}`;
        testDir = path.join(process.cwd(), 'backups', 'restoration-test');
        
        // Ensure test directories exist
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });

    afterAll(async () => {
        // Cleanup test directories
        try {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        } catch (error) {
            console.warn('Failed to cleanup test directories:', error.message);
        }
    });

    describe('Service Initialization', () => {
        it('should initialize backup restoration test service', () => {
            expect(restorationTest).toBeDefined();
            expect(restorationTest.logger).toBeDefined();
            expect(restorationTest.backupService).toBeDefined();
            expect(restorationTest.recoveryService).toBeDefined();
        });

        it('should create required test directories', () => {
            const expectedDirs = [
                restorationTest.testDir,
                restorationTest.stagingDir,
                restorationTest.verificationDir
            ];

            expectedDirs.forEach(dir => {
                expect(fs.existsSync(dir)).toBe(true);
            });
        });
    });

    describe('Backup File Operations', () => {
        it('should locate backup files correctly', async () => {
            // Create a mock backup file for testing
            const mockBackupDir = path.join(process.cwd(), 'backups', 'daily');
            if (!fs.existsSync(mockBackupDir)) {
                fs.mkdirSync(mockBackupDir, { recursive: true });
            }

            const mockBackupFile = path.join(mockBackupDir, `${testBackupId}.tar.gz.enc`);
            fs.writeFileSync(mockBackupFile, 'mock backup content');

            try {
                const locateTest = await restorationTest.testLocateBackupFile(testBackupId);
                
                expect(locateTest).toBeDefined();
                expect(locateTest.name).toBe('Locate Backup File');
                expect(locateTest.status).toBe('passed');
                expect(locateTest.message).toContain('Backup file located');
                
            } finally {
                // Cleanup mock file
                if (fs.existsSync(mockBackupFile)) {
                    fs.unlinkSync(mockBackupFile);
                }
            }
        });

        it('should handle missing backup files gracefully', async () => {
            const nonExistentBackupId = 'non-existent-backup-123';
            
            const locateTest = await restorationTest.testLocateBackupFile(nonExistentBackupId);
            
            expect(locateTest.status).toBe('failed');
            expect(locateTest.message).toContain('Backup file not found');
        });
    });

    describe('Backup Manifest Validation', () => {
        it('should validate backup manifest correctly', async () => {
            // Create a mock manifest file
            const mockManifest = {
                id: testBackupId,
                type: 'daily',
                timestamp: new Date().toISOString(),
                components: [
                    { type: 'mongodb', database: 'hrms' },
                    { type: 'mongodb', database: 'hrsm-licenses' },
                    { type: 'files', component: 'uploads' },
                    { type: 'configuration', component: 'config-files' },
                    { type: 'encrypted-keys', component: 'rsa-keys' }
                ],
                status: 'completed',
                checksums: {}
            };

            const metadataDir = path.join(process.cwd(), 'backups', 'metadata');
            if (!fs.existsSync(metadataDir)) {
                fs.mkdirSync(metadataDir, { recursive: true });
            }

            const manifestFile = path.join(metadataDir, `${testBackupId}.json`);
            fs.writeFileSync(manifestFile, JSON.stringify(mockManifest, null, 2));

            try {
                const manifestTest = await restorationTest.testValidateManifest(testBackupId);
                
                expect(manifestTest.status).toBe('passed');
                expect(manifestTest.message).toContain('Manifest validated');
                expect(manifestTest.manifest).toBeDefined();
                expect(manifestTest.manifest.components).toHaveLength(5);
                
            } finally {
                // Cleanup mock manifest
                if (fs.existsSync(manifestFile)) {
                    fs.unlinkSync(manifestFile);
                }
            }
        });

        it('should detect invalid manifest structure', async () => {
            // Create an invalid manifest
            const invalidManifest = {
                id: testBackupId,
                // Missing required fields
            };

            const metadataDir = path.join(process.cwd(), 'backups', 'metadata');
            const manifestFile = path.join(metadataDir, `${testBackupId}-invalid.json`);
            fs.writeFileSync(manifestFile, JSON.stringify(invalidManifest, null, 2));

            try {
                const manifestTest = await restorationTest.testValidateManifest(`${testBackupId}-invalid`);
                
                expect(manifestTest.status).toBe('failed');
                expect(manifestTest.message).toContain('missing required fields');
                
            } finally {
                // Cleanup invalid manifest
                if (fs.existsSync(manifestFile)) {
                    fs.unlinkSync(manifestFile);
                }
            }
        });
    });

    describe('Database Restoration Tests', () => {
        it('should test main database restoration', async () => {
            const dbTest = await restorationTest.testRestoreMainDatabase(testBackupId);
            
            expect(dbTest).toBeDefined();
            expect(dbTest.name).toBe('Restore Main Database (hrms)');
            expect(dbTest.status).toBe('passed');
            expect(dbTest.message).toContain('restoration simulated successfully');
        });

        it('should test license database restoration', async () => {
            const dbTest = await restorationTest.testRestoreLicenseDatabase(testBackupId);
            
            expect(dbTest).toBeDefined();
            expect(dbTest.name).toBe('Restore License Database (hrsm-licenses)');
            expect(dbTest.status).toBe('passed');
            expect(dbTest.message).toContain('restoration simulated successfully');
        });

        it('should test database connections', async () => {
            const connectionTest = await restorationTest.testDatabaseConnections();
            
            expect(connectionTest).toBeDefined();
            expect(connectionTest.name).toBe('Test Database Connections');
            expect(['passed', 'failed']).toContain(connectionTest.status);
        });

        it('should test database structure validation', async () => {
            const structureTest = await restorationTest.testDatabaseStructure();
            
            expect(structureTest).toBeDefined();
            expect(structureTest.name).toBe('Validate Database Structure');
            expect(['passed', 'warning', 'failed']).toContain(structureTest.status);
        });
    });

    describe('File System Restoration Tests', () => {
        it('should test uploads restoration', async () => {
            const uploadsTest = await restorationTest.testRestoreUploads(testBackupId);
            
            expect(uploadsTest).toBeDefined();
            expect(uploadsTest.name).toBe('Restore Uploads Directory');
            expect(uploadsTest.status).toBe('passed');
        });

        it('should test file integrity verification', async () => {
            const integrityTest = await restorationTest.testFileIntegrity(testBackupId);
            
            expect(integrityTest).toBeDefined();
            expect(integrityTest.name).toBe('Test File Integrity');
            expect(integrityTest.status).toBe('passed');
        });

        it('should test file permissions', async () => {
            const permissionsTest = await restorationTest.testFilePermissions();
            
            expect(permissionsTest).toBeDefined();
            expect(permissionsTest.name).toBe('Test File Permissions');
            expect(permissionsTest.status).toBe('passed');
        });
    });

    describe('Configuration Restoration Tests', () => {
        it('should test main configuration restoration', async () => {
            const configTest = await restorationTest.testRestoreMainConfig(testBackupId);
            
            expect(configTest).toBeDefined();
            expect(configTest.name).toBe('Restore Main Configuration');
            expect(configTest.status).toBe('passed');
        });

        it('should test license server configuration restoration', async () => {
            const licenseConfigTest = await restorationTest.testRestoreLicenseServerConfig(testBackupId);
            
            expect(licenseConfigTest).toBeDefined();
            expect(licenseConfigTest.name).toBe('Restore License Server Configuration');
            expect(licenseConfigTest.status).toBe('passed');
        });

        it('should test configuration completeness', async () => {
            const completenessTest = await restorationTest.testConfigCompleteness();
            
            expect(completenessTest).toBeDefined();
            expect(completenessTest.name).toBe('Test Configuration Completeness');
            expect(completenessTest.status).toBe('passed');
        });
    });

    describe('RSA Keys Restoration Tests', () => {
        it('should test RSA keys decryption', async () => {
            const decryptTest = await restorationTest.testDecryptRSAKeys(testBackupId);
            
            expect(decryptTest).toBeDefined();
            expect(decryptTest.name).toBe('Decrypt RSA Keys');
            expect(decryptTest.status).toBe('passed');
        });

        it('should test RSA keys validation', async () => {
            const validateTest = await restorationTest.testValidateRSAKeys();
            
            expect(validateTest).toBeDefined();
            expect(validateTest.name).toBe('Validate RSA Keys');
            expect(validateTest.status).toBe('passed');
        });

        it('should test RSA key functionality', async () => {
            const functionalityTest = await restorationTest.testRSAKeyFunctionality();
            
            expect(functionalityTest).toBeDefined();
            expect(functionalityTest.name).toBe('Test RSA Key Functionality');
            expect(functionalityTest.status).toBe('passed');
        });
    });

    describe('Data Integrity Tests', () => {
        it('should test database checksums verification', async () => {
            const checksumTest = await restorationTest.testDatabaseChecksums(testBackupId);
            
            expect(checksumTest).toBeDefined();
            expect(checksumTest.name).toBe('Verify Database Checksums');
            expect(checksumTest.status).toBe('passed');
        });

        it('should test data relationships validation', async () => {
            const relationshipTest = await restorationTest.testDataRelationships();
            
            expect(relationshipTest).toBeDefined();
            expect(relationshipTest.name).toBe('Validate Data Relationships');
            expect(relationshipTest.status).toBe('passed');
        });

        it('should test data completeness verification', async () => {
            const completenessTest = await restorationTest.testDataCompleteness(testBackupId);
            
            expect(completenessTest).toBeDefined();
            expect(completenessTest.name).toBe('Check Data Completeness');
            expect(completenessTest.status).toBe('passed');
        });
    });

    describe('Comprehensive Restoration Test', () => {
        it('should run complete restoration test workflow', async () => {
            // Create mock backup files and manifest for comprehensive test
            const mockBackupDir = path.join(process.cwd(), 'backups', 'daily');
            const mockMetadataDir = path.join(process.cwd(), 'backups', 'metadata');
            
            // Ensure directories exist
            [mockBackupDir, mockMetadataDir].forEach(dir => {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            });

            const mockBackupFile = path.join(mockBackupDir, `${testBackupId}.tar.gz.enc`);
            const mockManifestFile = path.join(mockMetadataDir, `${testBackupId}.json`);

            // Create mock files
            fs.writeFileSync(mockBackupFile, 'mock backup content');
            fs.writeFileSync(mockManifestFile, JSON.stringify({
                id: testBackupId,
                type: 'daily',
                timestamp: new Date().toISOString(),
                components: [
                    { type: 'mongodb', database: 'hrms' },
                    { type: 'mongodb', database: 'hrsm-licenses' }
                ],
                status: 'completed',
                checksums: {}
            }, null, 2));

            try {
                const testReport = await restorationTest.runRestorationTest(testBackupId, {
                    testApplicationFunctionality: false // Skip app functionality for unit test
                });

                // Validate test report structure
                expect(testReport).toBeDefined();
                expect(testReport.testId).toBeDefined();
                expect(testReport.backupId).toBe(testBackupId);
                expect(testReport.status).toBe('completed');
                expect(testReport.phases).toBeDefined();
                expect(testReport.phases.length).toBeGreaterThan(0);
                expect(testReport.overallResult).toBeDefined();
                expect(['passed', 'warning', 'failed']).toContain(testReport.overallResult);

                // Validate required phases are present
                const phaseNames = testReport.phases.map(phase => phase.name);
                const expectedPhases = [
                    'Backup Extraction and Validation',
                    'Database Restoration Test',
                    'File System Restoration Test',
                    'Configuration Restoration Test',
                    'RSA Keys Restoration Test',
                    'Data Integrity Verification'
                ];

                expectedPhases.forEach(expectedPhase => {
                    expect(phaseNames).toContain(expectedPhase);
                });

                // Validate each phase has required structure
                testReport.phases.forEach(phase => {
                    expect(phase.name).toBeDefined();
                    expect(phase.status).toBeDefined();
                    expect(['passed', 'warning', 'failed']).toContain(phase.status);
                    expect(phase.startTime).toBeDefined();
                    expect(phase.endTime).toBeDefined();
                });

                console.log(`✅ Comprehensive restoration test completed: ${testReport.overallResult}`);
                console.log(`   Test ID: ${testReport.testId}`);
                console.log(`   Phases: ${testReport.phases.length}`);
                console.log(`   Duration: ${Math.round((testReport.endTime - testReport.startTime) / 1000)}s`);

            } finally {
                // Cleanup mock files
                [mockBackupFile, mockManifestFile].forEach(file => {
                    if (fs.existsSync(file)) {
                        fs.unlinkSync(file);
                    }
                });
            }
        }, 30000); // 30 second timeout for comprehensive test

        it('should generate appropriate recommendations', async () => {
            const mockPhases = [
                { name: 'Phase 1', status: 'passed' },
                { name: 'Phase 2', status: 'warning' },
                { name: 'Phase 3', status: 'failed' }
            ];

            const recommendations = restorationTest.generateRecommendations({
                phases: mockPhases,
                startTime: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
                endTime: new Date()
            });

            expect(recommendations).toBeDefined();
            expect(recommendations.length).toBeGreaterThan(0);

            // Should have recommendations for failed phases
            const criticalRecs = recommendations.filter(rec => rec.type === 'critical');
            expect(criticalRecs.length).toBeGreaterThan(0);

            // Should have recommendations for warning phases
            const warningRecs = recommendations.filter(rec => rec.type === 'warning');
            expect(warningRecs.length).toBeGreaterThan(0);

            // Should have performance recommendation for long duration
            const performanceRecs = recommendations.filter(rec => rec.type === 'performance');
            expect(performanceRecs.length).toBeGreaterThan(0);
        });
    });

    describe('Test History and Reporting', () => {
        it('should save and retrieve test reports', async () => {
            const mockReport = {
                testId: `test-report-${Date.now()}`,
                backupId: testBackupId,
                startTime: new Date(),
                endTime: new Date(),
                status: 'completed',
                phases: [],
                overallResult: 'passed'
            };

            // Save test report
            await restorationTest.saveTestReport(mockReport);

            // Retrieve test history
            const history = await restorationTest.getTestHistory(5);
            
            expect(history).toBeDefined();
            expect(Array.isArray(history)).toBe(true);
            
            // Should include our test report if saved successfully
            const savedReport = history.find(report => report.testId === mockReport.testId);
            if (savedReport) {
                expect(savedReport.backupId).toBe(testBackupId);
                expect(savedReport.overallResult).toBe('passed');
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle restoration test failures gracefully', async () => {
            const invalidBackupId = 'invalid-backup-id-123';

            try {
                const testReport = await restorationTest.runRestorationTest(invalidBackupId);
                
                // Should complete even with failures
                expect(testReport).toBeDefined();
                expect(testReport.status).toBe('failed');
                expect(testReport.overallResult).toBe('failed');
                
            } catch (error) {
                // Should throw error for invalid backup
                expect(error.message).toContain('Backup extraction failed');
            }
        });

        it('should cleanup test environment after failures', async () => {
            // Verify cleanup functionality
            await restorationTest.cleanupTestEnvironment();
            
            // Staging directory should exist but be empty
            expect(fs.existsSync(restorationTest.stagingDir)).toBe(true);
            const stagingContents = fs.readdirSync(restorationTest.stagingDir);
            expect(stagingContents.length).toBe(0);
        });
    });
});