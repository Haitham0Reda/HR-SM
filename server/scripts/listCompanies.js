#!/usr/bin/env node

/**
 * List Companies Script
 * 
 * Lists all company databases and their directory structures
 * Usage: npm run list-companies
 */

import multiTenantDB from '../config/multiTenant.js';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function listCompanies() {
    try {
        console.log(chalk.blue('🏢 Company Database Listing'));
        console.log(chalk.gray('===========================\n'));

        // Get all company databases
        const companies = await multiTenantDB.listCompanyDatabases();

        if (companies.length === 0) {
            console.log(chalk.yellow('📭 No company databases found.'));
            console.log(chalk.gray('Use: npm run create-company -- --name "Company Name" to create one.\n'));
            return;
        }

        console.log(chalk.green(`📊 Found ${companies.length} company database(s):\n`));

        for (const company of companies) {
            console.log(chalk.cyan(`🏢 ${company.toUpperCase()}`));
            console.log(chalk.gray('─'.repeat(50)));

            // Database info
            console.log(chalk.white(`Database: hrsm_${company}`));

            // Check directories
            const backupPath = multiTenantDB.getCompanyBackupPath(company);
            const uploadPath = multiTenantDB.getCompanyUploadPath(company);

            const backupExists = await checkDirectoryExists(backupPath);
            const uploadExists = await checkDirectoryExists(uploadPath);

            console.log(chalk.white(`Backup Dir: ${backupPath} ${backupExists ? chalk.green('✅') : chalk.red('❌')}`));
            console.log(chalk.white(`Upload Dir: ${uploadPath} ${uploadExists ? chalk.green('✅') : chalk.red('❌')}`));

            // Get directory sizes if they exist
            if (backupExists) {
                const backupSize = await getDirectorySize(backupPath);
                console.log(chalk.gray(`  Backup Size: ${formatBytes(backupSize)}`));
            }

            if (uploadExists) {
                const uploadSize = await getDirectorySize(uploadPath);
                console.log(chalk.gray(`  Upload Size: ${formatBytes(uploadSize)}`));
            }

            // Try to get company info from database
            try {
                const connection = await multiTenantDB.getCompanyConnection(company);
                const companyCollection = connection.collection('companies');
                const companyInfo = await companyCollection.findOne({ sanitizedName: company });
                
                if (companyInfo) {
                    console.log(chalk.gray(`  Created: ${companyInfo.createdAt?.toISOString() || 'Unknown'}`));
                    console.log(chalk.gray(`  Status: ${companyInfo.isActive ? 'Active' : 'Inactive'}`));
                    if (companyInfo.adminEmail) {
                        console.log(chalk.gray(`  Admin: ${companyInfo.adminEmail}`));
                    }
                }
            } catch (error) {
                console.log(chalk.red(`  ⚠️  Could not fetch company info: ${error.message}`));
            }

            console.log(''); // Empty line between companies
        }

        console.log(chalk.blue('📋 Summary:'));
        console.log(chalk.gray(`Total Companies: ${companies.length}`));

    } catch (error) {
        console.error(chalk.red('❌ Error listing companies:'), error.message);
        process.exit(1);
    }
}

async function checkDirectoryExists(dirPath) {
    try {
        const stats = await fs.stat(dirPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

async function getDirectorySize(dirPath) {
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        let size = 0;

        for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                size += await getDirectorySize(filePath);
            } else {
                const stats = await fs.stat(filePath);
                size += stats.size;
            }
        }

        return size;
    } catch {
        return 0;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Shutting down...'));
    await multiTenantDB.closeAllConnections();
    process.exit(0);
});

// Run the listing
listCompanies();