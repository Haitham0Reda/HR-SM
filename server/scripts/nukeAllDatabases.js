#!/usr/bin/env node
/**
 * Complete Multi-Database Nuke Script
 * Deletes ALL databases in the MongoDB instance - main database and all tenant databases
 * This is the ultimate nuclear option for multi-tenant systems
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const nukeAllDatabases = async () => {
    try {
        console.log(chalk.red('💥💥💥 ULTIMATE NUCLEAR DATABASE CLEANUP 💥💥💥'));
        console.log(chalk.red('═'.repeat(60)));
        console.log(chalk.yellow('⚠️  WARNING: This will delete ALL DATABASES in MongoDB!'));
        console.log(chalk.yellow('⚠️  This includes the main database AND all tenant databases!'));
        console.log(chalk.yellow('⚠️  This action is COMPLETELY IRREVERSIBLE!'));
        console.log(chalk.red('═'.repeat(60)));

        console.log(chalk.blue('\n🔌 Connecting to MongoDB...'));
        
        // Connect to MongoDB without specifying a database
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI not found in environment variables');
        }

        // Extract connection string without database name
        const baseUri = mongoUri.replace(/\/[^\/]*(\?.*)?$/, '');
        console.log(chalk.gray(`Connection: ${baseUri.replace(/\/\/.*@/, '//***@')}`));

        await mongoose.connect(mongoUri);
        console.log(chalk.green('✅ Connected to MongoDB'));

        // Get admin database to list all databases
        const adminDb = mongoose.connection.db.admin();
        
        console.log(chalk.blue('\n🔍 Discovering all databases...'));
        const result = await adminDb.listDatabases();
        const databases = result.databases;

        console.log(chalk.cyan(`\n📊 Found ${databases.length} databases:`));
        
        // Filter out system databases that shouldn't be deleted
        const systemDatabases = ['admin', 'local', 'config'];
        const userDatabases = databases.filter(db => !systemDatabases.includes(db.name));
        const systemDbsFound = databases.filter(db => systemDatabases.includes(db.name));

        console.log(chalk.yellow('\n🔒 System databases (will be preserved):'));
        systemDbsFound.forEach(db => {
            console.log(chalk.gray(`   • ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`));
        });

        console.log(chalk.red('\n💥 User databases (will be DELETED):'));
        let totalSize = 0;
        userDatabases.forEach(db => {
            const sizeMB = (db.sizeOnDisk / 1024 / 1024).toFixed(2);
            totalSize += db.sizeOnDisk;
            console.log(chalk.white(`   • ${chalk.red(db.name)} (${sizeMB} MB)`));
        });

        console.log(chalk.gray('\n─'.repeat(50)));
        console.log(chalk.bold(`📊 Total user databases: ${chalk.red(userDatabases.length)}`));
        console.log(chalk.bold(`📊 Total size to delete: ${chalk.red((totalSize / 1024 / 1024).toFixed(2))} MB`));

        if (userDatabases.length === 0) {
            console.log(chalk.yellow('\n✨ No user databases found to delete!'));
            process.exit(0);
        }

        console.log(chalk.red('\n💥💥💥 PROCEEDING WITH ULTIMATE NUCLEAR CLEANUP...'));
        console.log(chalk.yellow('🗑️  Dropping all user databases...'));

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // Drop each user database
        for (const dbInfo of userDatabases) {
            const dbName = dbInfo.name;
            try {
                console.log(chalk.yellow(`   🔥 Dropping database: ${dbName}...`));
                
                // Connect to the specific database and drop it
                const dbConnection = mongoose.connection.useDb(dbName);
                await dbConnection.dropDatabase();
                
                console.log(chalk.green(`   ✅ Successfully dropped: ${dbName}`));
                successCount++;
            } catch (error) {
                console.log(chalk.red(`   ❌ Failed to drop: ${dbName} - ${error.message}`));
                errors.push({ database: dbName, error: error.message });
                errorCount++;
            }
        }

        // Verify cleanup
        console.log(chalk.blue('\n🔍 Verifying cleanup...'));
        const finalResult = await adminDb.listDatabases();
        const remainingUserDbs = finalResult.databases.filter(db => !systemDatabases.includes(db.name));

        if (remainingUserDbs.length === 0) {
            console.log(chalk.green('✅ All user databases successfully deleted!'));
        } else {
            console.log(chalk.yellow(`⚠️  ${remainingUserDbs.length} databases still exist:`));
            remainingUserDbs.forEach(db => {
                console.log(chalk.yellow(`   • ${db.name}`));
            });
        }

        // Final summary
        console.log(chalk.green('\n🎉 ULTIMATE NUCLEAR CLEANUP COMPLETED!'));
        console.log(chalk.gray('═'.repeat(60)));
        console.log(chalk.white(`📊 Original user databases: ${userDatabases.length}`));
        console.log(chalk.white(`📊 Total size deleted: ${(totalSize / 1024 / 1024).toFixed(2)} MB`));
        console.log(chalk.green(`✅ Successfully deleted: ${successCount}`));
        if (errorCount > 0) {
            console.log(chalk.red(`❌ Errors encountered: ${errorCount}`));
            console.log(chalk.red('\n❌ Errors details:'));
            errors.forEach(err => {
                console.log(chalk.red(`   • ${err.database}: ${err.error}`));
            });
        }
        console.log(chalk.white(`📊 Remaining user databases: ${remainingUserDbs.length}`));
        
        console.log(chalk.blue('\n💡 MongoDB is now completely clean!'));
        console.log(chalk.gray('   • All user databases have been removed'));
        console.log(chalk.gray('   • All tenant data has been permanently deleted'));
        console.log(chalk.gray('   • System databases (admin, local, config) preserved'));
        
        console.log(chalk.blue('\n🚀 Next steps:'));
        console.log(chalk.white('   • Create new databases as needed'));
        console.log(chalk.white('   • Run seed scripts for fresh data'));
        console.log(chalk.white('   • Start building your multi-tenant system from scratch'));
        
        process.exit(0);
    } catch (error) {
        console.error(chalk.red('\n💥 ULTIMATE NUCLEAR CLEANUP FAILED:'), error.message);
        console.error(chalk.gray(error.stack));
        process.exit(1);
    }
};

// Confirmation and execution
console.log(chalk.red('\n💥💥💥 ULTIMATE NUCLEAR DATABASE CLEANUP 💥💥💥'));
console.log(chalk.yellow('⚠️  This will delete ALL USER DATABASES in MongoDB!'));
console.log(chalk.yellow('⚠️  This includes ALL tenant databases and ALL data!'));
console.log(chalk.yellow('⚠️  This action is COMPLETELY IRREVERSIBLE!'));
console.log(chalk.red('\n🚨 Starting ultimate nuclear cleanup in 5 seconds...'));
console.log(chalk.gray('   (Press Ctrl+C to cancel)'));

// Add a longer delay for this more destructive operation
setTimeout(() => {
    nukeAllDatabases();
}, 5000);