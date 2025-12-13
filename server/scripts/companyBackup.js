#!/usr/bin/env node

/**
 * Company Database Backup Script
 * 
 * Creates backups for specific company or all companies
 * Usage: 
 *   npm run backup-company -- --name "company_name"
 *   npm run backup-all-companies
 */

import { program } from 'commander';
import multiTenantDB from '../config/multiTenant.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

program
    .name('company-backup')
    .description('Backup company databases')
    .option('-n, --name <name>', 'Specific company name to backup')
    .option('-a, --all', 'Backup all companies')
    .option('--compress', 'Compress backup files', true)
    .parse();

const options = program.opts();

async function backupCompany(companyName) {
    try {
        const sanitizedName = multiTenantDB.sanitizeCompanyName(companyName);
        const dbName = `hrsm_${sanitizedName}`;
        const backupPath = multiTenantDB.getCompanyBackupPath(companyName);
        
        // Ensure backup directory exists
        await fs.mkdir(backupPath, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `${dbName}_backup_${timestamp}.gz`;
        const backupFilePath = path.join(backupPath, backupFileName);

        console.log(chalk.blue(`📦 Backing up ${dbName}...`));
        console.log(chalk.gray(`Backup file: ${backupFilePath}`));

        // Extract connection details from MongoDB URI
        const mongoUri = process.env.MONGODB_URI;
        const uriMatch = mongoUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)/);
        
        if (!uriMatch) {
            throw new Error('Could not parse MongoDB URI');
        }

        const [, username, password, host] = uriMatch;

        // Create mongodump command
        const mongodumpArgs = [
            '--uri', `mongodb+srv://${username}:${password}@${host}/${dbName}?retryWrites=true&w=majority`,
            '--gzip',
            '--archive=' + backupFilePath
        ];

        return new Promise((resolve, reject) => {
            const mongodump = spawn('mongodump', mongodumpArgs);

            let errorOutput = '';

            mongodump.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            mongodump.on('close', async (code) => {
                if (code === 0) {
                    try {
                        const stats = await fs.stat(backupFilePath);
                        console.log(chalk.green(`✅ Backup completed: ${formatBytes(stats.size)}`));
                        
                        // Create backup metadata
                        const metadataPath = path.join(backupPath, `${dbName}_backup_${timestamp}.json`);
                        const metadata = {
                            companyName,
                            sanitizedName,
                            dbName,
                            backupFile: backupFileName,
                            timestamp: new Date().toISOString(),
                            size: stats.size,
                            compressed: true
                        };
                        
                        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
                        console.log(chalk.gray(`📄 Metadata saved: ${path.basename(metadataPath)}`));
                        
                        resolve(backupFilePath);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error(`Mongodump failed with code ${code}: ${errorOutput}`));
                }
            });

            mongodump.on('error', (error) => {
                reject(new Error(`Failed to start mongodump: ${error.message}`));
            });
        });

    } catch (error) {
        console.error(chalk.red(`❌ Error backing up ${companyName}:`), error.message);
        throw error;
    }
}

async function backupAllCompanies() {
    try {
        console.log(chalk.blue('🏢 Backing up all company databases'));
        console.log(chalk.gray('=====================================\n'));

        const companies = await multiTenantDB.listCompanyDatabases();
        
        if (companies.length === 0) {
            console.log(chalk.yellow('📭 No company databases found to backup.'));
            return;
        }

        console.log(chalk.green(`Found ${companies.length} companies to backup\n`));

        const results = [];
        
        for (const company of companies) {
            try {
                const backupPath = await backupCompany(company);
                results.push({ company, status: 'success', path: backupPath });
            } catch (error) {
                console.error(chalk.red(`Failed to backup ${company}:`), error.message);
                results.push({ company, status: 'failed', error: error.message });
            }
            console.log(''); // Empty line between backups
        }

        // Summary
        console.log(chalk.blue('📋 Backup Summary:'));
        const successful = results.filter(r => r.status === 'success');
        const failed = results.filter(r => r.status === 'failed');
        
        console.log(chalk.green(`✅ Successful: ${successful.length}`));
        if (failed.length > 0) {
            console.log(chalk.red(`❌ Failed: ${failed.length}`));
            failed.forEach(f => {
                console.log(chalk.red(`  - ${f.company}: ${f.error}`));
            });
        }

    } catch (error) {
        console.error(chalk.red('❌ Error during backup process:'), error.message);
        process.exit(1);
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main() {
    try {
        if (options.all) {
            await backupAllCompanies();
        } else if (options.name) {
            await backupCompany(options.name);
        } else {
            console.log(chalk.red('❌ Please specify --name <company> or --all'));
            program.help();
        }
    } catch (error) {
        console.error(chalk.red('❌ Backup failed:'), error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Shutting down...'));
    await multiTenantDB.closeAllConnections();
    process.exit(0);
});

// Run the backup
main();