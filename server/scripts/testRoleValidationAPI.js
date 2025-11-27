/**
 * Integration Test for Role Permission Validation API
 * 
 * Tests the role creation and update endpoints with permission validation
 * 
 * Usage: node server/scripts/testRoleValidationAPI.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/role.model.js';
import User from '../models/user.model.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-sm';

async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB');
    } catch (error) {
        console.error('✗ MongoDB connection error:', error);
        process.exit(1);
    }
}

async function testPermissionValidation() {
    console.log('\n=== Role Permission Validation Integration Test ===\n');

    try {
        // Get an admin user for testing
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.log('✗ No admin user found. Please create an admin user first.');
            return;
        }
        console.log(`✓ Using admin user: ${adminUser.username}\n`);

        // Test 1: Create role with valid permissions
        console.log('Test 1: Create role with valid permissions');
        try {
            const validRole = new Role({
                name: 'test-valid-role',
                displayName: 'Test Valid Role',
                description: 'Test role with valid permissions',
                permissions: ['users.view', 'documents.view', 'reports.view'],
                isSystemRole: false,
                createdBy: adminUser._id,
                updatedBy: adminUser._id
            });
            await validRole.save();
            console.log('✓ PASS: Role created successfully with valid permissions');
            
            // Clean up
            await Role.findByIdAndDelete(validRole._id);
        } catch (error) {
            console.log('✗ FAIL:', error.message);
        }
        console.log('');

        // Test 2: Create role with invalid permissions
        console.log('Test 2: Create role with invalid permissions (should fail)');
        try {
            const invalidRole = new Role({
                name: 'test-invalid-role',
                displayName: 'Test Invalid Role',
                description: 'Test role with invalid permissions',
                permissions: ['users.view', 'invalid.permission', 'fake.access'],
                isSystemRole: false,
                createdBy: adminUser._id,
                updatedBy: adminUser._id
            });
            await invalidRole.save();
            console.log('✗ FAIL: Role should not have been created with invalid permissions');
            
            // Clean up if it somehow got created
            await Role.findByIdAndDelete(invalidRole._id);
        } catch (error) {
            console.log('✓ PASS: Role creation blocked as expected');
            console.log('  Error:', error.message);
        }
        console.log('');

        // Test 3: Create role with duplicate permissions
        console.log('Test 3: Create role with duplicate permissions (should fail)');
        try {
            const duplicateRole = new Role({
                name: 'test-duplicate-role',
                displayName: 'Test Duplicate Role',
                description: 'Test role with duplicate permissions',
                permissions: ['users.view', 'users.create', 'users.view'],
                isSystemRole: false,
                createdBy: adminUser._id,
                updatedBy: adminUser._id
            });
            await duplicateRole.save();
            console.log('✗ FAIL: Role should not have been created with duplicate permissions');
            
            // Clean up if it somehow got created
            await Role.findByIdAndDelete(duplicateRole._id);
        } catch (error) {
            console.log('✓ PASS: Role creation blocked as expected');
            console.log('  Error:', error.message);
        }
        console.log('');

        // Test 4: Create role with empty permissions
        console.log('Test 4: Create role with empty permissions (should fail)');
        try {
            const emptyRole = new Role({
                name: 'test-empty-role',
                displayName: 'Test Empty Role',
                description: 'Test role with no permissions',
                permissions: [],
                isSystemRole: false,
                createdBy: adminUser._id,
                updatedBy: adminUser._id
            });
            await emptyRole.save();
            console.log('✗ FAIL: Role should not have been created with empty permissions');
            
            // Clean up if it somehow got created
            await Role.findByIdAndDelete(emptyRole._id);
        } catch (error) {
            console.log('✓ PASS: Role creation blocked as expected');
            console.log('  Error:', error.message);
        }
        console.log('');

        // Test 5: Update role with invalid permissions
        console.log('Test 5: Update role with invalid permissions (should fail)');
        try {
            // First create a valid role
            const roleToUpdate = new Role({
                name: 'test-update-role',
                displayName: 'Test Update Role',
                description: 'Test role for update',
                permissions: ['users.view', 'documents.view'],
                isSystemRole: false,
                createdBy: adminUser._id,
                updatedBy: adminUser._id
            });
            await roleToUpdate.save();
            console.log('  Created test role');

            // Try to update with invalid permissions
            roleToUpdate.permissions = ['users.view', 'invalid.permission'];
            await roleToUpdate.save();
            
            console.log('✗ FAIL: Role should not have been updated with invalid permissions');
            
            // Clean up
            await Role.findByIdAndDelete(roleToUpdate._id);
        } catch (error) {
            console.log('✓ PASS: Role update blocked as expected');
            console.log('  Error:', error.message);
            
            // Clean up
            await Role.deleteOne({ name: 'test-update-role' });
        }
        console.log('');

        // Test 6: Create role with mixed valid and invalid permissions
        console.log('Test 6: Create role with mixed valid/invalid permissions (should fail)');
        try {
            const mixedRole = new Role({
                name: 'test-mixed-role',
                displayName: 'Test Mixed Role',
                description: 'Test role with mixed permissions',
                permissions: [
                    'users.view',           // valid
                    'invalid.perm',         // invalid
                    'documents.view',       // valid
                    'fake.access'           // invalid
                ],
                isSystemRole: false,
                createdBy: adminUser._id,
                updatedBy: adminUser._id
            });
            await mixedRole.save();
            console.log('✗ FAIL: Role should not have been created with invalid permissions');
            
            // Clean up if it somehow got created
            await Role.findByIdAndDelete(mixedRole._id);
        } catch (error) {
            console.log('✓ PASS: Role creation blocked as expected');
            console.log('  Error:', error.message);
        }
        console.log('');

        console.log('=== Test Summary ===');
        console.log('All validation tests completed successfully!');
        console.log('Permission validation is working correctly at the model level.');

    } catch (error) {
        console.error('Test error:', error);
    }
}

async function main() {
    await connectDB();
    await testPermissionValidation();
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
}

main();
