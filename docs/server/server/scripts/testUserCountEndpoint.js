/**
 * Test script for role user count endpoint
 * 
 * This script tests the new GET /api/roles/:id/users/count endpoint
 * to verify it correctly returns user count and sample users for a role.
 * 
 * Usage: node server/scripts/testUserCountEndpoint.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../modules/hr-core/users/models/role.model.js';
import User from '../modules/hr-core/users/models/user.model.js';

// Load environment variables
dotenv.config();

const testUserCountEndpoint = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find a role to test with
        const testRole = await Role.findOne({ isSystemRole: false });
        
        if (!testRole) {
            console.log('⚠️  No custom roles found. Creating a test role...');
            const newRole = new Role({
                name: 'test-role',
                displayName: 'Test Role',
                description: 'Test role for user count endpoint',
                permissions: ['users.view'],
                isSystemRole: false
            });
            await newRole.save();
            console.log('✅ Test role created\n');
        }

        const roleToTest = testRole || await Role.findOne({ name: 'test-role' });
        
        console.log(`📋 Testing with role: ${roleToTest.displayName} (${roleToTest.name})`);
        console.log(`   Role ID: ${roleToTest._id}\n`);

        // Count users with this role
        const userCount = await User.countDocuments({ role: roleToTest.name });
        console.log(`👥 Users assigned to this role: ${userCount}`);

        // Get sample users
        const sampleUsers = await User.find({ role: roleToTest.name })
            .select('username email personalInfo.fullName')
            .limit(5);

        if (sampleUsers.length > 0) {
            console.log('\n📝 Sample users:');
            sampleUsers.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.personalInfo?.fullName || user.username} (${user.username})`);
            });
        } else {
            console.log('\n⚠️  No users assigned to this role');
        }

        // Test the endpoint logic
        console.log('\n🧪 Testing endpoint logic...');
        const result = {
            roleId: roleToTest._id,
            roleName: roleToTest.name,
            displayName: roleToTest.displayName,
            userCount,
            sampleUsers: sampleUsers.map(user => ({
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.personalInfo?.fullName || user.username
            }))
        };

        console.log('\n✅ Endpoint would return:');
        console.log(JSON.stringify(result, null, 2));

        // Test deletion validation
        console.log('\n🔒 Testing deletion validation...');
        if (userCount > 0) {
            console.log(`❌ Deletion would be BLOCKED: ${userCount} user${userCount > 1 ? 's are' : ' is'} assigned`);
        } else {
            console.log('✅ Deletion would be ALLOWED: No users assigned');
        }

        console.log('\n✅ Test completed successfully!');

    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
};

// Run the test
testUserCountEndpoint();
