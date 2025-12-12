/**
 * Property-Based Tests for Module License Status Independence
 * 
 * Feature: feature-productization, Property 1: Module License Status Independence
 * Validates: Requirements 1.1
 * 
 * This test verifies that for any set of Product Modules, after system initialization,
 * querying each module's license status should return independent results without
 * affecting other modules.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { LicenseProvider, useLicense } from '../context/LicenseContext';
import axios from 'axios';
import fc from 'fast-check';

// Mock axios
jest.mock('axios');

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        isAuthenticated: true,
        user: {
            tenantId: 'test-tenant-123'
        }
    })
}));

describe('Module License Status Independence - Property-Based Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    /**
     * Feature: feature-productization, Property 1: Module License Status Independence
     * 
     * Property: For any set of Product Modules, after system initialization, querying
     * each module's license status should return independent results without affecting
     * other modules.
     * 
     * This property ensures that checking the license status of one module does not
     * affect the license status of any other module, as required by Requirement 1.1.
     */
    test('Property 1: Module License Status Independence', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate arbitrary module configurations
                fc.record({
                    modules: fc.array(
                        fc.record({
                            key: fc.constantFrom(
                                'attendance',
                                'leave',
                                'payroll',
                                'documents',
                                'communication',
                                'reporting',
                                'tasks'
                            ),
                            enabled: fc.boolean(),
                            tier: fc.constantFrom('starter', 'business', 'enterprise'),
                            limits: fc.record({
                                employees: fc.integer({ min: 10, max: 1000 }),
                                storage: fc.integer({ min: 1000000, max: 100000000 }),
                                apiCalls: fc.integer({ min: 1000, max: 100000 })
                            }),
                            activatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
                            expiresAt: fc.date({ min: new Date(), max: new Date('2030-12-31') })
                        }),
                        { minLength: 1, maxLength: 7 }
                    ),
                    status: fc.constantFrom('active', 'trial', 'expired', 'suspended'),
                    billingCycle: fc.constantFrom('monthly', 'annual')
                }),
                async ({ modules, status, billingCycle }) => {
                    // Remove duplicate module keys
                    const uniqueModules = [];
                    const seenKeys = new Set();
                    for (const module of modules) {
                        if (!seenKeys.has(module.key)) {
                            seenKeys.add(module.key);
                            uniqueModules.push(module);
                        }
                    }

                    // Mock API responses
                    axios.get.mockImplementation((url) => {
                        if (url.includes('/licenses/')) {
                            if (url.endsWith('/usage')) {
                                // Return usage data
                                return Promise.resolve({
                                    data: {
                                        data: uniqueModules.map(module => ({
                                            moduleKey: module.key,
                                            usage: {
                                                employees: Math.floor(module.limits.employees * 0.5),
                                                storage: Math.floor(module.limits.storage * 0.5),
                                                apiCalls: Math.floor(module.limits.apiCalls * 0.5)
                                            },
                                            limits: module.limits,
                                            warnings: [],
                                            violations: []
                                        }))
                                    }
                                });
                            } else {
                                // Return license data
                                return Promise.resolve({
                                    data: {
                                        data: {
                                            modules: uniqueModules,
                                            status,
                                            billingCycle
                                        }
                                    }
                                });
                            }
                        }
                        return Promise.reject(new Error('Unknown URL'));
                    });

                    // Render the hook with LicenseProvider
                    const wrapper = ({ children }) => (
                        <LicenseProvider>{children}</LicenseProvider>
                    );

                    const { result } = renderHook(() => useLicense(), { wrapper });

                    // Wait for initial data load
                    await waitFor(() => {
                        expect(result.current.loading).toBe(false);
                    }, { timeout: 5000 });

                    // Store initial license states for all modules
                    const initialStates = new Map();
                    for (const module of uniqueModules) {
                        const isEnabled = result.current.isModuleEnabled(module.key);
                        const license = result.current.getModuleLicense(module.key);
                        initialStates.set(module.key, { isEnabled, license });
                    }

                    // Query each module's license status multiple times
                    for (const module of uniqueModules) {
                        // Query this module's status
                        const isEnabled1 = result.current.isModuleEnabled(module.key);
                        const license1 = result.current.getModuleLicense(module.key);

                        // Verify the status matches the initial state
                        const initial = initialStates.get(module.key);
                        expect(isEnabled1).toBe(initial.isEnabled);
                        expect(license1).toEqual(initial.license);

                        // Query again to ensure consistency
                        const isEnabled2 = result.current.isModuleEnabled(module.key);
                        const license2 = result.current.getModuleLicense(module.key);

                        expect(isEnabled2).toBe(isEnabled1);
                        expect(license2).toEqual(license1);

                        // Verify that querying this module didn't affect other modules
                        for (const otherModule of uniqueModules) {
                            if (otherModule.key !== module.key) {
                                const otherIsEnabled = result.current.isModuleEnabled(otherModule.key);
                                const otherLicense = result.current.getModuleLicense(otherModule.key);

                                const otherInitial = initialStates.get(otherModule.key);
                                expect(otherIsEnabled).toBe(otherInitial.isEnabled);
                                expect(otherLicense).toEqual(otherInitial.license);
                            }
                        }
                    }

                    // Verify that the expected module states match the input
                    for (const module of uniqueModules) {
                        const isEnabled = result.current.isModuleEnabled(module.key);
                        expect(isEnabled).toBe(module.enabled);

                        const license = result.current.getModuleLicense(module.key);
                        expect(license).not.toBeNull();
                        expect(license.enabled).toBe(module.enabled);
                        expect(license.tier).toBe(module.tier);
                        expect(license.limits).toEqual(module.limits);
                    }
                }
            ),
            { numRuns: 100 } // Run 100 iterations as specified in design
        );
    });

    /**
     * Additional property: Core HR status should not affect other modules
     * 
     * This ensures that querying Core HR (which is always enabled) doesn't
     * interfere with other module license checks.
     */
    test('Property 1.1: Core HR queries do not affect other modules', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    modules: fc.array(
                        fc.record({
                            key: fc.constantFrom('attendance', 'leave', 'payroll'),
                            enabled: fc.boolean(),
                            tier: fc.constantFrom('starter', 'business', 'enterprise'),
                            limits: fc.record({
                                employees: fc.integer({ min: 10, max: 1000 })
                            }),
                            activatedAt: fc.date(),
                            expiresAt: fc.date({ min: new Date() })
                        }),
                        { minLength: 1, maxLength: 3 }
                    )
                }),
                async ({ modules }) => {
                    // Remove duplicates
                    const uniqueModules = [];
                    const seenKeys = new Set();
                    for (const module of modules) {
                        if (!seenKeys.has(module.key)) {
                            seenKeys.add(module.key);
                            uniqueModules.push(module);
                        }
                    }

                    // Mock API responses
                    axios.get.mockImplementation((url) => {
                        if (url.includes('/licenses/')) {
                            if (url.endsWith('/usage')) {
                                return Promise.resolve({ data: { data: [] } });
                            } else {
                                return Promise.resolve({
                                    data: {
                                        data: {
                                            modules: uniqueModules,
                                            status: 'active',
                                            billingCycle: 'monthly'
                                        }
                                    }
                                });
                            }
                        }
                        return Promise.reject(new Error('Unknown URL'));
                    });

                    const wrapper = ({ children }) => (
                        <LicenseProvider>{children}</LicenseProvider>
                    );

                    const { result } = renderHook(() => useLicense(), { wrapper });

                    await waitFor(() => {
                        expect(result.current.loading).toBe(false);
                    }, { timeout: 5000 });

                    // Store initial states of other modules
                    const initialStates = new Map();
                    for (const module of uniqueModules) {
                        initialStates.set(module.key, {
                            isEnabled: result.current.isModuleEnabled(module.key),
                            license: result.current.getModuleLicense(module.key)
                        });
                    }

                    // Query Core HR multiple times
                    for (let i = 0; i < 5; i++) {
                        const coreHREnabled = result.current.isModuleEnabled('hr-core');
                        const coreHRLicense = result.current.getModuleLicense('hr-core');

                        // Core HR should always be enabled
                        expect(coreHREnabled).toBe(true);
                        expect(coreHRLicense).not.toBeNull();
                        expect(coreHRLicense.enabled).toBe(true);

                        // Verify other modules are unaffected
                        for (const module of uniqueModules) {
                            const currentEnabled = result.current.isModuleEnabled(module.key);
                            const currentLicense = result.current.getModuleLicense(module.key);

                            const initial = initialStates.get(module.key);
                            expect(currentEnabled).toBe(initial.isEnabled);
                            expect(currentLicense).toEqual(initial.license);
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Querying disabled modules doesn't enable them
     * 
     * This ensures that repeatedly querying a disabled module doesn't
     * accidentally enable it or affect its state.
     */
    test('Property 1.2: Querying disabled modules maintains their state', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    disabledModule: fc.constantFrom('attendance', 'leave', 'payroll'),
                    enabledModules: fc.array(
                        fc.record({
                            key: fc.constantFrom('documents', 'communication', 'reporting'),
                            enabled: fc.constant(true),
                            tier: fc.constantFrom('starter', 'business', 'enterprise'),
                            limits: fc.record({
                                employees: fc.integer({ min: 10, max: 1000 })
                            }),
                            activatedAt: fc.date(),
                            expiresAt: fc.date({ min: new Date() })
                        }),
                        { minLength: 1, maxLength: 3 }
                    )
                }),
                async ({ disabledModule, enabledModules }) => {
                    // Remove duplicates from enabled modules
                    const uniqueEnabled = [];
                    const seenKeys = new Set();
                    for (const module of enabledModules) {
                        if (!seenKeys.has(module.key) && module.key !== disabledModule) {
                            seenKeys.add(module.key);
                            uniqueEnabled.push(module);
                        }
                    }

                    // Mock API responses
                    axios.get.mockImplementation((url) => {
                        if (url.includes('/licenses/')) {
                            if (url.endsWith('/usage')) {
                                return Promise.resolve({ data: { data: [] } });
                            } else {
                                return Promise.resolve({
                                    data: {
                                        data: {
                                            modules: uniqueEnabled,
                                            status: 'active',
                                            billingCycle: 'monthly'
                                        }
                                    }
                                });
                            }
                        }
                        return Promise.reject(new Error('Unknown URL'));
                    });

                    const wrapper = ({ children }) => (
                        <LicenseProvider>{children}</LicenseProvider>
                    );

                    const { result } = renderHook(() => useLicense(), { wrapper });

                    await waitFor(() => {
                        expect(result.current.loading).toBe(false);
                    }, { timeout: 5000 });

                    // Query the disabled module multiple times
                    for (let i = 0; i < 10; i++) {
                        const isEnabled = result.current.isModuleEnabled(disabledModule);
                        const license = result.current.getModuleLicense(disabledModule);

                        // Should always be disabled
                        expect(isEnabled).toBe(false);
                        expect(license).toBeNull();
                    }

                    // Verify enabled modules remain enabled
                    for (const module of uniqueEnabled) {
                        const isEnabled = result.current.isModuleEnabled(module.key);
                        expect(isEnabled).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Concurrent queries return consistent results
     * 
     * This ensures that querying multiple modules simultaneously doesn't
     * cause race conditions or inconsistent states.
     */
    test('Property 1.3: Concurrent module queries return consistent results', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    modules: fc.array(
                        fc.record({
                            key: fc.constantFrom(
                                'attendance',
                                'leave',
                                'payroll',
                                'documents'
                            ),
                            enabled: fc.boolean(),
                            tier: fc.constantFrom('starter', 'business', 'enterprise'),
                            limits: fc.record({
                                employees: fc.integer({ min: 10, max: 1000 })
                            }),
                            activatedAt: fc.date(),
                            expiresAt: fc.date({ min: new Date() })
                        }),
                        { minLength: 2, maxLength: 4 }
                    )
                }),
                async ({ modules }) => {
                    // Remove duplicates
                    const uniqueModules = [];
                    const seenKeys = new Set();
                    for (const module of modules) {
                        if (!seenKeys.has(module.key)) {
                            seenKeys.add(module.key);
                            uniqueModules.push(module);
                        }
                    }

                    // Mock API responses
                    axios.get.mockImplementation((url) => {
                        if (url.includes('/licenses/')) {
                            if (url.endsWith('/usage')) {
                                return Promise.resolve({ data: { data: [] } });
                            } else {
                                return Promise.resolve({
                                    data: {
                                        data: {
                                            modules: uniqueModules,
                                            status: 'active',
                                            billingCycle: 'monthly'
                                        }
                                    }
                                });
                            }
                        }
                        return Promise.reject(new Error('Unknown URL'));
                    });

                    const wrapper = ({ children }) => (
                        <LicenseProvider>{children}</LicenseProvider>
                    );

                    const { result } = renderHook(() => useLicense(), { wrapper });

                    await waitFor(() => {
                        expect(result.current.loading).toBe(false);
                    }, { timeout: 5000 });

                    // Query all modules concurrently multiple times
                    const results1 = uniqueModules.map(m => ({
                        key: m.key,
                        enabled: result.current.isModuleEnabled(m.key),
                        license: result.current.getModuleLicense(m.key)
                    }));

                    const results2 = uniqueModules.map(m => ({
                        key: m.key,
                        enabled: result.current.isModuleEnabled(m.key),
                        license: result.current.getModuleLicense(m.key)
                    }));

                    // Results should be identical
                    for (let i = 0; i < uniqueModules.length; i++) {
                        expect(results1[i].enabled).toBe(results2[i].enabled);
                        expect(results1[i].license).toEqual(results2[i].license);

                        // Verify against expected state
                        expect(results1[i].enabled).toBe(uniqueModules[i].enabled);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
