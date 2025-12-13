#!/usr/bin/env node

/**
 * Company Database Setup Script
 * 
 * Creates a new company database with proper directory structure
 * Usage: npm run create-company -- --name "Company Name" [--admin-email admin@company.com]
 */

import { program } from 'commander';
import multiTenantDB from '../config/multiTenant.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

program
    .name('setup-company-database')
    .description('Create a new company database with directory structure')
    .requiredOption('-n, --name <name>', 'Company name')
    .option('-e, --admin-email <email>', 'Admin email for the company')
    .option('-p, --phone <phone>', 'Company phone number')
    .option('-a, --address <address>', 'Company address')
    .option('--dry-run', 'Show what would be created without actually creating')
    .parse();

const options = program.opts();

async function setupCompanyDatabase() {
    try {
        console.log(chalk.blue('🏢 Company Database Setup'));
        console.log(chalk.gray('========================\n'));

        const companyName = options.name;
        const sanitizedName = multiTenantDB.sanitizeCompanyName(companyName);

        console.log(chalk.yellow(`Company Name: ${companyName}`));
        console.log(chalk.yellow(`Database Name: hrsm_${sanitizedName}`));
        console.log(chalk.yellow(`Backup Directory: backups/${sanitizedName}`));
        console.log(chalk.yellow(`Upload Directory: uploads/${sanitizedName}\n`));

        if (options.dryRun) {
            console.log(chalk.cyan('🔍 DRY RUN - No changes will be made'));
            return;
        }

        // Check if company already exists
        const existingCompanies = await multiTenantDB.listCompanyDatabases();
        if (existingCompanies.includes(sanitizedName)) {
            console.log(chalk.red(`❌ Company database already exists: ${sanitizedName}`));
            return;
        }

        console.log(chalk.blue('📊 Creating company database...'));

        // Prepare company data
        const companyData = {
            adminEmail: options.adminEmail,
            phone: options.phone,
            address: options.address,
            settings: {
                timezone: 'UTC',
                dateFormat: 'YYYY-MM-DD',
                currency: 'USD',
                language: 'en'
            }
        };

        // Create company database
        const connection = await multiTenantDB.createCompanyDatabase(companyName, companyData);

        console.log(chalk.green('✅ Company database created successfully!'));
        console.log(chalk.green('✅ Directory structure created!'));

        // Create initial collections/indexes if needed
        await setupInitialCollections(connection);

        console.log(chalk.blue('\n📋 Setup Summary:'));
        console.log(chalk.gray(`- Database: hrsm_${sanitizedName}`));
        console.log(chalk.gray(`- Backup Path: ${multiTenantDB.getCompanyBackupPath(companyName)}`));
        console.log(chalk.gray(`- Upload Path: ${multiTenantDB.getCompanyUploadPath(companyName)}`));

        await connection.close();
        console.log(chalk.green('\n🎉 Company setup completed successfully!'));

    } catch (error) {
        console.error(chalk.red('❌ Error setting up company database:'), error.message);
        process.exit(1);
    }
}

async function setupInitialCollections(connection) {
    try {
        // Create indexes for common collections
        const collections = [
            'users',
            'employees',
            'departments',
            'attendance',
            'leaves',
            'payroll'
        ];

        for (const collectionName of collections) {
            const collection = connection.collection(collectionName);
            
            // Create basic indexes
            await collection.createIndex({ createdAt: 1 });
            await collection.createIndex({ updatedAt: 1 });
            
            if (collectionName === 'users') {
                await collection.createIndex({ email: 1 }, { unique: true });
            }
            
            if (collectionName === 'employees') {
                await collection.createIndex({ employeeId: 1 }, { unique: true });
                await collection.createIndex({ email: 1 }, { unique: true });
            }
        }

        console.log(chalk.green('✅ Initial collections and indexes created'));
    } catch (error) {
        console.warn(chalk.yellow('⚠️  Warning: Could not create all indexes:'), error.message);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Shutting down...'));
    await multiTenantDB.closeAllConnections();
    process.exit(0);
});

// Run the setup
setupCompanyDatabase();