/**
 * Migrate existing positions to add tenantId
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Position from '../modules/hr-core/users/models/position.model.js';

// Load environment variables
dotenv.config();

const migratePositions = async () => {
    try {
        // Load environment variables
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
        console.log('Connecting to MongoDB...');
        
        // Connect to MongoDB
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB');

        // Find positions without tenantId
        const positionsWithoutTenant = await Position.find({ 
            $or: [
                { tenantId: { $exists: false } },
                { tenantId: null },
                { tenantId: '' }
            ]
        });
        
        console.log(`Found ${positionsWithoutTenant.length} positions without tenantId`);
        
        if (positionsWithoutTenant.length === 0) {
            console.log('No positions need migration');
            return;
        }

        // Update all positions to have default-tenant
        const result = await Position.updateMany(
            { 
                $or: [
                    { tenantId: { $exists: false } },
                    { tenantId: null },
                    { tenantId: '' }
                ]
            },
            { $set: { tenantId: 'default-tenant' } }
        );

        console.log(`✓ Updated ${result.modifiedCount} positions with tenantId: default-tenant`);
        
        // Verify the update
        const updatedPositions = await Position.find({ tenantId: 'default-tenant' });
        console.log(`✓ Verified: ${updatedPositions.length} positions now have tenantId`);
        
        return updatedPositions;
    } catch (error) {
        console.error('Error migrating positions:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the script
migratePositions()
    .then(() => {
        console.log('✓ Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('✗ Migration failed:', error);
        process.exit(1);
    });