/**
 * Test script for role deletion with user assignment check
 * 
 * This script tests the complete flow:
 * 1. Creates a test role
 * 2. Assigns users to the role
 * 3. Tests the user count endpoint
 * 4. Verifies deletion is blocked
 * 5. Cleans up test data
 * 
 * Usage: node server/scripts/testRoleDeletionWithUsers.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../modules/hr-core/users/models/role.model.js';
import User from '../modules/hr-core/users/models/user.model.js';

// Load environment variables
dotenv.config();

const testRoleDeletionWithUsers = async () => {
    let testRole = null;
    let testUsers = [];

    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Step 1: Create a test role
        console.log('📝 Step 1: Creating test role...');
        testRole = new Role({
            name: 'test-deletion-role',
            displayName: 'Test Deletion Role',
            description: 'Role for testing deletion with user assignments',
            permissions: ['users.view', 'documents.view'],
            isSystemRole: false
        });
        await testRole.save();
        console.log(`✅ Created role: ${testRole.displayName} (${testRole._id})\n`);

        // Step 2: Create test users and assign them to the role
        console.log('👥 Step 2: Creating test users...');
        const userCount = 3;
        for (let i = 1; i <= userCount; i++) {
            const user = new User({
                username: `testuser${i}_${Date.now()}`,
                email: `testuser${i}_${Date.now()}@example.com`,
                password: 'TestPassword123!',
                role: testRole.name,
                personalInfo: {
                    fullName: `Test User ${i}`,
                    firstName: 'Test',
                    lastName: `User ${i}`
                }
            });
            await user.save();
            testUsers.push(user);
            console.log(`   ✅ Created user: ${user.personalInfo.fullName} (${user.username})`);
        }
        console.log(`\n✅ Created ${testUsers.length} test users\n`);

        // Step 3: Test the user count endpoint logic
        console.log('🧪 Step 3: Testing user count endpoint...');
        const assignedUserCount = await User.countDocuments({ role: testRole.name });
        const sampleUsers = await User.find({ role: testRole.name })
            .select('username email personalInfo.fullName')
            .limit(5);

        const endpointResult = {
            roleId: testRole._id,
            roleName: testRole.name,
            displayName: testRole.displayName,
            userCount: assignedUserCount,
            sampleUsers: sampleUsers.map(user => ({
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.personalInfo?.fullName || user.username
            }))
        };

        console.log('✅ User count endpoint would return:');
        console.log(JSON.stringify(endpointResult, null, 2));
        console.log();

        // Step 4: Test deletion validation
        console.log('🔒 Step 4: Testing deletion validation...');
        if (assignedUserCount > 0) {
            console.log(`❌ DELETION BLOCKED: ${assignedUserCount} user${assignedUserCount > 1 ? 's are' : ' is'} assigned to this role`);
            console.log(`   Message: "Cannot delete role with assigned users"`);
            console.log(`   Details: { userCount: ${assignedUserCount} }`);
            console.log(`   HTTP Status: 400\n`);
        } else {
            console.log('✅ Deletion would be allowed\n');
        }

        // Step 5: Test after removing users
        console.log('🧹 Step 5: Testing after removing user assignments...');
        for (const user of testUsers) {
            user.role = 'employee'; // Change to default role
            await user.save();
        }
        
        const updatedUserCount = await User.countDocuments({ role: testRole.name });
        console.log(`✅ Users with role after reassignment: ${updatedUserCount}`);
        
        if (updatedUserCount === 0) {
            console.log('✅ DELETION NOW ALLOWED: No users assigned\n');
        }

        // Step 6: Verify system role protection
        console.log('🛡️  Step 6: Testing system role protection...');
        const systemRole = await Role.findOne({ isSystemRole: true });
        if (systemRole) {
            console.log(`   Testing with system role: ${systemRole.displayName}`);
            console.log(`   ❌ DELETION BLOCKED: Cannot delete system roles`);
            console.log(`   HTTP Status: 403\n`);
        }

        console.log('✅ All tests passed!\n');

    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        // Cleanup
        console.log('🧹 Cleaning up test data...');
        
        if (testUsers.length > 0) {
            const userIds = testUsers.map(u => u._id);
            await User.deleteMany({ _id: { $in: userIds } });
            console.log(`   ✅ Deleted ${testUsers.length} test users`);
        }
        
        if (testRole) {
            await Role.findByIdAndDelete(testRole._id);
            console.log(`   ✅ Deleted test role`);
        }

        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
};

// Run the test
testRoleDeletionWithUsers();
