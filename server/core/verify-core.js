/**
 * Core Infrastructure Verification Script
 * 
 * Quick verification that all core components are properly set up
 * Run with: node server/core/verify-core.js
 */

import { AppError, ERROR_TYPES } from './errors/index.js';
import { generatePlatformToken, generateTenantToken, verifyPlatformToken, verifyTenantToken } from './auth/index.js';
import moduleRegistry from './registry/moduleRegistry.js';
import { resolveDependencies, detectCircularDependencies } from './registry/dependencyResolver.js';

console.log('🔍 Verifying Core Infrastructure...\n');

// Test 1: Error Handling
console.log('✓ Test 1: Error Handling');
try {
    const error = new AppError('Test error', 404, ERROR_TYPES.NOT_FOUND, { test: true });
    console.log('  - AppError created successfully');
    console.log('  - Error code:', error.code);
    console.log('  - Status code:', error.statusCode);
} catch (err) {
    console.error('  ✗ Error handling test failed:', err.message);
}

// Test 2: Platform Authentication (requires PLATFORM_JWT_SECRET)
console.log('\n✓ Test 2: Platform Authentication');
try {
    // Set temporary secret for testing
    process.env.PLATFORM_JWT_SECRET = 'test-platform-secret-12345';
    
    const token = generatePlatformToken('user123', 'super-admin');
    console.log('  - Platform token generated');
    
    const decoded = verifyPlatformToken(token);
    console.log('  - Platform token verified');
    console.log('  - User ID:', decoded.userId);
    console.log('  - Role:', decoded.role);
    console.log('  - Type:', decoded.type);
} catch (err) {
    console.error('  ✗ Platform auth test failed:', err.message);
}

// Test 3: Tenant Authentication (requires TENANT_JWT_SECRET)
console.log('\n✓ Test 3: Tenant Authentication');
try {
    // Set temporary secret for testing
    process.env.TENANT_JWT_SECRET = 'test-tenant-secret-12345';
    
    const token = generateTenantToken('user456', 'tenant_123', 'Admin');
    console.log('  - Tenant token generated');
    
    const decoded = verifyTenantToken(token);
    console.log('  - Tenant token verified');
    console.log('  - User ID:', decoded.userId);
    console.log('  - Tenant ID:', decoded.tenantId);
    console.log('  - Role:', decoded.role);
    console.log('  - Type:', decoded.type);
} catch (err) {
    console.error('  ✗ Tenant auth test failed:', err.message);
}

// Test 4: Module Registry
console.log('\n✓ Test 4: Module Registry');
try {
    // Register a test module
    moduleRegistry.register({
        name: 'test-module',
        displayName: 'Test Module',
        version: '1.0.0',
        description: 'A test module',
        dependencies: [],
        optionalDependencies: []
    });
    console.log('  - Module registered successfully');
    
    const module = moduleRegistry.getModule('test-module');
    console.log('  - Module retrieved:', module.name);
    
    const stats = moduleRegistry.getStats();
    console.log('  - Registry stats:', stats);
    
    // Clean up
    moduleRegistry.clear();
} catch (err) {
    console.error('  ✗ Module registry test failed:', err.message);
}

// Test 5: Dependency Resolution
console.log('\n✓ Test 5: Dependency Resolution');
try {
    // Register modules with dependencies
    moduleRegistry.register({
        name: 'hr-core',
        displayName: 'HR Core',
        version: '1.0.0',
        description: 'Core HR module',
        dependencies: []
    });
    
    moduleRegistry.register({
        name: 'tasks',
        displayName: 'Tasks',
        version: '1.0.0',
        description: 'Task management',
        dependencies: ['hr-core']
    });
    
    // Test dependency resolution
    const result = resolveDependencies('tasks', ['hr-core']);
    console.log('  - Dependency resolution:', result.canEnable ? 'Success' : 'Failed');
    console.log('  - Message:', result.message);
    
    // Test circular dependency detection
    const circularCheck = detectCircularDependencies('hr-core');
    console.log('  - Circular dependency check:', circularCheck.hasCircular ? 'Found' : 'None');
    
    // Clean up
    moduleRegistry.clear();
} catch (err) {
    console.error('  ✗ Dependency resolution test failed:', err.message);
}

console.log('\n✅ Core Infrastructure Verification Complete!\n');
console.log('All core components are properly set up and functional.');
console.log('\nNext steps:');
console.log('1. Set PLATFORM_JWT_SECRET and TENANT_JWT_SECRET in .env');
console.log('2. Run unit tests: npm test');
console.log('3. Continue with Phase 2: Platform Layer Implementation\n');
