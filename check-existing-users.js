/**
 * Check Existing Users in the System
 * Find valid credentials to test the payroll API
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// User schema (simplified)
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    role: String,
    tenantId: String,
    name: String,
    isActive: Boolean
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function checkUsers() {
    console.log('🔍 Checking existing users in the system...\n');

    try {
        await connectDB();

        // Find all users
        const users = await User.find({}).select('email role tenantId name isActive').limit(10);
        
        console.log(`Found ${users.length} users:`);
        console.log('='.repeat(80));
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Tenant ID: ${user.tenantId}`);
            console.log(`   Name: ${user.name}`);
            console.log(`   Active: ${user.isActive}`);
            console.log('   ---');
        });

        // Find admin users specifically
        console.log('\n🔍 Admin users:');
        const adminUsers = await User.find({ role: 'admin' }).select('email role tenantId name isActive');
        
        if (adminUsers.length === 0) {
            console.log('❌ No admin users found');
        } else {
            adminUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.email} (${user.tenantId}) - Active: ${user.isActive}`);
            });
        }

        // Find HR users
        console.log('\n🔍 HR users:');
        const hrUsers = await User.find({ role: 'hr' }).select('email role tenantId name isActive');
        
        if (hrUsers.length === 0) {
            console.log('❌ No HR users found');
        } else {
            hrUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.email} (${user.tenantId}) - Active: ${user.isActive}`);
            });
        }

        // Find users for techcorp_solutions tenant
        console.log('\n🔍 TechCorp Solutions users:');
        const techCorpUsers = await User.find({ tenantId: 'techcorp_solutions' }).select('email role tenantId name isActive');
        
        if (techCorpUsers.length === 0) {
            console.log('❌ No TechCorp Solutions users found');
        } else {
            techCorpUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.email} - Role: ${user.role} - Active: ${user.isActive}`);
            });
        }

        console.log('\n💡 Suggested test credentials:');
        const activeAdmins = users.filter(u => u.role === 'admin' && u.isActive !== false);
        const activeHR = users.filter(u => u.role === 'hr' && u.isActive !== false);
        
        if (activeAdmins.length > 0) {
            console.log(`   Admin: ${activeAdmins[0].email} (tenant: ${activeAdmins[0].tenantId})`);
        }
        if (activeHR.length > 0) {
            console.log(`   HR: ${activeHR[0].email} (tenant: ${activeHR[0].tenantId})`);
        }

    } catch (error) {
        console.error('❌ Error checking users:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

checkUsers().catch(console.error);