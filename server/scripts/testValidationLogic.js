/**
 * Unit Test for Permission Validation Logic
 * 
 * Tests validation without requiring database connection
 * 
 * Usage: node server/scripts/testValidationLogic.js
 */

import { validatePermissions, isValidPermission, filterValidPermissions, getValidPermissions } from '../utils/permissionValidator.js';

console.log('=== Permission Validation Logic Test ===\n');

let passCount = 0;
let failCount = 0;

function runTest(testName, testFn, expected) {
    try {
        const result = testFn();
        const passed = JSON.stringify(result) === JSON.stringify(expected);
        
        if (passed) {
            console.log(`✓ PASS: ${testName}`);
            passCount++;
        } else {
            console.log(`✗ FAIL: ${testName}`);
            console.log('  Expected:', expected);
            console.log('  Got:', result);
            failCount++;
        }
    } catch (error) {
        console.log(`✗ ERROR: ${testName}`);
        console.log('  Error:', error.message);
        failCount++;
    }
}

// Test Suite
console.log('Running validation tests...\n');

// Test 1: Valid permissions
runTest(
    'Valid permissions should pass',
    () => {
        const result = validatePermissions(['users.view', 'documents.view']);
        return { valid: result.valid, errorCount: result.errors.length };
    },
    { valid: true, errorCount: 0 }
);

// Test 2: Invalid permissions
runTest(
    'Invalid permissions should fail',
    () => {
        const result = validatePermissions(['invalid.perm']);
        return { valid: result.valid, hasErrors: result.errors.length > 0, hasInvalid: result.invalidPermissions.length > 0 };
    },
    { valid: false, hasErrors: true, hasInvalid: true }
);

// Test 3: Duplicate permissions
runTest(
    'Duplicate permissions should fail',
    () => {
        const result = validatePermissions(['users.view', 'users.view']);
        return { valid: result.valid, hasDuplicateError: result.errors.some(e => e.includes('Duplicate')) };
    },
    { valid: false, hasDuplicateError: true }
);

// Test 4: Empty array
runTest(
    'Empty permissions array should fail',
    () => {
        const result = validatePermissions([]);
        return { valid: result.valid, hasEmptyError: result.errors.some(e => e.includes('At least one')) };
    },
    { valid: false, hasEmptyError: true }
);

// Test 5: Non-array input
runTest(
    'Non-array input should fail',
    () => {
        const result = validatePermissions('not-an-array');
        return { valid: result.valid, hasArrayError: result.errors.some(e => e.includes('must be an array')) };
    },
    { valid: false, hasArrayError: true }
);

// Test 6: Single permission check
runTest(
    'Valid single permission check',
    () => isValidPermission('users.view'),
    true
);

runTest(
    'Invalid single permission check',
    () => isValidPermission('invalid.permission'),
    false
);

// Test 7: Filter valid permissions
runTest(
    'Filter mixed permissions',
    () => {
        const filtered = filterValidPermissions(['users.view', 'invalid.perm', 'documents.view']);
        return { count: filtered.length, hasUsersView: filtered.includes('users.view'), hasDocsView: filtered.includes('documents.view') };
    },
    { count: 2, hasUsersView: true, hasDocsView: true }
);

// Test 8: Get valid permissions
runTest(
    'Get all valid permissions',
    () => {
        const validPerms = getValidPermissions();
        return { isArray: Array.isArray(validPerms), hasItems: validPerms.length > 0 };
    },
    { isArray: true, hasItems: true }
);

// Test 9: Mixed valid and invalid
runTest(
    'Mixed valid and invalid permissions',
    () => {
        const result = validatePermissions(['users.view', 'invalid.perm', 'documents.view', 'fake.access']);
        return { 
            valid: result.valid, 
            invalidCount: result.invalidPermissions.length,
            hasInvalidPerm: result.invalidPermissions.includes('invalid.perm'),
            hasFakeAccess: result.invalidPermissions.includes('fake.access')
        };
    },
    { valid: false, invalidCount: 2, hasInvalidPerm: true, hasFakeAccess: true }
);

// Test 10: All system permissions
runTest(
    'All system permissions should be valid',
    () => {
        const allPerms = getValidPermissions();
        const result = validatePermissions(allPerms);
        return { valid: result.valid, count: allPerms.length };
    },
    { valid: true, count: 89 } // Adjust count based on actual system permissions
);

// Summary
console.log('\n=== Test Summary ===');
console.log(`Total Tests: ${passCount + failCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

if (failCount === 0) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
} else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
}
