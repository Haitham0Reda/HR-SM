import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import User from './modules/hr-core/users/models/user.model.js';

dotenv.config();

async function checkUsers() {
    try {
        await connectDB();
        console.log('Connected to database');
        
        const users = await User.find({}).select('email tenantId role');
        console.log(`\nFound ${users.length} users in database:`);
        
        if (users.length === 0) {
            console.log('❌ No users found! Database needs to be seeded.');
        } else {
            users.forEach(user => {
                console.log(`- ${user.email} (tenant: ${user.tenantId}, role: ${user.role})`);
            });
        }
        
        // Check for specific test users
        const testEmails = ['admin@company.com', 'hr@company.com', 'manager@company.com'];
        console.log('\nChecking for test users:');
        
        for (const email of testEmails) {
            const user = await User.findOne({ email });
            if (user) {
                console.log(`✅ ${email} exists (tenant: ${user.tenantId})`);
            } else {
                console.log(`❌ ${email} not found`);
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUsers();