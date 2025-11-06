/**
 * Drop Invalid Indexes Script
 * Drops the incorrect schoolId index from the schools collection
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/db.js';

// Connect to database
connectDB();

const dropIndexes = async () => {
    try {
        console.log('🔧 Dropping invalid indexes...\n');

        // Wait for connection
        await new Promise((resolve) => {
            if (mongoose.connection.readyState === 1) {
                resolve();
            } else {
                mongoose.connection.once('open', resolve);
            }
        });

        const db = mongoose.connection.db;
        const collection = db.collection('schools');

        // Get existing indexes
        const indexes = await collection.indexes();
        console.log('Existing indexes:', indexes.map(idx => idx.name).join(', '));

        // Drop the schoolId_1 index if it exists
        try {
            await collection.dropIndex('schoolId_1');
            console.log('✅ Dropped schoolId_1 index\n');
        } catch (error) {
            if (error.code === 27) {
                console.log('ℹ️  schoolId_1 index does not exist\n');
            } else {
                throw error;
            }
        }

        console.log('✅ Index cleanup completed!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error dropping indexes:', error);
        process.exit(1);
    }
};

dropIndexes();
