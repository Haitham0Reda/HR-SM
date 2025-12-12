/**
 * Property-Based Tests for License File Loader
 * 
 * Feature: feature-productization, Property 16: Invalid License Handling
 * Validates: Requirements 5.2
 * 
 * This test verifies that for any invalid or malformed license file, the system
 * should disable all Product Modules, enable only Core HR, and log a warning.
 */

import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import licenseFileLoader from '../../services/licenseFileLoader.service.js';
import { MODULES } from '../../platform/system/models/license.model.js';
import logger from '../../utils/logger.js';
import { generateLicenseSignature } from '../../config/licenseFileSchema.js';

describe('License File Loader - Property-Based Tests', () => {
    const testLicenseDir = path.join(process.cwd(), 'test-licenses');
    let originalEnv;
    let loggerCalls;

    beforeAll(() => {
        // Save original environment
        originalEnv = {
            DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE,
            LICENSE_FILE_PATH: process.env.LICENSE_FILE_PATH,
            LICENSE_SECRET_KEY: process.env.LICENSE_SECRET_KEY
        };

        // Create test license directory
        if (!fs.existsSync(testLicenseDir)) {
            fs.mkdirSync(testLicenseDir, { recursive: true });
        }
    });

    beforeEach(() => {
        // Set up On-Premise mode
        process.env.DEPLOYMENT_MODE = 'on-premise';
        process.env.LICENSE_SECRET_KEY = 'test-secret-key-for-property-tests';

        // Track logger calls manually
        loggerCalls = { warn: [], error: [], info: [] };
        const originalWarn = logger.warn;
        const originalError = logger.error;
        const originalInfo = logger.info;
        
        logger.warn = (...args) => {
            loggerCalls.warn.push(args);
            originalWarn.apply(logger, args);
        };
        
        logger.error = (...args) => {
            loggerCalls.error.push(args);
            originalError.apply(logger, args);
        };
        
        logger.info = (...args) => {
            loggerCalls.info.push(args);
            originalInfo.apply(logger, args);
        };

        // Reset loader state
        licenseFileLoader.currentLicense = null;
        licenseFileLoader.cachedLicense = null;
        licenseFileLoader.cacheTimestamp = null;
        licenseFileLoader.loadAttempts = 0;
        licenseFileLoader.lastLoadError = null;
        
        if (licenseFileLoader.fileWatcher) {
            licenseFileLoader.fileWatcher.close();
            licenseFileLoader.fileWatcher = null;
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

        // Clean up test directory
        if (fs.existsSync(testLicenseDir)) {
            fs.rmSync(testLicenseDir, { recursive: true, force: true });
        }
    });

    /**
     * Feature: feature-productization, Property 16: Invalid License Handling
     * 
     * Property: For any invalid or malformed license file, the system should
     * disable all Product Modules, enable only Core HR, and log a warning.
     * 
     * This property ensures that invalid licenses are handled gracefully and
     * the system falls back to Core HR only, as required by Requirement 5.2.
     */
    test('Property 16: Invalid License Handling', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate various types of invalid license files
                fc.oneof(
                    // Invalid JSON
                    fc.record({
                        type: fc.constant('invalid-json'),
                        content: fc.string({ minLength: 1, maxLength: 100 })
                            .filter(s => {
                                try {
                                    JSON.parse(s);
                                    return false; // Valid JSON, skip
                                } catch {
                                    return true; // Invalid JSON, use it
                                }
                            })
                    }),
                    
                    // Missing required fields
                    fc.record({
                        type: fc.constant('missing-fields'),
                        missingField: fc.constantFrom(
                            'licenseKey',
                            'companyId',
                            'companyName',
                            'issuedAt',
                            'expiresAt',
                            'modules',
                            'signature'
                        )
                    }),
                    
                    // Invalid license key format
                    fc.record({
                        type: fc.constant('invalid-license-key'),
                        licenseKey: fc.string({ minLength: 1, maxLength: 50 })
                            .filter(s => !/^HRMS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(s))
                    }),
                    
                    // Invalid date format
                    fc.record({
                        type: fc.constant('invalid-date'),
                        dateField: fc.constantFrom('issuedAt', 'expiresAt'),
                        invalidDate: fc.string({ minLength: 1, maxLength: 20 })
                            .filter(s => isNaN(new Date(s).getTime()))
                    }),
                    
                    // Invalid module structure
                    fc.record({
                        type: fc.constant('invalid-module'),
                        moduleKey: fc.constantFrom(
                            MODULES.ATTENDANCE,
                            MODULES.LEAVE,
                            MODULES.PAYROLL
                        ),
                        invalidField: fc.constantFrom('missing-enabled', 'missing-tier', 'invalid-tier')
                    }),
                    
                    // Invalid signature
                    fc.record({
                        type: fc.constant('invalid-signature'),
                        signature: fc.string({ minLength: 10, maxLength: 64 })
                            .map(s => s.split('').map(c => c.charCodeAt(0).toString(16)).join(''))
                    })
                ),
                async (invalidLicenseSpec) => {
                    // Generate test file path
                    const testFileName = `test-license-${Date.now()}-${Math.random().toString(36).substring(7)}.json`;
                    const testFilePath = path.join(testLicenseDir, testFileName);
                    
                    // Set license file path
                    process.env.LICENSE_FILE_PATH = testFilePath;
                    licenseFileLoader.licenseFilePath = testFilePath;
                    licenseFileLoader.isOnPremiseMode = true;

                    // Create invalid license file based on type
                    let licenseContent;
                    
                    switch (invalidLicenseSpec.type) {
                        case 'invalid-json':
                            // Write invalid JSON directly
                            licenseContent = invalidLicenseSpec.content;
                            break;
                            
                        case 'missing-fields':
                            // Create valid structure but remove a required field
                            const validLicense = {
                                licenseKey: 'HRMS-TEST-1234-ABCD',
                                companyId: 'test-company',
                                companyName: 'Test Company',
                                issuedAt: '2025-01-01',
                                expiresAt: '2026-01-01',
                                modules: {
                                    'hr-core': { enabled: true, tier: 'enterprise', limits: {} }
                                },
                                signature: 'test-signature'
                            };
                            delete validLicense[invalidLicenseSpec.missingField];
                            licenseContent = JSON.stringify(validLicense);
                            break;
                            
                        case 'invalid-license-key':
                            licenseContent = JSON.stringify({
                                licenseKey: invalidLicenseSpec.licenseKey,
                                companyId: 'test-company',
                                companyName: 'Test Company',
                                issuedAt: '2025-01-01',
                                expiresAt: '2026-01-01',
                                modules: {
                                    'hr-core': { enabled: true, tier: 'enterprise', limits: {} }
                                },
                                signature: 'test-signature'
                            });
                            break;
                            
                        case 'invalid-date':
                            const licenseWithInvalidDate = {
                                licenseKey: 'HRMS-TEST-1234-ABCD',
                                companyId: 'test-company',
                                companyName: 'Test Company',
                                issuedAt: '2025-01-01',
                                expiresAt: '2026-01-01',
                                modules: {
                                    'hr-core': { enabled: true, tier: 'enterprise', limits: {} }
                                },
                                signature: 'test-signature'
                            };
                            licenseWithInvalidDate[invalidLicenseSpec.dateField] = invalidLicenseSpec.invalidDate;
                            licenseContent = JSON.stringify(licenseWithInvalidDate);
                            break;
                            
                        case 'invalid-module':
                            const moduleConfig = {};
                            
                            if (invalidLicenseSpec.invalidField === 'missing-enabled') {
                                moduleConfig.tier = 'business';
                                moduleConfig.limits = {};
                            } else if (invalidLicenseSpec.invalidField === 'missing-tier') {
                                moduleConfig.enabled = true;
                                moduleConfig.limits = {};
                            } else if (invalidLicenseSpec.invalidField === 'invalid-tier') {
                                moduleConfig.enabled = true;
                                moduleConfig.tier = 'invalid-tier-name';
                                moduleConfig.limits = {};
                            }
                            
                            licenseContent = JSON.stringify({
                                licenseKey: 'HRMS-TEST-1234-ABCD',
                                companyId: 'test-company',
                                companyName: 'Test Company',
                                issuedAt: '2025-01-01',
                                expiresAt: '2026-01-01',
                                modules: {
                                    [invalidLicenseSpec.moduleKey]: moduleConfig
                                },
                                signature: 'test-signature'
                            });
                            break;
                            
                        case 'invalid-signature':
                            licenseContent = JSON.stringify({
                                licenseKey: 'HRMS-TEST-1234-ABCD',
                                companyId: 'test-company',
                                companyName: 'Test Company',
                                issuedAt: '2025-01-01',
                                expiresAt: '2026-01-01',
                                modules: {
                                    'hr-core': { enabled: true, tier: 'enterprise', limits: {} },
                                    [MODULES.ATTENDANCE]: { enabled: true, tier: 'business', limits: { employees: 100 } }
                                },
                                signature: invalidLicenseSpec.signature // Invalid signature
                            });
                            break;
                    }

                    // Write invalid license file
                    fs.writeFileSync(testFilePath, licenseContent, 'utf8');

                    // Clear logger calls before loading
                    loggerCalls.warn = [];
                    loggerCalls.error = [];

                    // Attempt to load the invalid license file
                    const loadResult = await licenseFileLoader.loadLicenseFile();

                    // Assertion 1: Load should fail for invalid license
                    expect(loadResult).toBe(false);

                    // Assertion 2: Warning or error should be logged
                    const warningOrErrorLogged = loggerCalls.warn.length > 0 || 
                                                  loggerCalls.error.length > 0;
                    expect(warningOrErrorLogged).toBe(true);

                    // Assertion 3: Current license should be null (not loaded)
                    expect(licenseFileLoader.currentLicense).toBeNull();

                    // Assertion 4: Get license should return null
                    const license = licenseFileLoader.getLicense();
                    expect(license).toBeNull();

                    // Assertion 5: Only Core HR should be enabled
                    const enabledModules = licenseFileLoader.getEnabledModules();
                    expect(enabledModules).toEqual(['hr-core']);

                    // Assertion 6: Core HR should be accessible
                    const coreHREnabled = licenseFileLoader.isModuleEnabled('hr-core');
                    expect(coreHREnabled).toBe(true);

                    // Assertion 7: All Product Modules should be disabled
                    const productModules = [
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL,
                        MODULES.DOCUMENTS,
                        MODULES.COMMUNICATION,
                        MODULES.REPORTING,
                        MODULES.TASKS
                    ];

                    for (const moduleKey of productModules) {
                        const isEnabled = licenseFileLoader.isModuleEnabled(moduleKey);
                        expect(isEnabled).toBe(false);
                    }

                    // Assertion 8: Last load error should be set
                    expect(licenseFileLoader.lastLoadError).not.toBeNull();
                    expect(typeof licenseFileLoader.lastLoadError).toBe('string');
                    expect(licenseFileLoader.lastLoadError.length).toBeGreaterThan(0);

                    // Assertion 9: Status should reflect the error
                    const status = licenseFileLoader.getStatus();
                    expect(status.hasCurrentLicense).toBe(false);
                    expect(status.lastLoadError).not.toBeNull();
                    expect(status.enabledModules).toEqual(['hr-core']);

                    // Clean up test file
                    if (fs.existsSync(testFilePath)) {
                        fs.unlinkSync(testFilePath);
                    }
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Missing license file should disable all Product Modules
     */
    test('Property 16.1: Missing license file disables all Product Modules', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    fileName: fc.string({ minLength: 5, maxLength: 20 })
                        .map(s => {
                            const cleaned = s.replace(/[^a-zA-Z0-9-_]/g, '');
                            return (cleaned.length > 0 ? cleaned : 'test') + '.json';
                        })
                }),
                async ({ fileName }) => {
                    // Generate non-existent file path
                    const testFilePath = path.join(testLicenseDir, 'nonexistent', fileName);
                    
                    // Set license file path to non-existent file
                    process.env.LICENSE_FILE_PATH = testFilePath;
                    licenseFileLoader.licenseFilePath = testFilePath;
                    licenseFileLoader.isOnPremiseMode = true;

                    // Clear logger calls
                    loggerCalls.warn = [];
                    loggerCalls.error = [];

                    // Attempt to load non-existent license file
                    const loadResult = await licenseFileLoader.loadLicenseFile();

                    // Should fail
                    expect(loadResult).toBe(false);

                    // Error should be logged
                    expect(loggerCalls.error.length).toBeGreaterThan(0);

                    // Only Core HR should be enabled
                    const enabledModules = licenseFileLoader.getEnabledModules();
                    expect(enabledModules).toEqual(['hr-core']);

                    // Core HR should be accessible
                    expect(licenseFileLoader.isModuleEnabled('hr-core')).toBe(true);

                    // All Product Modules should be disabled
                    expect(licenseFileLoader.isModuleEnabled(MODULES.ATTENDANCE)).toBe(false);
                    expect(licenseFileLoader.isModuleEnabled(MODULES.LEAVE)).toBe(false);
                    expect(licenseFileLoader.isModuleEnabled(MODULES.PAYROLL)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Corrupted JSON should be handled gracefully
     */
    test('Property 16.2: Corrupted JSON is handled gracefully', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    corruptedContent: fc.oneof(
                        fc.constant('{ "licenseKey": "HRMS-TEST-1234-ABCD", '), // Incomplete JSON
                        fc.constant('{ licenseKey: HRMS-TEST-1234-ABCD }'), // Invalid JSON syntax
                        fc.constant('null'), // Null JSON
                        fc.constant('undefined'), // Undefined
                        fc.constant(''), // Empty string
                        fc.constant('   '), // Whitespace only
                        fc.constant('[1, 2, 3]'), // Array instead of object
                        fc.constant('"just a string"') // String instead of object
                    )
                }),
                async ({ corruptedContent }) => {
                    const testFileName = `corrupted-${Date.now()}.json`;
                    const testFilePath = path.join(testLicenseDir, testFileName);
                    
                    process.env.LICENSE_FILE_PATH = testFilePath;
                    licenseFileLoader.licenseFilePath = testFilePath;
                    licenseFileLoader.isOnPremiseMode = true;

                    // Write corrupted content
                    fs.writeFileSync(testFilePath, corruptedContent, 'utf8');

                    loggerCalls.warn = [];
                    loggerCalls.error = [];

                    // Attempt to load
                    const loadResult = await licenseFileLoader.loadLicenseFile();

                    // Should fail gracefully
                    expect(loadResult).toBe(false);

                    // Error should be logged
                    expect(loggerCalls.error.length).toBeGreaterThan(0);

                    // System should not crash
                    expect(licenseFileLoader.getLicense()).toBeNull();
                    expect(licenseFileLoader.getEnabledModules()).toEqual(['hr-core']);

                    // Clean up
                    if (fs.existsSync(testFilePath)) {
                        fs.unlinkSync(testFilePath);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Invalid module limits should be rejected
     */
    test('Property 16.3: Invalid module limits are rejected', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL
                    ),
                    invalidLimit: fc.oneof(
                        fc.record({ employees: fc.constant(-1) }), // Negative employees
                        fc.record({ storage: fc.constant(-1000) }), // Negative storage
                        fc.record({ apiCalls: fc.constant(-500) }), // Negative API calls
                        fc.record({ employees: fc.constant('invalid') }), // String instead of number
                        fc.record({ storage: fc.constant(null) }), // Null (should be allowed for unlimited)
                        fc.record({ employees: fc.constant(undefined) }) // Undefined (should be allowed)
                    )
                }),
                async ({ moduleKey, invalidLimit }) => {
                    const testFileName = `invalid-limits-${Date.now()}.json`;
                    const testFilePath = path.join(testLicenseDir, testFileName);
                    
                    process.env.LICENSE_FILE_PATH = testFilePath;
                    licenseFileLoader.licenseFilePath = testFilePath;
                    licenseFileLoader.isOnPremiseMode = true;

                    // Create license with invalid limits
                    const licenseContent = JSON.stringify({
                        licenseKey: 'HRMS-TEST-1234-ABCD',
                        companyId: 'test-company',
                        companyName: 'Test Company',
                        issuedAt: '2025-01-01',
                        expiresAt: '2026-01-01',
                        modules: {
                            [moduleKey]: {
                                enabled: true,
                                tier: 'business',
                                limits: invalidLimit
                            }
                        },
                        signature: 'test-signature'
                    });

                    fs.writeFileSync(testFilePath, licenseContent, 'utf8');

                    loggerCalls.warn = [];
                    loggerCalls.error = [];

                    // Attempt to load
                    const loadResult = await licenseFileLoader.loadLicenseFile();

                    // Check if the limit is truly invalid (negative numbers)
                    const hasNegativeLimit = Object.values(invalidLimit).some(v => typeof v === 'number' && v < 0);
                    const hasInvalidType = Object.values(invalidLimit).some(v => typeof v === 'string');

                    if (hasNegativeLimit || hasInvalidType) {
                        // Should fail for truly invalid limits
                        expect(loadResult).toBe(false);
                        expect(loggerCalls.error.length).toBeGreaterThan(0);
                        expect(licenseFileLoader.getEnabledModules()).toEqual(['hr-core']);
                    }
                    // Note: null and undefined are allowed for unlimited, so those should pass

                    // Clean up
                    if (fs.existsSync(testFilePath)) {
                        fs.unlinkSync(testFilePath);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: feature-productization, Property 17: Employee Limit Enforcement from File
     * 
     * Property: For any employee limit specified in an On-Premise license file,
     * the system should enforce that limit across all modules.
     * 
     * Validates: Requirements 5.4
     * 
     * This property ensures that employee limits defined in the license file are
     * properly loaded and can be enforced by the system.
     */
    test('Property 17: Employee Limit Enforcement from File', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    // Generate random employee limits for different modules
                    modules: fc.array(
                        fc.record({
                            moduleKey: fc.constantFrom(
                                MODULES.ATTENDANCE,
                                MODULES.LEAVE,
                                MODULES.PAYROLL,
                                MODULES.DOCUMENTS,
                                MODULES.COMMUNICATION,
                                MODULES.REPORTING,
                                MODULES.TASKS
                            ),
                            employeeLimit: fc.integer({ min: 1, max: 1000 })
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    // Generate company info
                    companyId: fc.string({ minLength: 5, maxLength: 20 })
                        .map(s => s.replace(/[^a-zA-Z0-9-]/g, '') || 'test-company'),
                    companyName: fc.string({ minLength: 5, maxLength: 50 })
                        .map(s => s.trim() || 'Test Company')
                }),
                async ({ modules, companyId, companyName }) => {
                    // Generate unique test file path
                    const testFileName = `employee-limit-${Date.now()}-${Math.random().toString(36).substring(7)}.json`;
                    const testFilePath = path.join(testLicenseDir, testFileName);
                    
                    // Set license file path
                    process.env.LICENSE_FILE_PATH = testFilePath;
                    licenseFileLoader.licenseFilePath = testFilePath;
                    licenseFileLoader.secretKey = process.env.LICENSE_SECRET_KEY;
                    licenseFileLoader.isOnPremiseMode = true;

                    // Build modules object with employee limits
                    const modulesConfig = {};
                    const expectedLimits = {};
                    
                    // Deduplicate modules by key (take the last one if duplicates)
                    const uniqueModules = modules.reduce((acc, mod) => {
                        acc[mod.moduleKey] = mod;
                        return acc;
                    }, {});

                    for (const [moduleKey, moduleData] of Object.entries(uniqueModules)) {
                        modulesConfig[moduleKey] = {
                            enabled: true,
                            tier: 'business',
                            limits: {
                                employees: moduleData.employeeLimit,
                                storage: 10737418240, // 10GB
                                apiCalls: 50000
                            }
                        };
                        expectedLimits[moduleKey] = moduleData.employeeLimit;
                    }

                    // Create valid license file with employee limits
                    const licenseData = {
                        licenseKey: 'HRMS-TEST-1234-ABCD',
                        companyId: companyId,
                        companyName: companyName,
                        issuedAt: '2025-01-01',
                        expiresAt: '2026-12-31', // Valid for future
                        modules: modulesConfig
                    };

                    // Generate proper signature
                    licenseData.signature = generateLicenseSignature(licenseData, process.env.LICENSE_SECRET_KEY);

                    // Write license file
                    fs.writeFileSync(testFilePath, JSON.stringify(licenseData, null, 2), 'utf8');

                    // Clear logger calls
                    loggerCalls.warn = [];
                    loggerCalls.error = [];
                    loggerCalls.info = [];

                    // Load the license file
                    const loadResult = await licenseFileLoader.loadLicenseFile();

                    // Assertion 1: License should load successfully
                    expect(loadResult).toBe(true);

                    // Assertion 2: No errors should be logged
                    expect(loggerCalls.error.length).toBe(0);

                    // Assertion 3: Current license should be set
                    expect(licenseFileLoader.currentLicense).not.toBeNull();

                    // Assertion 4: License should be retrievable
                    const license = licenseFileLoader.getLicense();
                    expect(license).not.toBeNull();

                    // Assertion 5: Verify each module's employee limit is correctly loaded
                    for (const [moduleKey, expectedLimit] of Object.entries(expectedLimits)) {
                        const moduleLicense = licenseFileLoader.getModuleLicense(moduleKey);
                        
                        // Module should be enabled
                        expect(moduleLicense).not.toBeNull();
                        expect(moduleLicense.enabled).toBe(true);
                        
                        // Employee limit should match what was specified
                        expect(moduleLicense.limits).toBeDefined();
                        expect(moduleLicense.limits.employees).toBe(expectedLimit);
                        
                        // Verify the limit is a positive number
                        expect(typeof moduleLicense.limits.employees).toBe('number');
                        expect(moduleLicense.limits.employees).toBeGreaterThan(0);
                    }

                    // Assertion 6: Verify license data structure contains all expected modules
                    const loadedModules = Object.keys(license.modules);
                    const expectedModules = Object.keys(expectedLimits);
                    
                    for (const expectedModule of expectedModules) {
                        expect(loadedModules).toContain(expectedModule);
                    }

                    // Assertion 7: Verify employee limits are accessible through the license object
                    for (const [moduleKey, expectedLimit] of Object.entries(expectedLimits)) {
                        expect(license.modules[moduleKey].limits.employees).toBe(expectedLimit);
                    }

                    // Assertion 8: Verify that the license is not expired
                    const isExpired = licenseFileLoader.isLicenseExpired();
                    expect(isExpired).toBe(false);

                    // Assertion 9: Verify enabled modules include the licensed modules
                    const enabledModules = licenseFileLoader.getEnabledModules();
                    expect(enabledModules).toContain('hr-core'); // Always enabled
                    
                    for (const moduleKey of Object.keys(expectedLimits)) {
                        expect(enabledModules).toContain(moduleKey);
                    }

                    // Assertion 10: Verify status reflects the loaded license
                    const status = licenseFileLoader.getStatus();
                    expect(status.hasCurrentLicense).toBe(true);
                    expect(status.isLicenseExpired).toBe(false);
                    expect(status.lastLoadError).toBeNull();

                    // Assertion 11: Verify other limit types are also loaded correctly
                    for (const [moduleKey] of Object.entries(expectedLimits)) {
                        const moduleLicense = licenseFileLoader.getModuleLicense(moduleKey);
                        expect(moduleLicense.limits.storage).toBe(10737418240);
                        expect(moduleLicense.limits.apiCalls).toBe(50000);
                    }

                    // Clean up test file
                    if (fs.existsSync(testFilePath)) {
                        fs.unlinkSync(testFilePath);
                    }
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Zero or unlimited employee limits should be handled correctly
     */
    test('Property 17.1: Zero and unlimited employee limits are handled correctly', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL
                    ),
                    limitType: fc.constantFrom('zero', 'null', 'undefined', 'unlimited-number')
                }),
                async ({ moduleKey, limitType }) => {
                    const testFileName = `limit-type-${Date.now()}.json`;
                    const testFilePath = path.join(testLicenseDir, testFileName);
                    
                    process.env.LICENSE_FILE_PATH = testFilePath;
                    licenseFileLoader.licenseFilePath = testFilePath;
                    licenseFileLoader.secretKey = process.env.LICENSE_SECRET_KEY;
                    licenseFileLoader.isOnPremiseMode = true;

                    // Create module config based on limit type
                    let employeeLimit;
                    let shouldLoadSuccessfully = true;
                    
                    switch (limitType) {
                        case 'zero':
                            employeeLimit = 0;
                            shouldLoadSuccessfully = false; // Zero is invalid
                            break;
                        case 'null':
                            employeeLimit = null; // Represents unlimited
                            shouldLoadSuccessfully = true;
                            break;
                        case 'undefined':
                            employeeLimit = undefined; // Represents unlimited
                            shouldLoadSuccessfully = true;
                            break;
                        case 'unlimited-number':
                            employeeLimit = 999999; // Large number for unlimited
                            shouldLoadSuccessfully = true;
                            break;
                    }

                    const modulesConfig = {
                        [moduleKey]: {
                            enabled: true,
                            tier: 'enterprise',
                            limits: {}
                        }
                    };

                    // Only set employee limit if not undefined
                    if (employeeLimit !== undefined) {
                        modulesConfig[moduleKey].limits.employees = employeeLimit;
                    }

                    const licenseData = {
                        licenseKey: 'HRMS-TEST-1234-ABCD',
                        companyId: 'test-company',
                        companyName: 'Test Company',
                        issuedAt: '2025-01-01',
                        expiresAt: '2026-12-31',
                        modules: modulesConfig
                    };

                    // Generate proper signature
                    licenseData.signature = generateLicenseSignature(licenseData, process.env.LICENSE_SECRET_KEY);

                    fs.writeFileSync(testFilePath, JSON.stringify(licenseData), 'utf8');

                    loggerCalls.warn = [];
                    loggerCalls.error = [];

                    const loadResult = await licenseFileLoader.loadLicenseFile();

                    if (shouldLoadSuccessfully) {
                        // Should load successfully for null, undefined, or large numbers
                        expect(loadResult).toBe(true);
                        
                        const moduleLicense = licenseFileLoader.getModuleLicense(moduleKey);
                        expect(moduleLicense).not.toBeNull();
                        expect(moduleLicense.enabled).toBe(true);
                        
                        // Verify the limit value
                        if (limitType === 'null') {
                            expect(moduleLicense.limits.employees).toBeNull();
                        } else if (limitType === 'undefined') {
                            expect(moduleLicense.limits.employees).toBeUndefined();
                        } else if (limitType === 'unlimited-number') {
                            expect(moduleLicense.limits.employees).toBe(999999);
                        }
                    } else {
                        // Should fail for zero or negative limits
                        expect(loadResult).toBe(false);
                        expect(loggerCalls.error.length).toBeGreaterThan(0);
                    }

                    // Clean up
                    if (fs.existsSync(testFilePath)) {
                        fs.unlinkSync(testFilePath);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Employee limits should be consistent across module reloads
     */
    test('Property 17.2: Employee limits persist across license reloads', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    moduleKey: fc.constantFrom(
                        MODULES.ATTENDANCE,
                        MODULES.LEAVE,
                        MODULES.PAYROLL
                    ),
                    initialLimit: fc.integer({ min: 10, max: 500 }),
                    updatedLimit: fc.integer({ min: 10, max: 500 })
                }),
                async ({ moduleKey, initialLimit, updatedLimit }) => {
                    const testFileName = `reload-test-${Date.now()}.json`;
                    const testFilePath = path.join(testLicenseDir, testFileName);
                    
                    process.env.LICENSE_FILE_PATH = testFilePath;
                    licenseFileLoader.licenseFilePath = testFilePath;
                    licenseFileLoader.secretKey = process.env.LICENSE_SECRET_KEY;
                    licenseFileLoader.isOnPremiseMode = true;

                    // Create initial license with first limit
                    const createLicense = (limit) => {
                        const licenseData = {
                            licenseKey: 'HRMS-TEST-1234-ABCD',
                            companyId: 'test-company',
                            companyName: 'Test Company',
                            issuedAt: '2025-01-01',
                            expiresAt: '2026-12-31',
                            modules: {
                                [moduleKey]: {
                                    enabled: true,
                                    tier: 'business',
                                    limits: {
                                        employees: limit,
                                        storage: 10737418240,
                                        apiCalls: 50000
                                    }
                                }
                            }
                        };
                        // Generate proper signature
                        licenseData.signature = generateLicenseSignature(licenseData, process.env.LICENSE_SECRET_KEY);
                        return licenseData;
                    };

                    // Write initial license
                    fs.writeFileSync(testFilePath, JSON.stringify(createLicense(initialLimit)), 'utf8');

                    // Load initial license
                    const loadResult1 = await licenseFileLoader.loadLicenseFile();
                    expect(loadResult1).toBe(true);

                    // Verify initial limit
                    let moduleLicense = licenseFileLoader.getModuleLicense(moduleKey);
                    expect(moduleLicense.limits.employees).toBe(initialLimit);

                    // Update license file with new limit
                    fs.writeFileSync(testFilePath, JSON.stringify(createLicense(updatedLimit)), 'utf8');

                    // Reload license
                    const loadResult2 = await licenseFileLoader.loadLicenseFile();
                    expect(loadResult2).toBe(true);

                    // Verify updated limit
                    moduleLicense = licenseFileLoader.getModuleLicense(moduleKey);
                    expect(moduleLicense.limits.employees).toBe(updatedLimit);

                    // Verify the limit actually changed if they were different
                    if (initialLimit !== updatedLimit) {
                        expect(moduleLicense.limits.employees).not.toBe(initialLimit);
                    }

                    // Clean up
                    if (fs.existsSync(testFilePath)) {
                        fs.unlinkSync(testFilePath);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
