/**
 * Database Configuration
 * 
 * Handles MongoDB connection using Mongoose
 * Connection string is loaded from environment variables
 */

import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 * Uses connection string from MONGO_URI environment variable
 * 
 * @returns {Promise<void>}
 * @throws {Error} If connection fails
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected Successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        // Don't exit process - let the application handle the error
    }
};

export default connectDB;
