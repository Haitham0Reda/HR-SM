/**
 * Drop Database Script
 * Completely removes all data from the MongoDB database
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../..', '.env') });

const dropDatabase = async () => {
    try {
        console.log('🔌 Connecting to database...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✅ Database connected');

        console.log('🗑️  Dropping entire database...');
        
        // Drop the entire database
        await mongoose.connection.db.dropDatabase();
        
        console.log('✅ Database dropped successfully');
        
        // Close connection
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        
        console.log('\n🎉 Database has been completely deleted!');
        console.log('💡 Run "node seed.js" to recreate with fresh data');
        
    } catch (error) {
        console.error('❌ Error dropping database:', error);
        process.exit(1);
    }
};

// Run the script
dropDatabase();