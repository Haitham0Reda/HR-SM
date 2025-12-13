/**
 * Check what users exist in the database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../modules/hr-core/models/User.js';

dotenv.config();

async function checkUsers() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database');
        
        console.log('\nFinding users...');
        const users = await User.find({}).select('email firstName lastName role tenantId');
        
        console.log(`Found ${users.length} users:`);
        users.forEach(user => {
            console.log(`- ${user.email} (${user.firstName} ${user.lastName}) - Role: ${user.role} - Tenant: ${user.tenantId}`);
        });
        
        // Try to find the specific user
        const techCorpUser = await User.findOne({ email: 'admin@techcorp.com' });
        if (techCorpUser) {
            console.log('\n✓ Found TechCorp admin user:');
            console.log(JSON.stringify(techCorpUser, null, 2));
        } else {
            console.log('\n❌ TechCorp admin user not found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from database');
    }
}

checkUsers();