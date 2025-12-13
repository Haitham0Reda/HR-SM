#!/usr/bin/env node

/**
 * Create Platform Admin User
 * 
 * Creates the initial platform administrator user for accessing the platform
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import chalk from 'chalk';
import PlatformUser from '../platform/models/PlatformUser.js';

// Load environment variables
dotenv.config();

async function createPlatformAdmin() {
    try {
        console.log(chalk.blue('🔐 Platform Admin User Creation'));
        console.log(chalk.gray('================================\n'));

        // Connect to MongoDB
        console.log(chalk.yellow('🔌 Connecting to database...'));
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log(chalk.green('✅ Connected to database\n'));

        // Check if platform admin already exists
        const existingAdmin = await PlatformUser.findOne({ role: 'super-admin' });
        
        if (existingAdmin) {
            console.log(chalk.yellow('⚠️  Platform admin already exists:'));
            console.log(chalk.white(`   Email: ${existingAdmin.email}`));
            console.log(chalk.white(`   Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`));
            console.log(chalk.white(`   Role: ${existingAdmin.role}`));
            console.log(chalk.white(`   Status: ${existingAdmin.status}`));
            console.log(chalk.white(`   Created: ${existingAdmin.createdAt}\n`));
            
            console.log(chalk.cyan('💡 Use these credentials to login to the platform:'));
            console.log(chalk.white(`   Email: ${existingAdmin.email}`));
            console.log(chalk.white(`   Password: [Use the password you set when creating this user]\n`));
            
            // Ask if user wants to create another admin or reset password
            console.log(chalk.blue('Options:'));
            console.log(chalk.gray('1. Create additional platform admin'));
            console.log(chalk.gray('2. Reset existing admin password'));
            console.log(chalk.gray('3. Exit'));
            
            return;
        }

        // Create new platform admin
        console.log(chalk.blue('👤 Creating new platform administrator...'));
        
        const adminData = {
            email: 'platform@admin.com',
            password: 'PlatformAdmin123!',
            firstName: 'Platform',
            lastName: 'Administrator',
            role: 'super-admin',
            permissions: [], // Super-admin has all permissions by default
            status: 'active'
        };

        const platformAdmin = new PlatformUser(adminData);
        await platformAdmin.save();

        console.log(chalk.green('✅ Platform administrator created successfully!\n'));

        console.log(chalk.cyan('🔑 Platform Admin Credentials:'));
        console.log(chalk.white(`   Email: ${adminData.email}`));
        console.log(chalk.white(`   Password: ${adminData.password}`));
        console.log(chalk.white(`   Role: ${adminData.role}`));
        console.log(chalk.white(`   Status: ${adminData.status}\n`));

        console.log(chalk.yellow('⚠️  IMPORTANT SECURITY NOTES:'));
        console.log(chalk.gray('1. Change the default password immediately after first login'));
        console.log(chalk.gray('2. Use a strong, unique password for production'));
        console.log(chalk.gray('3. Consider enabling two-factor authentication'));
        console.log(chalk.gray('4. Regularly review platform user access\n'));

        console.log(chalk.blue('🌐 Platform Access:'));
        console.log(chalk.gray('- Platform API: http://localhost:5001/api/platform'));
        console.log(chalk.gray('- Company Management: http://localhost:5001/api/platform/companies'));
        console.log(chalk.gray('- Authentication: http://localhost:5001/api/platform/auth/login\n'));

        console.log(chalk.green('🎉 Platform setup completed!'));
        console.log(chalk.gray('You can now login to the platform with the credentials above.'));

    } catch (error) {
        console.error(chalk.red('❌ Error creating platform admin:'), error.message);
        
        if (error.code === 11000) {
            console.log(chalk.yellow('\n💡 This usually means a platform admin already exists.'));
            console.log(chalk.gray('Try running the script again to see existing admin details.'));
        }
        
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

async function resetAdminPassword() {
    try {
        console.log(chalk.blue('🔄 Resetting Platform Admin Password'));
        console.log(chalk.gray('====================================\n'));

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

        // Find existing admin
        const admin = await PlatformUser.findOne({ role: 'super-admin' });
        
        if (!admin) {
            console.log(chalk.red('❌ No platform admin found. Create one first.'));
            return;
        }

        // Reset password
        const newPassword = 'PlatformAdmin123!';
        admin.password = newPassword;
        await admin.save();

        console.log(chalk.green('✅ Password reset successfully!\n'));
        console.log(chalk.cyan('🔑 Updated Credentials:'));
        console.log(chalk.white(`   Email: ${admin.email}`));
        console.log(chalk.white(`   Password: ${newPassword}`));
        console.log(chalk.yellow('\n⚠️  Please change this password after logging in!'));

    } catch (error) {
        console.error(chalk.red('❌ Error resetting password:'), error.message);
    }
}

async function createAdditionalAdmin() {
    try {
        console.log(chalk.blue('👤 Creating Additional Platform Admin'));
        console.log(chalk.gray('====================================\n'));

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

        const adminData = {
            email: 'admin2@platform.com',
            password: 'PlatformAdmin456!',
            firstName: 'Secondary',
            lastName: 'Administrator',
            role: 'super-admin',
            permissions: [],
            status: 'active'
        };

        const platformAdmin = new PlatformUser(adminData);
        await platformAdmin.save();

        console.log(chalk.green('✅ Additional platform administrator created!\n'));
        console.log(chalk.cyan('🔑 New Admin Credentials:'));
        console.log(chalk.white(`   Email: ${adminData.email}`));
        console.log(chalk.white(`   Password: ${adminData.password}`));

    } catch (error) {
        console.error(chalk.red('❌ Error creating additional admin:'), error.message);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'reset':
        resetAdminPassword();
        break;
    case 'additional':
        createAdditionalAdmin();
        break;
    default:
        createPlatformAdmin();
        break;
}

/*
Usage:

1. Create initial platform admin:
   npm run create-platform-admin

2. Reset admin password:
   npm run create-platform-admin reset

3. Create additional admin:
   npm run create-platform-admin additional

Default credentials created:
- Email: platform@admin.com
- Password: PlatformAdmin123!
- Role: super-admin

IMPORTANT: Change the default password after first login!
*/