import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import User from './modules/hr-core/users/models/user.model.js';

dotenv.config();

async function checkTechCorpUser() {
    try {
        await connectDB();
        console.log('Connected to database');
        
        // Check for admin@techcorp.com
        const user = await User.findOne({ email: 'admin@techcorp.com' });
        
        if (user) {
            console.log('✅ User found:');
            console.log(`   Email: ${user.email}`);
            console.log(`   Tenant ID: ${user.tenantId}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Status: ${user.status}`);
            console.log(`   Has password: ${!!user.password}`);
        } else {
            console.log('❌ User admin@techcorp.com not found');
            
            // Check what users exist with techcorp domain
            const techcorpUsers = await User.find({ email: /techcorp\.com/ });
            console.log(`\nFound ${techcorpUsers.length} users with techcorp.com domain:`);
            techcorpUsers.forEach(u => {
                console.log(`   - ${u.email} (tenant: ${u.tenantId}, role: ${u.role})`);
            });
            
            // Check users with techcorp_solutions tenant
            const tenantUsers = await User.find({ tenantId: 'techcorp_solutions' });
            console.log(`\nFound ${tenantUsers.length} users with techcorp_solutions tenant:`);
            tenantUsers.forEach(u => {
                console.log(`   - ${u.email} (role: ${u.role})`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTechCorpUser();