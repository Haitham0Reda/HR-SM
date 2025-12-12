/**
 * Drop and Reseed Database Script
 * 
 * This script will:
 * 1. Drop the existing database completely
 * 2. Run the updated seed script with new modular structure
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory (root)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const dropAndReseed = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        
        // Connect to MongoDB
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);
        
        // Get database name
        const dbName = conn.connection.db.databaseName;
        console.log(`📊 Current database: ${dbName}`);
        
        // Drop the entire database
        console.log('🗑️  Dropping entire database...');
        await conn.connection.db.dropDatabase();
        console.log('✅ Database dropped successfully');
        
        // Close connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        
        console.log('\n🌱 Starting fresh database seed...');
        console.log('Please run: npm run seed');
        
    } catch (error) {
        console.error('❌ Error dropping database:', error);
        process.exit(1);
    }
};

dropAndReseed();