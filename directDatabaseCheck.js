/**
 * Direct Database Check
 * 
 * This script directly queries the database to check if the user exists
 * and what the exact data looks like
 */

import mongoose from 'mongoose';
import User from './server/modules/hr-core/users/models/user.model.js';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const API_URL = `${SERVER_URL}/api/v1`;

async function directDatabaseCheck() {
    console.log('🔍 Direct Database Check...\n');
    
    try {
        // Step 1: Get authentication token to get user ID
        console.log('1️⃣ Getting user ID from API...');
        const response = await fetch(`${API_URL}/dev/auto-login`);
        const data = await response.json();
        const authToken = data.data.token;
        
        const profileResponse = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const userProfile = await profileResponse.json();
        const userId = userProfile._id;
        const expectedTenantId = userProfile.tenantId;
        
        console.log(`✅ Target User ID: ${userId}`);
        console.log(`✅ Expected Tenant ID: ${expectedTenantId}`);
        
        // Step 2: Connect to database directly
        console.log('\n2️⃣ Connecting to database...');
        
        // Get MongoDB URI from environment or use default
        const mongoUri = 'mongodb+srv://devhaithammoreda_db_user:cvF50PEZvfPVmKU3@cluster.uwhj601.mongodb.net/hrms?retryWrites=true&w=majority';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');
        
        // Step 3: Check if user exists by ID only
        console.log('\n3️⃣ Checking user by ID only...');
        const userById = await User.findById(userId);
        
        if (userById) {
            console.log('✅ User found by ID:');
            console.log(`   Email: ${userById.email}`);
            console.log(`   Tenant ID: ${userById.tenantId}`);
            console.log(`   Role: ${userById.role}`);
        } else {
            console.log('❌ User NOT found by ID');
        }
        
        // Step 4: Check if user exists with tenant filtering
        console.log('\n4️⃣ Checking user with tenant filtering...');
        const userWithTenant = await User.findOne({ _id: userId, tenantId: expectedTenantId });
        
        if (userWithTenant) {
            console.log('✅ User found with tenant filtering:');
            console.log(`   Email: ${userWithTenant.email}`);
            console.log(`   Tenant ID: ${userWithTenant.tenantId}`);
        } else {
            console.log('❌ User NOT found with tenant filtering');
        }
        
        // Step 5: Check all users with this tenant ID
        console.log('\n5️⃣ Checking all users with tenant ID...');
        const allUsersWithTenant = await User.find({ tenantId: expectedTenantId });
        console.log(`✅ Found ${allUsersWithTenant.length} users with tenant ID "${expectedTenantId}"`);
        
        if (allUsersWithTenant.length > 0) {
            console.log('   Users:');
            allUsersWithTenant.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.email} (ID: ${user._id})`);
            });
        }
        
        // Step 6: Check if the specific user ID exists in the tenant users
        console.log('\n6️⃣ Checking if target user ID is in tenant users...');
        const targetUserInTenant = allUsersWithTenant.find(user => user._id.toString() === userId);
        
        if (targetUserInTenant) {
            console.log('✅ Target user IS in the tenant users list');
        } else {
            console.log('❌ Target user is NOT in the tenant users list');
            console.log(`   Looking for ID: ${userId}`);
            console.log(`   Available IDs: ${allUsersWithTenant.map(u => u._id.toString()).join(', ')}`);
        }
        
        // Step 7: Check all users regardless of tenant
        console.log('\n7️⃣ Checking all users in database...');
        const allUsers = await User.find({});
        console.log(`✅ Total users in database: ${allUsers.length}`);
        
        const targetUserAnywhere = allUsers.find(user => user._id.toString() === userId);
        if (targetUserAnywhere) {
            console.log('✅ Target user exists in database:');
            console.log(`   Email: ${targetUserAnywhere.email}`);
            console.log(`   Tenant ID: ${targetUserAnywhere.tenantId}`);
            console.log(`   ID: ${targetUserAnywhere._id}`);
        } else {
            console.log('❌ Target user does NOT exist anywhere in database');
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Database connection closed');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Direct database check failed:', error);
        return false;
    }
}

// Run the check
directDatabaseCheck().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Check execution error:', error);
    process.exit(1);
});