/**
 * Test Script for Permission Validation
 * 
 * Tests the permission validation functionality for role management
 * 
 * Usage: node server/scripts/testPermissionValidation.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { validatePermissions, isValidPermission, filterValidPermissions } from '../utils/permissionValidator.js';
import { PERMISSIONS } from '../platform/system/models/permission.system.js';

// Load environment variables
dotenv.config();

console.log('=== Permission Validation Test Suite ===\n');

// Test 1: Valid permissions
console.log('Test 1: Valid permissions');
const validPerms = ['users.view', 'users.create', 'documents.view'];
const result1 = validatePermissions(validPerms);
console.log('Input:', validPerms);
console.log('Result:', result1);
console.log('Expected: valid = true');
console.log('Status:', result1.valid ? '✓ PASS' : '✗ FAIL');
console.log('');

// Test 2: Invalid permissions
console.log('Test 2: Invalid permissions');
const invalidPerms = ['users.view', 'invalid.permission', 'fake.access'];
const result2 = validatePermissions(invalidPerms);
console.log('Input:', invalidPerms);
console.log('Result:', result2);
console.log('Expected: valid = false, invalidPermissions = [invalid.permission, fake.access]');
console.log('Status:', !result2.valid && result2.invalidPermissions.length === 2 ? '✓ PASS' : '✗ FAIL');
console.log('');

// Test 3: Duplicate permissions
console.log('Test 3: Duplicate permissions');
const duplicatePerms = ['users.view', 'users.create', 'users.view'];
const result3 = validatePermissions(duplicatePerms);
console.log('Input:', duplicatePerms);
console.log('Result:', result3);
console.log('Expected: valid = false, error about duplicates');
console.log('Status:', !result3.valid && result3.errors.some(e => e.includes('Duplicate')) ? '✓ PASS' : '✗ FAIL');
console.log('');

// Test 4: Empty array
console.log('Test 4: Empty permissions array');
const emptyPerms = [];
const result4 = validatePermissions(emptyPerms);
console.log('Input:', emptyPerms);
console.log('Result:', result4);
console.log('Expected: valid = false, error about at least one permission');
console.log('Status:', !result4.valid && result4.errors.some(e => e.includes('At least one')) ? '✓ PASS' : '✗ FAIL');
console.log('');

// Test 5: Not an array
console.log('Test 5: Non-array input');
const notArray = 'users.view';
const result5 = validatePermissions(notArray);
console.log('Input:', notArray);
console.log('Result:', result5);
console.log('Expected: valid = false, error about must be array');
console.log('Status:', !result5.valid && result5.errors.some(e => e.includes('must be an array')) ? '✓ PASS' : '✗ FAIL');
console.log('');

// Test 6: Check single permission validity
console.log('Test 6: Check single permission validity');
const validPerm = 'users.view';
const invalidPerm = 'invalid.permission';
const isValid1 = isValidPermission(validPerm);
const isValid2 = isValidPermission(invalidPerm);
console.log(`isValidPermission('${validPerm}'):`, isValid1);
console.log(`isValidPermission('${invalidPerm}'):`, isValid2);
console.log('Expected: true, false');
console.log('Status:', isValid1 && !isValid2 ? '✓ PASS' : '✗ FAIL');
console.log('');

// Test 7: Filter valid permissions
console.log('Test 7: Filter valid permissions');
const mixedPerms = ['users.view', 'invalid.perm', 'documents.view', 'fake.access'];
const filtered = filterValidPermissions(mixedPerms);
console.log('Input:', mixedPerms);
console.log('Filtered:', filtered);
console.log('Expected: [users.view, documents.view]');
console.log('Status:', filtered.length === 2 && filtered.includes('users.view') && filtered.includes('documents.view') ? '✓ PASS' : '✗ FAIL');
console.log('');

// Test 8: All system permissions are valid
console.log('Test 8: All system permissions are valid');
const allSystemPerms = Object.keys(PERMISSIONS);
const result8 = validatePermissions(allSystemPerms);
console.log(`Total system permissions: ${allSystemPerms.length}`);
console.log('Result:', result8.valid ? 'All valid' : 'Some invalid');
console.log('Expected: All valid');
console.log('Status:', result8.valid ? '✓ PASS' : '✗ FAIL');
if (!result8.valid) {
    console.log('Errors:', result8.errors);
    console.log('Invalid permissions:', result8.invalidPermissions);
}
console.log('');

// Summary
console.log('=== Test Summary ===');
console.log('All tests completed. Review results above.');
console.log('');
console.log('Available system permissions:', allSystemPerms.length);
console.log('Sample permissions:', allSystemPerms.slice(0, 5).join(', '), '...');
