#!/usr/bin/env node

/**
 * Migration Script: Single Tenant to Multi-Tenant
 * 
 * Migrates existing data from hrsm_db to company-specific databases
 * Usage: npm run migrate-to-multitenant -- --company "Company Name" [--collections users,employees]
 */

import { program } from 'commander';
import mongoose from 'mongoose';
import multiTenantDB from '../config/multiTenant.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

program
    .name('migrate-to-multitenant')
    .description('Migrate data from single tenant to multi-tenant structure')
    .requiredOption('-c, --company <name>', 'Target company name')
    .option('--collections <collections>', 'Comma-separated list of collections to migrate (default: all)', 'all')
    .option('--source-db <db>', 'Source database name', 'hrsm_db')
    .option('--dry-run', 'Show what would be migrated without actually migrating')
    .option('--backup-first', 'Create backup before migration', true)
    .parse();

const options = program.opts();

async function connectToSourceDB() {
    const sourceUri = process.env.MONGODB_URI.replace(/\/[^?]+\?/, `/${options.sourceDb}?`);
    return await mongoose.createConnection(sourceUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
}

async function getCollectionsList(connection) {
    const collections = await connection.db.listCollections().toArray();
    return collections.map(col => col.name).filter(name => !name.startsWith('system.'));
}

async function migrateCollection(sourceConnection, targetConnection, collectionName) {
    try {
        console.log(chalk.blue(`📦 Migrating collection: ${collectionName}`));

        const sourceCollection = sourceConnection.collection(collectionName);
        const targetCollection = targetConnection.collection(collectionName);

        // Get document count
        const totalDocs = await sourceCollection.countDocuments();
        
        if (totalDocs === 0) {
            console.log(chalk.gray(`  ⏭️  Skipping empty collection: ${collectionName}`));
            return { collection: collectionName, migrated: 0, skipped: 0, errors: 0 };
        }

        console.log(chalk.gray(`  📊 Found ${totalDocs} documents`));

        if (options.dryRun) {
            console.log(chalk.cyan(`  🔍 DRY RUN: Would migrate ${totalDocs} documents`));
            return { collection: collectionName, migrated: totalDocs, skipped: 0, errors: 0 };
        }

        // Check if target collection already has data
        const existingDocs = await targetCollection.countDocuments();
        if (existingDocs > 0) {
            console.log(chalk.yellow(`  ⚠️  Target collection already has ${existingDocs} documents`));
            console.log(chalk.yellow(`  ⏭️  Skipping to avoid duplicates`));
            return { collection: collectionName, migrated: 0, skipped: totalDocs, errors: 0 };
        }

        // Migrate in batches
        const batchSize = 1000;
        let migrated = 0;
        let errors = 0;

        const cursor = sourceCollection.find({});
        
        while (await cursor.hasNext()) {
            const batch = [];
            
            // Collect batch
            for (let i = 0; i < batchSize && await cursor.hasNext(); i++) {
                const doc = await cursor.next();
                batch.push(doc);
            }

            if (batch.length === 0) break;

            try {
                await targetCollection.insertMany(batch, { ordered: false });
                migrated += batch.length;
                
                if (migrated % 5000 === 0) {
                    console.log(chalk.gray(`  📈 Progress: ${migrated}/${totalDocs} documents`));
                }
            } catch (error) {
                console.error(chalk.red(`  ❌ Batch error: ${error.message}`));
                errors += batch.length;
            }
        }

        console.log(chalk.green(`  ✅ Migrated ${migrated} documents`));
        if (errors > 0) {
            console.log(chalk.red(`  ❌ Errors: ${errors} documents`));
        }

        return { collection: collectionName, migrated, skipped: 0, errors };

    } catch (error) {
        console.error(chalk.red(`❌ Error migrating ${collectionName}:`), error.message);
        return { collection: collectionName, migrated: 0, skipped: 0, errors: 1 };
    }
}

async function createBackup(companyName) {
    try {
        console.log(chalk.blue('📦 Creating backup before migration...'));
        
        // Import backup script functionality
        const { spawn } = await import('child_process');
        const fs = await import('fs/promises');
        const path = await import('path');

        const sanitizedName = multiTenantDB.sanitizeCompanyName(companyName);
        const backupPath = multiTenantDB.getCompanyBackupPath(companyName);
        
        await fs.mkdir(backupPath, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `pre_migration_backup_${timestamp}.gz`;
        const backupFilePath = path.join(backupPath, backupFileName);

        const mongoUri = process.env.MONGODB_URI;
        const uriMatch = mongoUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)/);
        
        if (!uriMatch) {
            throw new Error('Could not parse MongoDB URI');
        }

        const [, username, password, host] = uriMatch;
        const sourceDbUri = `mongodb+srv://${username}:${password}@${host}/${options.sourceDb}?retryWrites=true&w=majority`;

        const mongodumpArgs = [
            '--uri', sourceDbUri,
            '--gzip',
            '--archive=' + backupFilePath
        ];

        return new Promise((resolve, reject) => {
            const mongodump = spawn('mongodump', mongodumpArgs);

            mongodump.on('close', (code) => {
                if (code === 0) {
                    console.log(chalk.green('✅ Backup created successfully'));
                    resolve(backupFilePath);
                } else {
                    reject(new Error(`Backup failed with code ${code}`));
                }
            });

            mongodump.on('error', (error) => {
                reject(new Error(`Failed to start backup: ${error.message}`));
            });
        });

    } catch (error) {
        console.error(chalk.red('❌ Backup failed:'), error.message);
        throw error;
    }
}

async function migrateToMultiTenant() {
    let sourceConnection = null;
    let targetConnection = null;

    try {
        console.log(chalk.blue('🔄 Multi-Tenant Migration'));
        console.log(chalk.gray('==========================\n'));

        const companyName = options.company;
        const sanitizedName = multiTenantDB.sanitizeCompanyName(companyName);

        console.log(chalk.yellow(`Company: ${companyName}`));
        console.log(chalk.yellow(`Source DB: ${options.sourceDb}`));
        console.log(chalk.yellow(`Target DB: hrsm_${sanitizedName}`));
        console.log(chalk.yellow(`Collections: ${options.collections}\n`));

        if (options.dryRun) {
            console.log(chalk.cyan('🔍 DRY RUN MODE - No changes will be made\n'));
        }

        // Create backup if requested
        if (options.backupFirst && !options.dryRun) {
            await createBackup(companyName);
            console.log('');
        }

        // Connect to source database
        console.log(chalk.blue('🔌 Connecting to source database...'));
        sourceConnection = await connectToSourceDB();
        console.log(chalk.green('✅ Connected to source database'));

        // Create/connect to target company database
        console.log(chalk.blue('🔌 Setting up target company database...'));
        targetConnection = await multiTenantDB.createCompanyDatabase(companyName);
        console.log(chalk.green('✅ Target database ready'));

        // Get collections to migrate
        let collectionsToMigrate;
        if (options.collections === 'all') {
            collectionsToMigrate = await getCollectionsList(sourceConnection);
        } else {
            collectionsToMigrate = options.collections.split(',').map(c => c.trim());
        }

        console.log(chalk.blue(`\n📋 Collections to migrate: ${collectionsToMigrate.length}`));
        collectionsToMigrate.forEach(col => {
            console.log(chalk.gray(`  - ${col}`));
        });
        console.log('');

        // Migrate each collection
        const results = [];
        for (const collectionName of collectionsToMigrate) {
            const result = await migrateCollection(sourceConnection, targetConnection, collectionName);
            results.push(result);
        }

        // Summary
        console.log(chalk.blue('\n📊 Migration Summary:'));
        console.log(chalk.gray('==================='));

        let totalMigrated = 0;
        let totalSkipped = 0;
        let totalErrors = 0;

        results.forEach(result => {
            const status = result.errors > 0 ? chalk.red('❌') : 
                          result.skipped > 0 ? chalk.yellow('⏭️') : chalk.green('✅');
            
            console.log(`${status} ${result.collection}: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors} errors`);
            
            totalMigrated += result.migrated;
            totalSkipped += result.skipped;
            totalErrors += result.errors;
        });

        console.log(chalk.blue('\n📈 Totals:'));
        console.log(chalk.green(`✅ Migrated: ${totalMigrated} documents`));
        if (totalSkipped > 0) {
            console.log(chalk.yellow(`⏭️  Skipped: ${totalSkipped} documents`));
        }
        if (totalErrors > 0) {
            console.log(chalk.red(`❌ Errors: ${totalErrors} documents`));
        }

        if (!options.dryRun) {
            console.log(chalk.blue('\n🎉 Migration completed!'));
            console.log(chalk.gray(`Company "${companyName}" is now set up with multi-tenant database.`));
        }

    } catch (error) {
        console.error(chalk.red('❌ Migration failed:'), error.message);
        process.exit(1);
    } finally {
        // Close connections
        if (sourceConnection) {
            await sourceConnection.close();
        }
        if (targetConnection) {
            await targetConnection.close();
        }
        await multiTenantDB.closeAllConnections();
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Shutting down...'));
    await multiTenantDB.closeAllConnections();
    process.exit(0);
});

// Run the migration
migrateToMultiTenant();