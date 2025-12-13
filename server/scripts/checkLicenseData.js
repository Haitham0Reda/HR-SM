#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';
import License from '../platform/system/models/license.model.js';

// Load environment variables
dotenv.config();

const TENANT_ID = 'techcorp-solutions-d8f0689c';

async function connectDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log(chalk.gray('Connected to MongoDB'));
    } catch (error) {
        console.error(chalk.red('❌ MongoDB connection failed:'), error.message);
        process.exit(1);
    }
}

async function checkLicenseData() {
    try {
        console.log(chalk.blue('🔍 Checking License Data in Database...'));
        
        const license = await License.findByTenantId(TENANT_ID);
        
        if (!license) {
            console.log(chalk.red('❌ No license found for tenant:'), TENANT_ID);
            return;
        }
        
        console.log(chalk.green('✅ License found:'));
        console.log(chalk.gray('Raw license data:'));
        console.log(JSON.stringify(license.toObject(), null, 2));
        
        console.log(chalk.blue('\n📦 Module Details:'));
        license.modules.forEach((module, index) => {
            console.log(chalk.yellow(`Module ${index + 1}:`));
            console.log(`  Key: ${module.key}`);
            console.log(`  Enabled: ${module.enabled}`);
            console.log(`  Tier: ${module.tier}`);
            console.log(`  Activated At: ${module.activatedAt}`);
            console.log(`  Expires At: ${module.expiresAt}`);
            console.log(`  Limits:`, JSON.stringify(module.limits, null, 4));
            console.log('');
        });
        
    } catch (error) {
        console.error(chalk.red('❌ Error checking license data:'), error.message);
        console.error(error.stack);
    }
}

async function main() {
    await connectDB();
    await checkLicenseData();
    await mongoose.disconnect();
    console.log(chalk.gray('Disconnected from MongoDB'));
}

main().catch(error => {
    console.error(chalk.red('❌ Script failed:'), error);
    process.exit(1);
});