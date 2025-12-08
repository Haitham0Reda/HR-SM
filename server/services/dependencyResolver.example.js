/**
 * Dependency Resolver Usage Examples
 * 
 * This file demonstrates how to use the dependency resolver service
 * for module dependency management.
 */

import { dependencyResolver } from './dependencyResolver.service.js';
import {
    validateModuleActivation,
    getModuleActivationOrder,
    checkModuleDependency
} from '../config/commercialModuleRegistry.js';

// Example 1: Validate module activation
async function example1_validateActivation() {
    console.log('Example 1: Validate Module Activation');
    console.log('=====================================\n');

    // Try to activate attendance with hr-core enabled
    const result1 = await validateModuleActivation('attendance', ['hr-core']);
    console.log('Activating attendance with hr-core:', result1.valid ? 'SUCCESS' : 'FAILED');

    // Try to activate attendance without hr-core
    const result2 = await validateModuleActivation('attendance', []);
    console.log('Activating attendance without hr-core:', result2.valid ? 'SUCCESS' : 'FAILED');
    console.log('Missing dependencies:', result2.missingDependencies);
    console.log('\n');
}

// Example 2: Get activation order
async function example2_activationOrder() {
    console.log('Example 2: Get Activation Order');
    console.log('================================\n');

    // Get order for activating payroll (which depends on attendance and hr-core)
    const order = await getModuleActivationOrder(['payroll']);
    console.log('Activation order for payroll:', order);
    console.log('This ensures dependencies are activated first\n');
}

// Example 3: Check dependencies
async function example3_checkDependencies() {
    console.log('Example 3: Check Dependencies');
    console.log('=============================\n');

    // Check if payroll depends on hr-core
    const depends1 = await checkModuleDependency('payroll', 'hr-core');
    console.log('Does payroll depend on hr-core?', depends1);

    // Check if hr-core depends on payroll
    const depends2 = await checkModuleDependency('hr-core', 'payroll');
    console.log('Does hr-core depend on payroll?', depends2);
    console.log('\n');
}

// Example 4: Resolve all dependencies
function example4_resolveDependencies() {
    console.log('Example 4: Resolve All Dependencies');
    console.log('===================================\n');

    // Get all dependencies for payroll
    const deps = dependencyResolver.resolveDependencies('payroll', false);
    console.log('All dependencies for payroll:', deps);

    // Get dependencies including optional ones
    const depsWithOptional = dependencyResolver.resolveDependencies('payroll', true);
    console.log('Dependencies including optional:', depsWithOptional);
    console.log('\n');
}

// Example 5: Get transitive dependencies
function example5_transitiveDependencies() {
    console.log('Example 5: Transitive Dependencies');
    console.log('==================================\n');

    // Get direct and transitive dependencies separately
    const result = dependencyResolver.resolveTransitiveDependencies('payroll');
    console.log('Direct required dependencies:', result.direct.required);
    console.log('Direct optional dependencies:', result.direct.optional);
    console.log('Transitive dependencies:', result.transitive);
    console.log('\n');
}

// Example 6: Get dependents
function example6_getDependents() {
    console.log('Example 6: Get Dependents');
    console.log('=========================\n');

    // Find all modules that depend on hr-core
    const dependents = dependencyResolver.getDependents('hr-core');
    console.log('Modules that depend on hr-core:', dependents);

    // Find all modules that depend on attendance
    const attendanceDependents = dependencyResolver.getDependents('attendance');
    console.log('Modules that depend on attendance:', attendanceDependents);
    console.log('\n');
}

// Example 7: Validate entire dependency graph
function example7_validateGraph() {
    console.log('Example 7: Validate Dependency Graph');
    console.log('====================================\n');

    const validation = dependencyResolver.validateDependencyGraph();
    console.log('Graph is valid:', validation.valid);
    console.log('Errors:', validation.errors.length);
    console.log('Warnings:', validation.warnings.length);

    if (validation.warnings.length > 0) {
        console.log('Warning details:', validation.warnings);
    }
    console.log('\n');
}

// Example 8: Get dependency tree
function example8_dependencyTree() {
    console.log('Example 8: Dependency Tree');
    console.log('==========================\n');

    const tree = dependencyResolver.getDependencyTree('payroll', 3);
    console.log('Dependency tree for payroll:');
    console.log(JSON.stringify(tree, null, 2));
    console.log('\n');
}

// Example 9: Detect circular dependencies
function example9_circularDependencies() {
    console.log('Example 9: Detect Circular Dependencies');
    console.log('=======================================\n');

    const cycles = dependencyResolver.detectCircularDependencies();
    if (cycles.length === 0) {
        console.log('No circular dependencies detected ✓');
    } else {
        console.log('Circular dependencies found:');
        cycles.forEach((cycle, index) => {
            console.log(`  ${index + 1}. ${cycle.join(' -> ')}`);
        });
    }
    console.log('\n');
}

// Example 10: Build dependency graph
function example10_buildGraph() {
    console.log('Example 10: Build Dependency Graph');
    console.log('==================================\n');

    const graph = dependencyResolver.buildDependencyGraph();
    console.log('Dependency graph (adjacency list):');

    for (const [module, deps] of graph.entries()) {
        if (deps.size > 0) {
            console.log(`  ${module} -> [${Array.from(deps).join(', ')}]`);
        }
    }
    console.log('\n');
}

// Run all examples
async function runAllExamples() {
    console.log('\n===========================================');
    console.log('DEPENDENCY RESOLVER USAGE EXAMPLES');
    console.log('===========================================\n');

    await example1_validateActivation();
    await example2_activationOrder();
    await example3_checkDependencies();
    example4_resolveDependencies();
    example5_transitiveDependencies();
    example6_getDependents();
    example7_validateGraph();
    example8_dependencyTree();
    example9_circularDependencies();
    example10_buildGraph();

    console.log('===========================================');
    console.log('All examples completed!');
    console.log('===========================================\n');
}

// Uncomment to run examples
// runAllExamples().catch(console.error);

export {
    example1_validateActivation,
    example2_activationOrder,
    example3_checkDependencies,
    example4_resolveDependencies,
    example5_transitiveDependencies,
    example6_getDependents,
    example7_validateGraph,
    example8_dependencyTree,
    example9_circularDependencies,
    example10_buildGraph,
    runAllExamples
};
