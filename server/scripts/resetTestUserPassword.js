#!/usr/bin/env node

/**
 * Reset Test User Password Script
 * Resets the password for the test user to ensure it's properly hashed
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import chalk from 'chalk';
import bcrypt from 'bcryptjs';
import User from '../modules/hr-core/users/models/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

async function connectDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log(chalk.green('✅ Connected to MongoDB'));
    } catch (error) {
        console.error(chalk.red('❌ MongoDB connection failed:'), error.message);
        process.exit(1);
    }
}

async function resetPassword() {
    console.log(chalk.blue.bold('🔑 Resetting Test User Password\n'));
    
    try {
        const email = 'admin@techcorp.com';
        const tenantId = 'techcorp-solutions-d8f0689c';
        const newPassword = 'admin123';
        
        // Find the user
        const user = await User.findOne({ email, tenantId });
        
        if (!user) {
            console.log(chalk.red('❌ User not found'));
            return;
        }
        
        console.log(chalk.blue('👤 Found user:'));
        console.log(chalk.gray(`   Email: ${user.email}`));
        console.log(chalk.gray(`   Role: ${user.role}`));
        console.log(chalk.gray(`   Status: ${user.status}`));
        
        // Set the plain password (the pre-save middleware will hash it)
        user.password = newPassword;
        user.role = 'admin'; // Fix the role case
        await user.save();
        
        console.log(chalk.green('\n✅ Password reset successfully!'));
        console.log(chalk.blue('\n🔑 New credentials:'));
        console.log(chalk.yellow(`   Email: ${email}`));
        console.log(chalk.yellow(`   Password: ${newPassword}`));
        console.log(chalk.yellow(`   Tenant: ${tenantId}`));
        
        // Test the password
        console.log(chalk.blue('\n🧪 Testing password...'));
        const isValid = await user.comparePassword(newPassword);
        
        if (isValid) {
            console.log(chalk.green('✅ Password test passed!'));
        } else {
            console.log(chalk.red('❌ Password test failed!'));
        }
        
    } catch (error) {
        console.error(chalk.red('❌ Failed to reset password:'), error.message);
        console.error(error.stack);
    }
}

async function main() {
    await connectDB();
    await resetPassword();
    await mongoose.disconnect();
    console.log(chalk.gray('\n📡 Disconnected from MongoDB'));
}

main().catch(error => {
    console.error(chalk.red('❌ Script failed:'), error);
    process.exit(1);
});