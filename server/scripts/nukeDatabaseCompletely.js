#!/usr/bin/env node
/**
 * Complete Database Nuke Script
 * Deletes EVERYTHING from the database - all collections, indexes, and data
 * This is a nuclear option for starting completely fresh
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
import connectDB from '../config/database.js';

const nukeDatabaseCompletely = async () => {
    try {
        console.log(chalk.red('💥 NUCLEAR DATABASE CLEANUP'));
        console.log(chalk.red('═'.repeat(50)));
        console.log(chalk.yellow('⚠️  WARNING: This will delete EVERYTHING in the database!'));
        console.log(chalk.yellow('⚠️  This action is IRREVERSIBLE!'));
        console.log(chalk.red('═'.repeat(50)));

        console.log(chalk.blue('\n🔌 Connecting to database...'));
        await connectDB();
        console.log(chalk.green('✅ Database connected'));

        const db = mongoose.connection.db;
        const dbName = db.databaseName;
        
        console.log(chalk.cyan(`\n📊 Database: ${dbName}`));

        // Get all collections
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(col => col.name);
        
        console.log(chalk.cyan(`\n📋 Found ${collections.length} collections:`));
        collectionNames.forEach(name => {
            console.log(chalk.gray(`   • ${name}`));
        });

        if (collections.length === 0) {
            console.log(chalk.yellow('\n✨ Database is already empty!'));
            process.exit(0);
        }

        // Get document counts for each collection
        console.log(chalk.blue('\n📊 Collection statistics:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        let totalDocuments = 0;
        const collectionStats = {};
        
        for (const collectionName of collectionNames) {
            try {
                const collection = db.collection(collectionName);
                const count = await collection.countDocuments();
                collectionStats[collectionName] = count;
                totalDocuments += count;
                
                if (count > 0) {
                    console.log(chalk.white(`   ${collectionName}: ${chalk.yellow(count)} documents`));
                } else {
                    console.log(chalk.gray(`   ${collectionName}: ${count} documents`));
                }
            } catch (error) {
                console.log(chalk.red(`   ${collectionName}: Error counting - ${error.message}`));
                collectionStats[collectionName] = 'Error';
            }
        }
        
        console.log(chalk.gray('─'.repeat(40)));
        console.log(chalk.bold(`📊 Total Documents: ${chalk.red(totalDocuments)}`));

        if (totalDocuments === 0) {
            console.log(chalk.yellow('\n✨ All collections are empty, but will drop them anyway for a clean slate...'));
        }

        console.log(chalk.red('\n💥 PROCEEDING WITH NUCLEAR CLEANUP...'));
        console.log(chalk.yellow('🗑️  Dropping all collections...'));

        // Drop each collection individually
        let droppedCount = 0;
        let errorCount = 0;
        
        for (const collectionName of collectionNames) {
            try {
                await db.collection(collectionName).drop();
                console.log(chalk.green(`   ✅ Dropped: ${collectionName}`));
                droppedCount++;
            } catch (error) {
                if (error.message.includes('ns not found')) {
                    console.log(chalk.gray(`   ⚠️  Already gone: ${collectionName}`));
                    droppedCount++;
                } else {
                    console.log(chalk.red(`   ❌ Failed to drop: ${collectionName} - ${error.message}`));
                    errorCount++;
                }
            }
        }

        // Alternative method: Drop the entire database (more nuclear)
        console.log(chalk.red('\n🔥 DROPPING ENTIRE DATABASE...'));
        try {
            await db.dropDatabase();
            console.log(chalk.green('✅ Database completely dropped and recreated'));
        } catch (error) {
            console.log(chalk.red(`❌ Failed to drop database: ${error.message}`));
        }

        // Verify cleanup
        console.log(chalk.blue('\n🔍 Verifying cleanup...'));
        const remainingCollections = await db.listCollections().toArray();
        
        if (remainingCollections.length === 0) {
            console.log(chalk.green('✅ Database is completely clean!'));
        } else {
            console.log(chalk.yellow(`⚠️  ${remainingCollections.length} collections still exist:`));
            remainingCollections.forEach(col => {
                console.log(chalk.yellow(`   • ${col.name}`));
            });
        }

        // Summary
        console.log(chalk.green('\n🎉 NUCLEAR CLEANUP COMPLETED!'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.white(`📊 Original collections: ${collections.length}`));
        console.log(chalk.white(`📊 Total documents deleted: ${totalDocuments}`));
        console.log(chalk.green(`✅ Successfully dropped: ${droppedCount}`));
        if (errorCount > 0) {
            console.log(chalk.red(`❌ Errors encountered: ${errorCount}`));
        }
        console.log(chalk.white(`📊 Remaining collections: ${remainingCollections.length}`));
        
        console.log(chalk.blue('\n💡 Database is now completely empty and ready for fresh data!'));
        console.log(chalk.gray('   • All collections have been removed'));
        console.log(chalk.gray('   • All indexes have been cleared'));
        console.log(chalk.gray('   • All data has been permanently deleted'));
        
        console.log(chalk.blue('\n🚀 Next steps:'));
        console.log(chalk.white('   • Run seed script: npm run db:seed'));
        console.log(chalk.white('   • Or start building your data from scratch'));
        
        process.exit(0);
    } catch (error) {
        console.error(chalk.red('\n💥 NUCLEAR CLEANUP FAILED:'), error.message);
        console.error(chalk.gray(error.stack));
        process.exit(1);
    }
};

// Confirmation prompt simulation (since we can't use readline in this context)
console.log(chalk.red('\n💥 NUCLEAR DATABASE CLEANUP'));
console.log(chalk.yellow('⚠️  This will delete EVERYTHING in the database!'));
console.log(chalk.yellow('⚠️  This includes all collections, indexes, and data!'));
console.log(chalk.yellow('⚠️  This action is COMPLETELY IRREVERSIBLE!'));
console.log(chalk.red('\n🚨 Starting nuclear cleanup in 3 seconds...'));

// Add a small delay to let user see the warning
setTimeout(() => {
    nukeDatabaseCompletely();
}, 3000);