/**
 * Unit Tests for Module Dependency Resolution
 * 
 * Tests module dependency resolution, validation, and circular dependency detection
 * Requirements: 1.4, 7.2, 7.5, 12.2, 12.3, 12.4
 */

import {
    resolveDependencies,
    canDisableModule,
    detectCircularDependencies,
    getDependencyTree,
    validateDependencies,
    getLoadOrder
} from '../../core/registry/dependencyResolver.js';
import moduleRegistry from '../../core/registry/moduleRegistry.js';
import AppError from '../../core/errors/AppError.js';

describe('Module Dependency Resolution', () => {
    beforeEach(() => {
        // Clear registry before each test
        moduleRegistry.clear();
    });

    afterEach(() => {
        // Clean up after each test
        moduleRegistry.clear();
    });

    describe('resolveDependencies', () => {
        describe('module with missing dependencies is rejected', () => {
            it('should reject module when required dependency is not enabled', () => {
                // Register modules
                moduleRegistry.register({
                    name: 'hr-core',
                    displayName: 'HR Core',
                    version: '1.0.0',
                    description: 'Core HR functionality',
                    dependencies: []
                });

                moduleRegistry.register({
                    name: 'tasks',
                    displayName: 'Tasks',
                    version: '1.0.0',
                    description: 'Task management',
                    dependencies: ['hr-core']
                });

                // Try to enable tasks without hr-core enabled
                const result = resolveDependencies('tasks', []);

                expect(result.canEnable).toBe(false);
                expect(result.missingDependencies).toContain('hr-core');
                expect(result.message).toContain('missing required dependencies');
            });

            it('should reject module when multiple required dependencies are missing', () => {
                moduleRegistry.register({
                    name: 'hr-core',
                    displayName: 'HR Core',
                    version: '1.0.0',
                    description: 'Core HR functionality',
                    dependencies: []
                });

                moduleRegistry.register({
                    name: 'email-service',
                    displayName: 'Email Service',
                    version: '1.0.0',
                    description: 'Email functionality',
                    dependencies: []
                });

                moduleRegistry.register({
                    name: 'payroll',
                    displayName: 'Payroll',
                    version: '1.0.0',
                    description: 'Payroll processing',
                    dependencies: ['hr-core', 'email-service']
                });

                // Try to enable payroll without any dependencies
                const result = resolveDependencies('payroll', []);

                expect(result.canEnable).toBe(false);
                expect(result.missingDependencies).toContain('hr-core');
                expect(result.missingDependencies).toContain('email-service');
                expect(result.missingDependencies).toHaveLength(2);
            });

            it('should reject module when some but not all dependencies are enabled', () => {
                moduleRegistry.register({
                    name: 'hr-core',
                    displayName: 'HR Core',
                    version: '1.0.0',
                    description: 'Core HR functionality',
                    dependencies: []
                });

                moduleRegistry.register({
                    name: 'email-service',
                    displayName: 'Email Service',
                    version: '1.0.0',
                    description: 'Email functionality',
                    dependencies: []
                });

                moduleRegistry.register({
                    name: 'payroll',
                    displayName: 'Payroll',
                    version: '1.0.0',
                    description: 'Payroll processing',
                    dependencies: ['hr-core', 'email-service']
                });

                // Enable only hr-core, not email-service
                const result = resolveDependencies('payroll', ['hr-core']);

                expect(result.canEnable).toBe(false);
                expect(result.missingDependencies).toContain('email-service');
                expect(result.missingDependencies).not.toContain('hr-core');
            });

            it('should throw error if module does not exist', () => {
                expect(() => {
                    resolveDependencies('non-existent-module', []);
                }).toThrow(AppError);

                expect(() => {
                    resolveDependencies('non-existent-module', []);
                }).toThrow('Module not found');
            });
        });

        describe('module with satisfied dependencies loads successfully', () => {
            it('should allow module with no dependencies to be enabled', () => {
                moduleRegistry.register({
                    name: 'hr-core',
                    displayName: 'HR Core',
                    version: '1.0.0',
                    description: 'Core HR functionality',
                    dependencies: []
                });

                const result = resolveDependencies('hr-core', []);

                expect(result.canEnable).toBe(true);
                expect(result.missingDependencies).toHaveLength(0);
                expect(result.message).toContain('can be enabled');
            });

            it('should allow module when all required dependencies are enabled', () => {
                moduleRegistry.register({
                    name: 'hr-core',
                    displayName: 'HR Core',
                    version: '1.0.0',
                    description: 'Core HR functionality',
                    dependencies: []
                });

                moduleRegistry.register({
                    name: 'tasks',
                    displayName: 'Tasks',
                    version: '1.0.0',
                    description: 'Task management',
                    dependencies: ['hr-core']
                });

                // Enable tasks with hr-core enabled
                const result = resolveDependencies('tasks', ['hr-core']);

                expect(result.canEnable).toBe(true);
                expect(result.missingDependencies).toHaveLength(0);
            });

            it('should allow module when all multiple dependencies are satisfied', () => {
                moduleRegistry.register({
                    name: 'hr-core',
                    displayName: 'HR Core',
                    version: '1.0.0',
                    description: 'Core HR functionality',
                    dependencies: []
                });

                moduleRegistry.register({
                    name: 'email-service',
                    displayName: 'Email Service',
                    version: '1.0.0',
                    description: 'Email functionality',
                    dependencies: []
                });

                moduleRegistry.register({
                    name: 'payroll',
                    displayName: 'Payroll',
                    version: '1.0.0',
                    description: 'Payroll processing',
                    dependencies: ['hr-core', 'email-service']
                });

                // Enable payroll with all dependencies
                const result = resolveDependencies('payroll', ['hr-core', 'email-service']);

                expect(result.canEnable).toBe(true);
                expect(result.missingDependencies).toHaveLength(0);
            });

            it('should allow module with optional dependencies missing', () => {
                moduleRegistry.register({
                    name: 'hr-core',
                    displayName: 'HR Core',
                    version: '1.0.0',
                    description: 'Core HR functionality',
                    dependencies: []
                });

                moduleRegistry.register({
                    name: 'email-service',
                    displayName: 'Email Service',
                    version: '1.0.0',
                    description: 'Email functionality',
                    dependencies: []
                });

                moduleRegistry.register({
                    name: 'clinic',
                    displayName: 'Clinic',
                    version: '1.0.0',
                    description: 'Medical clinic management',
                    dependencies: ['hr-core'],
                    optionalDependencies: ['email-service']
                });

                // Enable clinic without optional email-service
                const result = resolveDependencies('clinic', ['hr-core']);

                expect(result.canEnable).toBe(true);
                expect(result.missingDependencies).toHaveLength(0);
                expect(result.missingOptionalDependencies).toContain('email-service');
                expect(result.message).toContain('optional features may be unavailable');
            });

            it('should report when all dependencies including optional are satisfied', () => {
                moduleRegistry.register({
                    name: 'hr-core',
                    displayName: 'HR Core',
                    version: '1.0.0',
                    description: 'Core HR functionality',
                    dependencies: []
                });

                moduleRegistry.register({
                    name: 'email-service',
                    displayName: 'Email Service',
                    version: '1.0.0',
                    description: 'Email functionality',
                    dependencies: []
                });

                moduleRegistry.register({
                    name: 'clinic',
                    displayName: 'Clinic',
                    version: '1.0.0',
                    description: 'Medical clinic management',
                    dependencies: ['hr-core'],
                    optionalDependencies: ['email-service']
                });

                // Enable clinic with all dependencies
                const result = resolveDependencies('clinic', ['hr-core', 'email-service']);

                expect(result.canEnable).toBe(true);
                expect(result.missingDependencies).toHaveLength(0);
                expect(result.missingOptionalDependencies).toHaveLength(0);
            });
        });
    });

    describe('detectCircularDependencies', () => {
        describe('circular dependencies are detected', () => {
            it('should detect simple two-module circular dependency (A -> B -> A)', () => {
                moduleRegistry.register({
                    name: 'module-a',
                    displayName: 'Module A',
                    version: '1.0.0',
                    description: 'Module A',
                    dependencies: ['module-b']
                });

                moduleRegistry.register({
                    name: 'module-b',
                    displayName: 'Module B',
                    version: '1.0.0',
                    description: 'Module B',
                    dependencies: ['module-a']
                });

                const result = detectCircularDependencies('module-a');

                expect(result.hasCircular).toBe(true);
                expect(result.circularPath).toContain('module-a');
                expect(result.circularPath).toContain('module-b');
                expect(result.message).toContain('Circular dependency detected');
            });

            it('should detect three-module circular dependency (A -> B -> C -> A)', () => {
                moduleRegistry.register({
                    name: 'module-a',
                    displayName: 'Module A',
                    version: '1.0.0',
                    description: 'Module A',
                    dependencies: ['module-b']
                });

                moduleRegistry.register({
                    name: 'module-b',
                    displayName: 'Module B',
                    version: '1.0.0',
                    description: 'Module B',
                    dependencies: ['module-c']
                });

                moduleRegistry.register({
                    name: 'module-c',
                    displayName: 'Module C',
                    version: '1.0.0',
                    description: 'Module C',
                    dependencies: ['module-a']
                });

                const result = detectCircularDependencies('module-a');

                expect(result.hasCircular).toBe(true);
                expect(result.circularPath).toContain('module-a');
                expect(result.circularPath).toContain('module-b');
                expect(result.circularPath).toContain('module-c');
            });

            it('should detect self-referencing module (A -> A)', () => {
                moduleRegistry.register({
                    name: 'module-a',
                    displayName: 'Module A',
                    version: '1.0.0',
                    description: 'Module A',
                    dependencies: ['module-a']
                });

                const result = detectCircularDependencies('module-a');

                expect(result.hasCircular).toBe(true);
                expect(result.circularPath).toEqual(['module-a', 'module-a']);
            });

            it('should detect circular dependency in complex graph', () => {
                // Create: A -> B -> C -> D -> B (circular)
                //              \-> E (not circular)
                moduleRegistry.register({
                    name: 'module-a',
                    displayName: 'Module A',
                    version: '1.0.0',
                    description: 'Module A',
                    dependencies: ['module-b']
                });

                moduleRegistry.register({
                    name: 'module-b',
                    displayName: 'Module B',
                    version: '1.0.0',
                    description: 'Module B',
                    dependencies: ['module-c', 'module-e']
                });

                moduleRegistry.register({
                    name: 'module-c',
                    displayName: 'Module C',
                    version: '1.0.0',
                    description: 'Module C',
                    dependencies: ['module-d']
                });

                moduleRegistry.register({
                    name: 'module-d',
                    displayName: 'Module D',
                    version: '1.0.0',
                    description: 'Module D',
                    dependencies: ['module-b']
                });

                moduleRegistry.register({
                    name: 'module-e',
                    displayName: 'Module E',
                    version: '1.0.0',
                    description: 'Module E',
                    dependencies: []
                });

                const result = detectCircularDependencies('module-a');

                expect(result.hasCircular).toBe(true);
                expect(result.circularPath).toContain('module-b');
            });

            it('should not report false positive for diamond dependency pattern', () => {
                // Diamond pattern (not circular):
                //     A
                //    / \
                //   B   C
                //    \ /
                //     D
                moduleRegistry.register({
                    name: 'module-a',
                    displayName: 'Module A',
                    version: '1.0.0',
                    description: 'Module A',
                    dependencies: ['module-b', 'module-c']
                });

                moduleRegistry.register({
                    name: 'module-b',
                    displayName: 'Module B',
                    version: '1.0.0',
                    description: 'Module B',
                    dependencies: ['module-d']
                });

                moduleRegistry.register({
                    name: 'module-c',
                    displayName: 'Module C',
                    version: '1.0.0',
                    description: 'Module C',
                    dependencies: ['module-d']
                });

                moduleRegistry.register({
                    name: 'module-d',
                    displayName: 'Module D',
                    version: '1.0.0',
                    description: 'Module D',
                    dependencies: []
                });

                const result = detectCircularDependencies('module-a');

                expect(result.hasCircular).toBe(false);
            });

            it('should handle module with no dependencies', () => {
                moduleRegistry.register({
                    name: 'hr-core',
                    displayName: 'HR Core',
                    version: '1.0.0',
                    description: 'Core HR functionality',
                    dependencies: []
                });

                const result = detectCircularDependencies('hr-core');

                expect(result.hasCircular).toBe(false);
            });

            it('should handle non-existent module gracefully', () => {
                const result = detectCircularDependencies('non-existent');

                expect(result.hasCircular).toBe(false);
            });
        });
    });

    describe('validateDependencies', () => {
        it('should validate module with all dependencies in registry', () => {
            moduleRegistry.register({
                name: 'hr-core',
                displayName: 'HR Core',
                version: '1.0.0',
                description: 'Core HR functionality',
                dependencies: []
            });

            moduleRegistry.register({
                name: 'tasks',
                displayName: 'Tasks',
                version: '1.0.0',
                description: 'Task management',
                dependencies: ['hr-core']
            });

            const result = validateDependencies('tasks');

            expect(result.valid).toBe(true);
            expect(result.message).toContain('dependencies are valid');
        });

        it('should reject module with dependencies not in registry', () => {
            moduleRegistry.register({
                name: 'tasks',
                displayName: 'Tasks',
                version: '1.0.0',
                description: 'Task management',
                dependencies: ['hr-core', 'non-existent-module']
            });

            const result = validateDependencies('tasks');

            expect(result.valid).toBe(false);
            expect(result.missingFromRegistry).toContain('hr-core');
            expect(result.missingFromRegistry).toContain('non-existent-module');
        });

        it('should reject module with circular dependencies', () => {
            moduleRegistry.register({
                name: 'module-a',
                displayName: 'Module A',
                version: '1.0.0',
                description: 'Module A',
                dependencies: ['module-b']
            });

            moduleRegistry.register({
                name: 'module-b',
                displayName: 'Module B',
                version: '1.0.0',
                description: 'Module B',
                dependencies: ['module-a']
            });

            const result = validateDependencies('module-a');

            expect(result.valid).toBe(false);
            expect(result.circularDependency).toBeDefined();
            expect(result.message).toContain('Circular dependency detected');
        });

        it('should throw error for non-existent module', () => {
            expect(() => {
                validateDependencies('non-existent');
            }).toThrow(AppError);

            expect(() => {
                validateDependencies('non-existent');
            }).toThrow('Module not found');
        });
    });

    describe('canDisableModule', () => {
        it('should allow disabling module with no dependents', () => {
            moduleRegistry.register({
                name: 'hr-core',
                displayName: 'HR Core',
                version: '1.0.0',
                description: 'Core HR functionality',
                dependencies: []
            });

            moduleRegistry.register({
                name: 'tasks',
                displayName: 'Tasks',
                version: '1.0.0',
                description: 'Task management',
                dependencies: ['hr-core']
            });

            // Try to disable tasks (no other module depends on it)
            const result = canDisableModule('tasks', ['hr-core', 'tasks']);

            expect(result.canDisable).toBe(true);
            expect(result.dependentModules).toHaveLength(0);
        });

        it('should prevent disabling module with enabled dependents', () => {
            moduleRegistry.register({
                name: 'hr-core',
                displayName: 'HR Core',
                version: '1.0.0',
                description: 'Core HR functionality',
                dependencies: []
            });

            moduleRegistry.register({
                name: 'tasks',
                displayName: 'Tasks',
                version: '1.0.0',
                description: 'Task management',
                dependencies: ['hr-core']
            });

            // Try to disable hr-core while tasks is enabled
            const result = canDisableModule('hr-core', ['hr-core', 'tasks']);

            expect(result.canDisable).toBe(false);
            expect(result.dependentModules).toContain('tasks');
            expect(result.message).toContain('required by');
        });

        it('should allow disabling module when dependents are not enabled', () => {
            moduleRegistry.register({
                name: 'hr-core',
                displayName: 'HR Core',
                version: '1.0.0',
                description: 'Core HR functionality',
                dependencies: []
            });

            moduleRegistry.register({
                name: 'tasks',
                displayName: 'Tasks',
                version: '1.0.0',
                description: 'Task management',
                dependencies: ['hr-core']
            });

            // Try to disable hr-core when tasks is not enabled
            const result = canDisableModule('hr-core', ['hr-core']);

            expect(result.canDisable).toBe(true);
            expect(result.dependentModules).toHaveLength(0);
        });

        it('should prevent disabling module with multiple enabled dependents', () => {
            moduleRegistry.register({
                name: 'hr-core',
                displayName: 'HR Core',
                version: '1.0.0',
                description: 'Core HR functionality',
                dependencies: []
            });

            moduleRegistry.register({
                name: 'tasks',
                displayName: 'Tasks',
                version: '1.0.0',
                description: 'Task management',
                dependencies: ['hr-core']
            });

            moduleRegistry.register({
                name: 'payroll',
                displayName: 'Payroll',
                version: '1.0.0',
                description: 'Payroll processing',
                dependencies: ['hr-core']
            });

            // Try to disable hr-core while both tasks and payroll are enabled
            const result = canDisableModule('hr-core', ['hr-core', 'tasks', 'payroll']);

            expect(result.canDisable).toBe(false);
            expect(result.dependentModules).toContain('tasks');
            expect(result.dependentModules).toContain('payroll');
            expect(result.dependentModules).toHaveLength(2);
        });
    });

    describe('getDependencyTree', () => {
        it('should return empty array for module with no dependencies', () => {
            moduleRegistry.register({
                name: 'hr-core',
                displayName: 'HR Core',
                version: '1.0.0',
                description: 'Core HR functionality',
                dependencies: []
            });

            const tree = getDependencyTree('hr-core');

            expect(tree).toHaveLength(0);
        });

        it('should return direct dependencies', () => {
            moduleRegistry.register({
                name: 'hr-core',
                displayName: 'HR Core',
                version: '1.0.0',
                description: 'Core HR functionality',
                dependencies: []
            });

            moduleRegistry.register({
                name: 'tasks',
                displayName: 'Tasks',
                version: '1.0.0',
                description: 'Task management',
                dependencies: ['hr-core']
            });

            const tree = getDependencyTree('tasks');

            expect(tree).toContain('hr-core');
            expect(tree).toHaveLength(1);
        });

        it('should return transitive dependencies', () => {
            moduleRegistry.register({
                name: 'hr-core',
                displayName: 'HR Core',
                version: '1.0.0',
                description: 'Core HR functionality',
                dependencies: []
            });

            moduleRegistry.register({
                name: 'email-service',
                displayName: 'Email Service',
                version: '1.0.0',
                description: 'Email functionality',
                dependencies: ['hr-core']
            });

            moduleRegistry.register({
                name: 'tasks',
                displayName: 'Tasks',
                version: '1.0.0',
                description: 'Task management',
                dependencies: ['email-service']
            });

            const tree = getDependencyTree('tasks');

            expect(tree).toContain('hr-core');
            expect(tree).toContain('email-service');
            expect(tree).toHaveLength(2);
        });

        it('should handle diamond dependency pattern without duplicates', () => {
            moduleRegistry.register({
                name: 'hr-core',
                displayName: 'HR Core',
                version: '1.0.0',
                description: 'Core HR functionality',
                dependencies: []
            });

            moduleRegistry.register({
                name: 'module-b',
                displayName: 'Module B',
                version: '1.0.0',
                description: 'Module B',
                dependencies: ['hr-core']
            });

            moduleRegistry.register({
                name: 'module-c',
                displayName: 'Module C',
                version: '1.0.0',
                description: 'Module C',
                dependencies: ['hr-core']
            });

            moduleRegistry.register({
                name: 'module-a',
                displayName: 'Module A',
                version: '1.0.0',
                description: 'Module A',
                dependencies: ['module-b', 'module-c']
            });

            const tree = getDependencyTree('module-a');

            // Should contain hr-core only once despite two paths to it
            expect(tree).toContain('hr-core');
            expect(tree).toContain('module-b');
            expect(tree).toContain('module-c');
            expect(tree.filter(dep => dep === 'hr-core')).toHaveLength(1);
        });
    });

    describe('getLoadOrder', () => {
        it('should return modules in dependency order', () => {
            moduleRegistry.register({
                name: 'hr-core',
                displayName: 'HR Core',
                version: '1.0.0',
                description: 'Core HR functionality',
                dependencies: []
            });

            moduleRegistry.register({
                name: 'tasks',
                displayName: 'Tasks',
                version: '1.0.0',
                description: 'Task management',
                dependencies: ['hr-core']
            });

            const order = getLoadOrder(['tasks', 'hr-core']);

            // hr-core should come before tasks
            expect(order.indexOf('hr-core')).toBeLessThan(order.indexOf('tasks'));
        });

        it('should handle complex dependency chains', () => {
            moduleRegistry.register({
                name: 'hr-core',
                displayName: 'HR Core',
                version: '1.0.0',
                description: 'Core HR functionality',
                dependencies: []
            });

            moduleRegistry.register({
                name: 'email-service',
                displayName: 'Email Service',
                version: '1.0.0',
                description: 'Email functionality',
                dependencies: []
            });

            moduleRegistry.register({
                name: 'tasks',
                displayName: 'Tasks',
                version: '1.0.0',
                description: 'Task management',
                dependencies: ['hr-core', 'email-service']
            });

            const order = getLoadOrder(['tasks', 'email-service', 'hr-core']);

            // Both hr-core and email-service should come before tasks
            expect(order.indexOf('hr-core')).toBeLessThan(order.indexOf('tasks'));
            expect(order.indexOf('email-service')).toBeLessThan(order.indexOf('tasks'));
        });

        it('should handle modules with no dependencies', () => {
            moduleRegistry.register({
                name: 'hr-core',
                displayName: 'HR Core',
                version: '1.0.0',
                description: 'Core HR functionality',
                dependencies: []
            });

            moduleRegistry.register({
                name: 'email-service',
                displayName: 'Email Service',
                version: '1.0.0',
                description: 'Email functionality',
                dependencies: []
            });

            const order = getLoadOrder(['hr-core', 'email-service']);

            // Both should be in the result
            expect(order).toContain('hr-core');
            expect(order).toContain('email-service');
            expect(order).toHaveLength(2);
        });
    });
});
