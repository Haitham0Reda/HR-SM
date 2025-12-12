/**
 * Drop Invalid Indexes Script
 * 
 * Utility script to drop invalid or outdated database indexes
 * Useful for database maintenance and fixing index issues
 * 
 * Usage: node server/scripts/dropIndexes.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

/**
 * Drop invalid indexes from collections
 */
const dropIndexes = async () => {
    try {
        console.log('🔧 Starting index cleanup...\n');

        // Connect to database
        await connectDB();

        // Wait for connection to be ready
        await new Promise((resolve) => {
            if (mongoose.connection.readyState === 1) {
                resolve();
            } else {
                mongoose.connection.once('open', resolve);
            }
        });

        const db = mongoose.connection.db;
        
        // List of collections and indexes to drop
        const indexesToDrop = [
            { collection: 'organizations', index: 'organizationId_1' },
            // Add more collections and indexes here as needed
        ];

        for (const { collection: collectionName, index: indexName } of indexesToDrop) {
            try {
                const collection = db.collection(collectionName);
                
                // Get existing indexes
                const indexes = await collection.indexes();
                console.log(`📋 ${collectionName} indexes:`, indexes.map(idx => idx.name).join(', '));

                // Try to drop the index
                if (indexes.some(idx => idx.name === indexName)) {
                    await collection.dropIndex(indexName);
                    console.log(`✅ Dropped ${indexName} from ${collectionName}\n`);
                } else {
                    console.log(`ℹ️  Index ${indexName} does not exist in ${collectionName}\n`);
                }
            } catch (error) {
                if (error.code === 27) {
                    console.log(`ℹ️  Index ${indexName} does not exist in ${collectionName}\n`);
                } else {
                    console.error(`❌ Error dropping ${indexName} from ${collectionName}:`, error.message);
                }
            }
        }

        console.log('✅ Index cleanup completed!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during index cleanup:', error.message);
        process.exit(1);
    }
};

dropIndexes();
