/**
 * Integration Tests for Commercial Module Registry with Dependency Resolution
 */

import { describe, it, expect } from '@jest/globals';
import {
    validateAllModuleConfigsWithDependencies,
    validateModuleActivation,
    getModuleActivationOrder,
    checkModuleDependency
} from '../../config/commercialModuleRegistry.js';

describe('Commercial Module Registry - Dependency Integration', () => {
    describe('validateAllModuleConfigsWithDependencies', () => {
        it('should validate all module configs including dependencies', async () => {
            const result = await validateAllModuleConfigsWithDependencies();
            expect(result).toBe(true);
        });

        it('should detect no circular dependencies', async () => {
            // Should not throw
            await expect(validateAllModuleConfigsWithDependencies()).resolves.toBe(true);
        });
    });

    describe('validateModuleActivation', () => {
        it('should validate attendance module with hr-core enabled', async () => {
            const result = await validateModuleActivation('attendance', ['hr-core']);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail to validate attendance without hr-core', async () => {
            const result = await validateModuleActivation('attendance', []);

            expect(result.valid).toBe(false);
            expect(result.missingDependencies).toContain('hr-core');
        });

        it('should fail to validate payroll without attendance', async () => {
            const result = await validateModuleActivation('payroll', ['hr-core']);

            expect(result.valid).toBe(false);
            expect(result.missingDependencies).toContain('attendance');
        });

        it('should validate payroll with all dependencies', async () => {
            const result = await validateModuleActivation('payroll', ['hr-core', 'attendance']);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('getModuleActivationOrder', () => {
        it('should return correct order for payroll activation', async () => {
            const order = await getModuleActivationOrder(['payroll']);

            expect(order).toContain('hr-core');
            expect(order).toContain('attendance');
            expect(order).toContain('payroll');

            // hr-core should come before attendance
            expect(order.indexOf('hr-core')).toBeLessThan(order.indexOf('attendance'));
            // attendance should come before payroll
            expect(order.indexOf('attendance')).toBeLessThan(order.indexOf('payroll'));
        });

        it('should handle multiple independent modules', async () => {
            const order = await getModuleActivationOrder(['attendance', 'leave', 'documents']);

            expect(order).toContain('hr-core');
            expect(order).toContain('attendance');
            expect(order).toContain('leave');
            expect(order).toContain('documents');

            // hr-core should be first
            expect(order[0]).toBe('hr-core');
        });

        it('should handle complex dependency chains', async () => {
            const order = await getModuleActivationOrder(['payroll', 'reporting']);

            // Should include all dependencies
            expect(order).toContain('hr-core');
            expect(order).toContain('attendance');
            expect(order).toContain('payroll');
            expect(order).toContain('reporting');
        });
    });

    describe('checkModuleDependency', () => {
        it('should confirm attendance depends on hr-core', async () => {
            const result = await checkModuleDependency('attendance', 'hr-core');
            expect(result).toBe(true);
        });

        it('should confirm payroll depends on hr-core transitively', async () => {
            const result = await checkModuleDependency('payroll', 'hr-core');
            expect(result).toBe(true);
        });

        it('should confirm payroll depends on attendance', async () => {
            const result = await checkModuleDependency('payroll', 'attendance');
            expect(result).toBe(true);
        });

        it('should confirm hr-core does not depend on attendance', async () => {
            const result = await checkModuleDependency('hr-core', 'attendance');
            expect(result).toBe(false);
        });

        it('should confirm attendance does not depend on payroll', async () => {
            const result = await checkModuleDependency('attendance', 'payroll');
            expect(result).toBe(false);
        });
    });
});
