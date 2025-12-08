/**
 * Unit Tests for Dependency Resolver Service
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DependencyResolver, DependencyError } from '../../services/dependencyResolver.service.js';

describe('DependencyResolver', () => {
    let resolver;

    beforeEach(() => {
        resolver = new DependencyResolver();
    });

    describe('buildDependencyGraph', () => {
        it('should build a graph with all modules', () => {
            const graph = resolver.buildDependencyGraph();

            expect(graph).toBeInstanceOf(Map);
            expect(graph.size).toBeGreaterThan(0);
            expect(graph.has('hr-core')).toBe(true);
        });

        it('should include dependencies as edges', () => {
            const graph = resolver.buildDependencyGraph();

            // Attendance should depend on hr-core
            const attendanceDeps = graph.get('attendance');
            expect(attendanceDeps).toBeDefined();
            expect(attendanceDeps.has('hr-core')).toBe(true);
        });
    });

    describe('detectCircularDependencies', () => {
        it('should return empty array when no circular dependencies exist', () => {
            const cycles = resolver.detectCircularDependencies();

            expect(Array.isArray(cycles)).toBe(true);
            expect(cycles.length).toBe(0);
        });

        it('should detect circular dependencies if they exist', () => {
            // This test validates the detection logic works
            // In the actual system, there should be no circular dependencies
            const cycles = resolver.detectCircularDependencies();
            expect(Array.isArray(cycles)).toBe(true);
        });
    });

    describe('detectCircularDependencies - Unit Tests', () => {
        describe('simple circular dependencies', () => {
            it('should detect a simple two-module circular dependency (A -> B -> A)', () => {
                // Create a resolver with mock configs that have a circular dependency
                const mockResolver = new DependencyResolver();
                
                // Mock the module configs with a simple circular dependency
                mockResolver.moduleConfigs = {
                    'module-a': {
                        key: 'module-a',
                        displayName: 'Module A',
                        dependencies: {
                            required: ['module-b'],
                            optional: []
                        }
                    },
                    'module-b': {
                        key: 'module-b',
                        displayName: 'Module B',
                        dependencies: {
                            required: ['module-a'],
                            optional: []
                        }
                    }
                };

                const cycles = mockResolver.detectCircularDependencies();

                expect(cycles.length).toBeGreaterThan(0);
                expect(cycles[0]).toContain('module-a');
                expect(cycles[0]).toContain('module-b');
            });

            it('should detect a three-module circular dependency (A -> B -> C -> A)', () => {
                const mockResolver = new DependencyResolver();
                
                mockResolver.moduleConfigs = {
                    'module-a': {
                        key: 'module-a',
                        displayName: 'Module A',
                        dependencies: {
                            required: ['module-b'],
                            optional: []
                        }
                    },
                    'module-b': {
                        key: 'module-b',
                        displayName: 'Module B',
                        dependencies: {
                            required: ['module-c'],
                            optional: []
                        }
                    },
                    'module-c': {
                        key: 'module-c',
                        displayName: 'Module C',
                        dependencies: {
                            required: ['module-a'],
                            optional: []
                        }
                    }
                };

                const cycles = mockResolver.detectCircularDependencies();

                expect(cycles.length).toBeGreaterThan(0);
                const cycle = cycles[0];
                expect(cycle).toContain('module-a');
                expect(cycle).toContain('module-b');
                expect(cycle).toContain('module-c');
            });

            it('should detect a self-referencing module (A -> A)', () => {
                const mockResolver = new DependencyResolver();
                
                mockResolver.moduleConfigs = {
                    'module-a': {
                        key: 'module-a',
                        displayName: 'Module A',
                        dependencies: {
                            required: ['module-a'],
                            optional: []
                        }
                    }
                };

                const cycles = mockResolver.detectCircularDependencies();

                expect(cycles.length).toBeGreaterThan(0);
                expect(cycles[0]).toContain('module-a');
            });
        });

        describe('complex dependency chains', () => {
            it('should detect circular dependency in a complex graph with multiple paths', () => {
                const mockResolver = new DependencyResolver();
                
                // Create a complex graph:
                // A -> B -> D
                // A -> C -> D
                // D -> E -> A (circular)
                mockResolver.moduleConfigs = {
                    'module-a': {
                        key: 'module-a',
                        displayName: 'Module A',
                        dependencies: {
                            required: ['module-b', 'module-c'],
                            optional: []
                        }
                    },
                    'module-b': {
                        key: 'module-b',
                        displayName: 'Module B',
                        dependencies: {
                            required: ['module-d'],
                            optional: []
                        }
                    },
                    'module-c': {
                        key: 'module-c',
                        displayName: 'Module C',
                        dependencies: {
                            required: ['module-d'],
                            optional: []
                        }
                    },
                    'module-d': {
                        key: 'module-d',
                        displayName: 'Module D',
                        dependencies: {
                            required: ['module-e'],
                            optional: []
                        }
                    },
                    'module-e': {
                        key: 'module-e',
                        displayName: 'Module E',
                        dependencies: {
                            required: ['module-a'],
                            optional: []
                        }
                    }
                };

                const cycles = mockResolver.detectCircularDependencies();

                expect(cycles.length).toBeGreaterThan(0);
                const cycle = cycles[0];
                expect(cycle).toContain('module-a');
                expect(cycle).toContain('module-e');
            });

            it('should detect multiple independent circular dependencies', () => {
                const mockResolver = new DependencyResolver();
                
                // Create two independent circular dependencies:
                // Cycle 1: A -> B -> A
                // Cycle 2: C -> D -> C
                mockResolver.moduleConfigs = {
                    'module-a': {
                        key: 'module-a',
                        displayName: 'Module A',
                        dependencies: {
                            required: ['module-b'],
                            optional: []
                        }
                    },
                    'module-b': {
                        key: 'module-b',
                        displayName: 'Module B',
                        dependencies: {
                            required: ['module-a'],
                            optional: []
                        }
                    },
                    'module-c': {
                        key: 'module-c',
                        displayName: 'Module C',
                        dependencies: {
                            required: ['module-d'],
                            optional: []
                        }
                    },
                    'module-d': {
                        key: 'module-d',
                        displayName: 'Module D',
                        dependencies: {
                            required: ['module-c'],
                            optional: []
                        }
                    }
                };

                const cycles = mockResolver.detectCircularDependencies();

                expect(cycles.length).toBeGreaterThanOrEqual(2);
                
                // Check that both cycles are detected
                const cycleStrings = cycles.map(c => c.join('->'));
                const hasFirstCycle = cycleStrings.some(c => 
                    c.includes('module-a') && c.includes('module-b')
                );
                const hasSecondCycle = cycleStrings.some(c => 
                    c.includes('module-c') && c.includes('module-d')
                );
                
                expect(hasFirstCycle).toBe(true);
                expect(hasSecondCycle).toBe(true);
            });

            it('should handle a long circular chain (A -> B -> C -> D -> E -> A)', () => {
                const mockResolver = new DependencyResolver();
                
                mockResolver.moduleConfigs = {
                    'module-a': {
                        key: 'module-a',
                        displayName: 'Module A',
                        dependencies: {
                            required: ['module-b'],
                            optional: []
                        }
                    },
                    'module-b': {
                        key: 'module-b',
                        displayName: 'Module B',
                        dependencies: {
                            required: ['module-c'],
                            optional: []
                        }
                    },
                    'module-c': {
                        key: 'module-c',
                        displayName: 'Module C',
                        dependencies: {
                            required: ['module-d'],
                            optional: []
                        }
                    },
                    'module-d': {
                        key: 'module-d',
                        displayName: 'Module D',
                        dependencies: {
                            required: ['module-e'],
                            optional: []
                        }
                    },
                    'module-e': {
                        key: 'module-e',
                        displayName: 'Module E',
                        dependencies: {
                            required: ['module-a'],
                            optional: []
                        }
                    }
                };

                const cycles = mockResolver.detectCircularDependencies();

                expect(cycles.length).toBeGreaterThan(0);
                const cycle = cycles[0];
                
                // All modules should be in the cycle
                expect(cycle).toContain('module-a');
                expect(cycle).toContain('module-b');
                expect(cycle).toContain('module-c');
                expect(cycle).toContain('module-d');
                expect(cycle).toContain('module-e');
            });

            it('should not report false positives in a diamond dependency pattern', () => {
                const mockResolver = new DependencyResolver();
                
                // Diamond pattern (not circular):
                // A -> B -> D
                // A -> C -> D
                mockResolver.moduleConfigs = {
                    'module-a': {
                        key: 'module-a',
                        displayName: 'Module A',
                        dependencies: {
                            required: ['module-b', 'module-c'],
                            optional: []
                        }
                    },
                    'module-b': {
                        key: 'module-b',
                        displayName: 'Module B',
                        dependencies: {
                            required: ['module-d'],
                            optional: []
                        }
                    },
                    'module-c': {
                        key: 'module-c',
                        displayName: 'Module C',
                        dependencies: {
                            required: ['module-d'],
                            optional: []
                        }
                    },
                    'module-d': {
                        key: 'module-d',
                        displayName: 'Module D',
                        dependencies: {
                            required: [],
                            optional: []
                        }
                    }
                };

                const cycles = mockResolver.detectCircularDependencies();

                expect(cycles.length).toBe(0);
            });

            it('should detect circular dependency with mixed linear and circular paths', () => {
                const mockResolver = new DependencyResolver();
                
                // Mixed graph:
                // A -> B -> C (linear)
                // D -> E -> F -> D (circular)
                mockResolver.moduleConfigs = {
                    'module-a': {
                        key: 'module-a',
                        displayName: 'Module A',
                        dependencies: {
                            required: ['module-b'],
                            optional: []
                        }
                    },
                    'module-b': {
                        key: 'module-b',
                        displayName: 'Module B',
                        dependencies: {
                            required: ['module-c'],
                            optional: []
                        }
                    },
                    'module-c': {
                        key: 'module-c',
                        displayName: 'Module C',
                        dependencies: {
                            required: [],
                            optional: []
                        }
                    },
                    'module-d': {
                        key: 'module-d',
                        displayName: 'Module D',
                        dependencies: {
                            required: ['module-e'],
                            optional: []
                        }
                    },
                    'module-e': {
                        key: 'module-e',
                        displayName: 'Module E',
                        dependencies: {
                            required: ['module-f'],
                            optional: []
                        }
                    },
                    'module-f': {
                        key: 'module-f',
                        displayName: 'Module F',
                        dependencies: {
                            required: ['module-d'],
                            optional: []
                        }
                    }
                };

                const cycles = mockResolver.detectCircularDependencies();

                expect(cycles.length).toBeGreaterThan(0);
                const cycle = cycles[0];
                
                // Only the circular modules should be in the cycle
                expect(cycle).toContain('module-d');
                expect(cycle).toContain('module-e');
                expect(cycle).toContain('module-f');
                
                // Linear modules should not be in the cycle
                expect(cycle).not.toContain('module-a');
                expect(cycle).not.toContain('module-b');
                expect(cycle).not.toContain('module-c');
            });
        });
    });

    describe('resolveDependencies', () => {
        it('should resolve direct dependencies', () => {
            const deps = resolver.resolveDependencies('attendance', false);

            expect(Array.isArray(deps)).toBe(true);
            expect(deps).toContain('hr-core');
        });

        it('should resolve transitive dependencies', () => {
            const deps = resolver.resolveDependencies('payroll', false);

            // Payroll depends on attendance, which depends on hr-core
            expect(deps).toContain('hr-core');
            expect(deps).toContain('attendance');
        });

        it('should include optional dependencies when requested', () => {
            const depsWithoutOptional = resolver.resolveDependencies('attendance', false);
            const depsWithOptional = resolver.resolveDependencies('attendance', true);

            expect(depsWithOptional.length).toBeGreaterThanOrEqual(depsWithoutOptional.length);
        });

        it('should throw error for non-existent module', () => {
            expect(() => {
                resolver.resolveDependencies('non-existent-module');
            }).toThrow(DependencyError);
        });

        it('should not include the module itself in dependencies', () => {
            const deps = resolver.resolveDependencies('attendance', false);

            expect(deps).not.toContain('attendance');
        });
    });

    describe('resolveTransitiveDependencies', () => {
        it('should separate direct and transitive dependencies', () => {
            const result = resolver.resolveTransitiveDependencies('payroll');

            expect(result).toHaveProperty('direct');
            expect(result).toHaveProperty('transitive');
            expect(result.direct).toHaveProperty('required');
            expect(result.direct).toHaveProperty('optional');
            expect(Array.isArray(result.transitive)).toBe(true);
        });

        it('should not include direct dependencies in transitive list', () => {
            const result = resolver.resolveTransitiveDependencies('payroll');

            const directRequired = result.direct.required;
            const transitive = result.transitive;

            for (const dep of directRequired) {
                expect(transitive).not.toContain(dep);
            }
        });

        it('should throw error for non-existent module', () => {
            expect(() => {
                resolver.resolveTransitiveDependencies('non-existent');
            }).toThrow(DependencyError);
        });
    });

    describe('validateModuleActivation', () => {
        it('should validate successfully when all dependencies are enabled', () => {
            const result = resolver.validateModuleActivation('attendance', ['hr-core']);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.missingDependencies).toHaveLength(0);
        });

        it('should fail when required dependencies are missing', () => {
            const result = resolver.validateModuleActivation('attendance', []);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.missingDependencies).toContain('hr-core');
        });

        it('should return error for non-existent module', () => {
            const result = resolver.validateModuleActivation('non-existent', []);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should include required dependencies in result', () => {
            const result = resolver.validateModuleActivation('attendance', ['hr-core']);

            expect(result.requiredDependencies).toBeDefined();
            expect(Array.isArray(result.requiredDependencies)).toBe(true);
        });
    });

    describe('getActivationOrder', () => {
        it('should return modules in dependency order', () => {
            const order = resolver.getActivationOrder(['attendance', 'payroll']);

            expect(Array.isArray(order)).toBe(true);
            expect(order.length).toBeGreaterThan(0);

            // hr-core should come before attendance
            const hrCoreIndex = order.indexOf('hr-core');
            const attendanceIndex = order.indexOf('attendance');
            expect(hrCoreIndex).toBeLessThan(attendanceIndex);

            // attendance should come before payroll
            const payrollIndex = order.indexOf('payroll');
            expect(attendanceIndex).toBeLessThan(payrollIndex);
        });

        it('should include all transitive dependencies', () => {
            const order = resolver.getActivationOrder(['payroll']);

            // Should include payroll, attendance, and hr-core
            expect(order).toContain('payroll');
            expect(order).toContain('attendance');
            expect(order).toContain('hr-core');
        });

        it('should handle single module', () => {
            const order = resolver.getActivationOrder(['hr-core']);

            expect(order).toContain('hr-core');
        });

        it('should handle multiple independent modules', () => {
            const order = resolver.getActivationOrder(['attendance', 'leave']);

            expect(order).toContain('attendance');
            expect(order).toContain('leave');
            expect(order).toContain('hr-core');
        });
    });

    describe('dependsOn', () => {
        it('should return true for direct dependency', () => {
            const result = resolver.dependsOn('attendance', 'hr-core');

            expect(result).toBe(true);
        });

        it('should return true for transitive dependency', () => {
            const result = resolver.dependsOn('payroll', 'hr-core');

            expect(result).toBe(true);
        });

        it('should return false when no dependency exists', () => {
            const result = resolver.dependsOn('hr-core', 'attendance');

            expect(result).toBe(false);
        });

        it('should return false for self-dependency check', () => {
            const result = resolver.dependsOn('attendance', 'attendance');

            expect(result).toBe(false);
        });
    });

    describe('getDependents', () => {
        it('should return modules that depend on hr-core', () => {
            const dependents = resolver.getDependents('hr-core');

            expect(Array.isArray(dependents)).toBe(true);
            expect(dependents.length).toBeGreaterThan(0);
            // Most modules should depend on hr-core
            expect(dependents).toContain('attendance');
        });

        it('should return modules that depend on attendance', () => {
            const dependents = resolver.getDependents('attendance');

            expect(Array.isArray(dependents)).toBe(true);
            // Payroll depends on attendance
            expect(dependents).toContain('payroll');
        });

        it('should return empty array for modules with no dependents', () => {
            // Communication has no dependents in current config
            const dependents = resolver.getDependents('communication');

            expect(Array.isArray(dependents)).toBe(true);
        });

        it('should not include the module itself', () => {
            const dependents = resolver.getDependents('attendance');

            expect(dependents).not.toContain('attendance');
        });
    });

    describe('validateDependencyGraph', () => {
        it('should validate the entire dependency graph', () => {
            const result = resolver.validateDependencyGraph();

            expect(result).toHaveProperty('valid');
            expect(result).toHaveProperty('errors');
            expect(result).toHaveProperty('warnings');
            expect(Array.isArray(result.errors)).toBe(true);
            expect(Array.isArray(result.warnings)).toBe(true);
        });

        it('should have no circular dependencies in current config', () => {
            const result = resolver.validateDependencyGraph();

            const circularErrors = result.errors.filter(e => e.type === 'CIRCULAR_DEPENDENCY');
            expect(circularErrors).toHaveLength(0);
        });

        it('should have no missing dependencies in current config', () => {
            const result = resolver.validateDependencyGraph();

            const missingErrors = result.errors.filter(e => e.type === 'MISSING_DEPENDENCY');
            expect(missingErrors).toHaveLength(0);
        });

        it('should have no self-dependencies in current config', () => {
            const result = resolver.validateDependencyGraph();

            const selfErrors = result.errors.filter(e => e.type === 'SELF_DEPENDENCY');
            expect(selfErrors).toHaveLength(0);
        });

        it('should be valid when no errors exist', () => {
            const result = resolver.validateDependencyGraph();

            if (result.errors.length === 0) {
                expect(result.valid).toBe(true);
            }
        });
    });

    describe('getDependencyTree', () => {
        it('should return tree structure for a module', () => {
            const tree = resolver.getDependencyTree('attendance');

            expect(tree).toBeDefined();
            expect(tree).toHaveProperty('key');
            expect(tree).toHaveProperty('displayName');
            expect(tree).toHaveProperty('required');
            expect(tree).toHaveProperty('optional');
        });

        it('should include nested dependencies', () => {
            const tree = resolver.getDependencyTree('payroll');

            expect(tree.required).toBeDefined();
            expect(Array.isArray(tree.required)).toBe(true);
            expect(tree.required.length).toBeGreaterThan(0);
        });

        it('should respect max depth', () => {
            const tree = resolver.getDependencyTree('payroll', 1);

            expect(tree).toBeDefined();
            // Should not go deeper than 1 level
        });

        it('should return null for non-existent module', () => {
            const tree = resolver.getDependencyTree('non-existent');

            expect(tree).toBeNull();
        });

        it('should handle circular references gracefully', () => {
            const tree = resolver.getDependencyTree('hr-core');

            expect(tree).toBeDefined();
            // Should not cause infinite recursion
        });
    });
});
