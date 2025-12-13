/**
 * Migrate existing missions to add tenantId
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Mission from '../modules/hr-core/missions/models/mission.model.js';

// Load environment variables
dotenv.config();

const migrateMissions = async () => {
    try {
        // Load environment variables
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
        console.log('Connecting to MongoDB...');
        
        // Connect to MongoDB
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB');

        // Find missions without tenantId
        const missionsWithoutTenant = await Mission.find({ 
            $or: [
                { tenantId: { $exists: false } },
                { tenantId: null },
                { tenantId: '' }
            ]
        });
        
        console.log(`Found ${missionsWithoutTenant.length} missions without tenantId`);
        
        if (missionsWithoutTenant.length === 0) {
            console.log('No missions need migration');
            return;
        }

        // Update all missions to have default-tenant
        const result = await Mission.updateMany(
            { 
                $or: [
                    { tenantId: { $exists: false } },
                    { tenantId: null },
                    { tenantId: '' }
                ]
            },
            { $set: { tenantId: 'default-tenant' } }
        );

        console.log(`✓ Updated ${result.modifiedCount} missions with tenantId: default-tenant`);
        
        // Verify the update
        const updatedMissions = await Mission.find({ tenantId: 'default-tenant' });
        console.log(`✓ Verified: ${updatedMissions.length} missions now have tenantId`);
        
        return updatedMissions;
    } catch (error) {
        console.error('Error migrating missions:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the script
migrateMissions()
    .then(() => {
        console.log('✓ Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('✗ Migration failed:', error);
        process.exit(1);
    });