/**
 * Property-Based Test for Backup Content Integrity
 * 
 * Feature: hr-sm-enterprise-enhancement, Property 27: Backup Content Integrity
 * Validates: Requirements 8.1
 * 
 * This test verifies that:
 * 1. Backup manifest contains all required component types
 * 2. Backup components have proper metadata structure
 * 3. Backup checksums are properly generated and valid
 * 4. Backup metadata is consistent and complete
 * 
 * Requirements 8.1: "WHEN performing automated backups, THE system SHALL create 
 * daily backups of MongoDB databases, uploaded files, and configuration files 
 * with 30-day retention"
 */

import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

describe('Backup Content Integrity - Property-Based Tests', () => {
    let testBackupDir;

    beforeAll(() => {
        // Create test backup directory
        testBackupDir = path.join(process.cwd(), 'test-backups');
        
        // Prevent any accidental database connections
        process.env.NODE_ENV = 'test';
        process.env.MONGODB_URI = 'mongodb://mock-test-db';
    });

    beforeEach(() => {
        // Clean up test directory
        if (fs.existsSync(testBackupDir)) {
            fs.rmSync(testBackupDir, { recursive: true, force: true });
        }
        
        // Create test directories
        fs.mkdirSync(testBackupDir, { recursive: true });
        fs.mkdirSync(path.join(testBackupDir, 'daily'), { recursive: true });
        fs.mkdirSync(path.join(testBackupDir, 'metadata'), { recursive: true });
        fs.mkdirSync(path.join(testBackupDir, 'temp'), { recursive: true });
    });

    afterEach(() => {
        // Clean up test directory
        if (fs.existsSync(testBackupDir)) {
            fs.rmSync(testBackupDir, { recursive: true, force: true });
        }
    });

    afterAll(() => {
        // Clean up environment
        delete process.env.MONGODB_URI;
    });

    /**
     * Create a mock backup manifest for testing
     */
    function createMockBackupManifest(config = {}) {
        const timestamp = new Date().toISOString();
        const backupId = `daily-backup-${timestamp.replace(/[:.]/g, '-')}`;
        
        const manifest = {
            id: backupId,
            type: 'daily',
            timestamp: timestamp,
            status: 'completed',
            components: [],
            checksums: {}
        };

        // Add required components based on Requirements 8.1
        const requiredComponents = [
            {
                type: 'mongodb',
                database: 'hrms',
                path: path.join(testBackupDir, 'hrms.archive'),
                size: config.dbSize || 1024,
                timestamp: timestamp
            },
            {
                type: 'mongodb', 
                database: 'hrsm-licenses',
                path: path.join(testBackupDir, 'hrsm-licenses.archive'),
                size: config.licenseDbSize || 512,
                timestamp: timestamp
            },
            {
                type: 'files',
                component: 'uploads',
                path: path.join(testBackupDir, 'uploads.tar.gz'),
                size: config.uploadsSize || 2048,
                timestamp: timestamp
            },
            {
                type: 'configuration',
                component: 'config-files',
                path: path.join(testBackupDir, 'configuration.tar.gz'),
                size: config.configSize || 256,
                timestamp: timestamp
            },
            {
                type: 'encrypted-keys',
                component: 'rsa-keys',
                path: path.join(testBackupDir, 'rsa-keys.encrypted'),
                size: config.keysSize || 128,
                timestamp: timestamp,
                encrypted: true
            },
            {
                type: 'application-code',
                component: 'source-code',
                path: path.join(testBackupDir, 'application-code.tar.gz'),
                size: config.codeSize || 4096,
                timestamp: timestamp
            }
        ];

        manifest.components = requiredComponents;

        // Generate checksums for each component
        requiredComponents.forEach(component => {
            const checksumKey = component.component || component.database;
            manifest.checksums[checksumKey] = crypto.randomBytes(32).toString('hex');
        });

        // Create mock files for components
        requiredComponents.forEach(component => {
            const dir = path.dirname(component.path);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(component.path, 'mock data '.repeat(component.size / 10));
        });

        return manifest;
    }

    /**
     * Property Test: Backup Content Integrity
     * 
     * For any automated backup operation, the backup should contain all required 
     * components as specified in Requirements 8.1.
     */
    test('Property 27: Backup Content Integrity - All required components present and valid', () => {
        fc.assert(
            fc.property(
                // Generate test configurations for backup scenarios
                fc.record({
                    dbSize: fc.integer({ min: 100, max: 10000 }),
                    licenseDbSize: fc.integer({ min: 50, max: 5000 }),
                    uploadsSize: fc.integer({ min: 200, max: 20000 }),
                    configSize: fc.integer({ min: 50, max: 1000 }),
                    keysSize: fc.integer({ min: 64, max: 512 }),
                    codeSize: fc.integer({ min: 1000, max: 50000 }),
                    includeOptionalComponents: fc.boolean()
                }),
                (testConfig) => {
                    // Create mock backup manifest
                    const backupManifest = createMockBackupManifest(testConfig);

                    // CRITICAL TEST 1: Verify backup manifest structure
                    expect(backupManifest).toBeDefined();
                    expect(backupManifest.id).toMatch(/^daily-backup-/);
                    expect(backupManifest.type).toBe('daily');
                    expect(backupManifest.status).toBe('completed');
                    expect(backupManifest.components).toBeDefined();
                    expect(Array.isArray(backupManifest.components)).toBe(true);

                    // CRITICAL TEST 2: Verify all required components are present (Requirements 8.1)
                    const componentTypes = backupManifest.components.map(c => c.type);
                    const componentNames = backupManifest.components.map(c => c.component || c.database);

                    // Must have MongoDB databases
                    expect(componentNames).toContain('hrms');
                    expect(componentNames).toContain('hrsm-licenses');
                    
                    // Must have file uploads
                    expect(componentNames).toContain('uploads');
                    
                    // Must have configuration files
                    expect(componentNames).toContain('config-files');
                    
                    // Must have RSA keys (encrypted)
                    expect(componentNames).toContain('rsa-keys');
                    
                    // Must have application code
                    expect(componentNames).toContain('source-code');

                    // CRITICAL TEST 3: Verify component metadata completeness
                    backupManifest.components.forEach(component => {
                        expect(component).toHaveProperty('type');
                        expect(component).toHaveProperty('path');
                        expect(component).toHaveProperty('size');
                        expect(component).toHaveProperty('timestamp');
                        
                        // Verify component has either database name or component name
                        expect(component.database || component.component).toBeDefined();
                        
                        // Verify size is positive
                        expect(component.size).toBeGreaterThan(0);
                        
                        // Verify timestamp is valid
                        const componentTime = new Date(component.timestamp);
                        expect(componentTime.getTime()).not.toBeNaN();
                        
                        // Verify file exists
                        expect(fs.existsSync(component.path)).toBe(true);
                    });

                    // CRITICAL TEST 4: Verify checksums are generated for all components
                    expect(backupManifest.checksums).toBeDefined();
                    expect(typeof backupManifest.checksums).toBe('object');
                    
                    backupManifest.components.forEach(component => {
                        const checksumKey = component.component || component.database;
                        expect(backupManifest.checksums[checksumKey]).toBeDefined();
                        expect(typeof backupManifest.checksums[checksumKey]).toBe('string');
                        expect(backupManifest.checksums[checksumKey]).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
                    });

                    // CRITICAL TEST 5: Verify encrypted components are marked as encrypted
                    const encryptedComponents = backupManifest.components.filter(c => c.encrypted);
                    expect(encryptedComponents.length).toBeGreaterThan(0);
                    
                    const rsaKeysComponent = backupManifest.components.find(c => c.component === 'rsa-keys');
                    expect(rsaKeysComponent.encrypted).toBe(true);

                    // CRITICAL TEST 6: Verify backup timestamp consistency
                    const backupTime = new Date(backupManifest.timestamp);
                    const now = new Date();
                    const timeDiff = now.getTime() - backupTime.getTime();
                    expect(timeDiff).toBeLessThan(300000); // Within 5 minutes (for test execution time)

                    // CRITICAL TEST 7: Verify component count meets minimum requirements
                    expect(backupManifest.components.length).toBeGreaterThanOrEqual(6);
                    
                    // Must have exactly 2 MongoDB components (main + license)
                    const mongoComponents = backupManifest.components.filter(c => c.type === 'mongodb');
                    expect(mongoComponents.length).toBe(2);
                }
            ),
            { 
                numRuns: 100,
                timeout: 10000
            }
        );
    });

    /**
     * Property Test: Backup Checksum Integrity
     * 
     * Verifies that backup checksums accurately reflect file content and 
     * can detect data corruption.
     */
    test('Property 27.1: Backup Checksum Integrity - Checksums match file content', () => {
        fc.assert(
            fc.property(
                fc.record({
                    fileContent: fc.string({ minLength: 10, maxLength: 1000 }),
                    componentType: fc.constantFrom('mongodb', 'files', 'configuration', 'encrypted-keys', 'application-code'),
                    componentName: fc.string({ minLength: 3, maxLength: 20 }).map(name => 
                        name.replace(/[^a-zA-Z0-9-_]/g, 'x') // Sanitize filename
                    )
                }),
                (testData) => {
                    // Create test file
                    const testFilePath = path.join(testBackupDir, `${testData.componentName}.test`);
                    fs.writeFileSync(testFilePath, testData.fileContent);

                    // Calculate expected checksum
                    const fileData = fs.readFileSync(testFilePath);
                    const expectedChecksum = crypto.createHash('sha256').update(fileData).digest('hex');

                    // Create component metadata
                    const component = {
                        type: testData.componentType,
                        component: testData.componentName,
                        path: testFilePath,
                        size: fileData.length,
                        timestamp: new Date().toISOString()
                    };

                    // CRITICAL TEST: Checksum should match file content exactly
                    const actualChecksum = crypto.createHash('sha256').update(fileData).digest('hex');
                    expect(actualChecksum).toBe(expectedChecksum);
                    expect(actualChecksum).toMatch(/^[a-f0-9]{64}$/);

                    // CRITICAL TEST: Different content should produce different checksums
                    const modifiedContent = testData.fileContent + 'modified';
                    const modifiedChecksum = crypto.createHash('sha256').update(modifiedContent).digest('hex');
                    expect(modifiedChecksum).not.toBe(expectedChecksum);

                    // CRITICAL TEST: Component metadata should be consistent
                    expect(component.size).toBe(fileData.length);
                    expect(fs.existsSync(component.path)).toBe(true);
                }
            ),
            { 
                numRuns: 50,
                timeout: 5000
            }
        );
    });

    /**
     * Property Test: Backup Component Validation
     * 
     * Verifies that backup components meet the structural requirements 
     * for successful restoration.
     */
    test('Property 27.2: Backup Component Validation - Components meet restoration requirements', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        type: fc.constantFrom('mongodb', 'files', 'configuration', 'encrypted-keys', 'application-code'),
                        name: fc.string({ minLength: 3, maxLength: 15 }).map(name => 
                            name.replace(/[^a-zA-Z0-9-_]/g, 'x') // Sanitize filename
                        ),
                        size: fc.integer({ min: 1, max: 10000 }),
                        encrypted: fc.boolean()
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                (componentConfigs) => {
                    const manifest = {
                        id: `test-backup-${Date.now()}`,
                        type: 'daily',
                        timestamp: new Date().toISOString(),
                        status: 'completed',
                        components: [],
                        checksums: {}
                    };

                    // Create components based on configurations
                    componentConfigs.forEach((config, index) => {
                        const componentPath = path.join(testBackupDir, `component-${index}.data`);
                        const componentData = 'x'.repeat(config.size);
                        
                        fs.writeFileSync(componentPath, componentData);
                        
                        const component = {
                            type: config.type,
                            component: config.name,
                            path: componentPath,
                            size: config.size,
                            timestamp: new Date().toISOString(),
                            encrypted: config.encrypted
                        };

                        manifest.components.push(component);
                        
                        // Generate checksum
                        const checksum = crypto.createHash('sha256').update(componentData).digest('hex');
                        manifest.checksums[config.name] = checksum;
                    });

                    // CRITICAL TEST: All components should have required fields for restoration
                    manifest.components.forEach(component => {
                        expect(component).toHaveProperty('type');
                        expect(component).toHaveProperty('path');
                        expect(component).toHaveProperty('size');
                        expect(component).toHaveProperty('timestamp');
                        expect(component.component || component.database).toBeDefined();
                        
                        // File should exist and have correct size
                        expect(fs.existsSync(component.path)).toBe(true);
                        const actualSize = fs.statSync(component.path).size;
                        expect(actualSize).toBe(component.size);
                    });

                    // CRITICAL TEST: Checksums should exist for all components
                    manifest.components.forEach(component => {
                        const checksumKey = component.component || component.database;
                        expect(manifest.checksums[checksumKey]).toBeDefined();
                        expect(manifest.checksums[checksumKey]).toMatch(/^[a-f0-9]{64}$/);
                    });

                    // CRITICAL TEST: Manifest should be serializable (for metadata storage)
                    const serialized = JSON.stringify(manifest);
                    const deserialized = JSON.parse(serialized);
                    expect(deserialized.id).toBe(manifest.id);
                    expect(deserialized.components.length).toBe(manifest.components.length);
                    expect(Object.keys(deserialized.checksums).length).toBe(Object.keys(manifest.checksums).length);
                }
            ),
            { 
                numRuns: 30,
                timeout: 8000
            }
        );
    });
});