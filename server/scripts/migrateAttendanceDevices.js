#!/usr/bin/env node

/**
 * Migration script to add tenantId to existing attendance devices
 * This script should be run once to migrate existing data to the multi-tenant structure
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AttendanceDevice from '../modules/hr-core/attendance/models/attendanceDevice.model.js';
import logger from '../utils/logger.js';

// Load environment variables
dotenv.config();

const migrateAttendanceDevices = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
        logger.info('Connected to MongoDB');

        // Find all attendance devices without tenantId
        const devicesWithoutTenant = await AttendanceDevice.find({ 
            tenantId: { $exists: false } 
        });

        logger.info(`Found ${devicesWithoutTenant.length} devices without tenantId`);

        if (devicesWithoutTenant.length === 0) {
            logger.info('No devices need migration');
            return;
        }

        // For single-tenant systems, you might want to set a default tenantId
        // For multi-tenant systems, you'll need to determine the correct tenantId for each device
        
        const defaultTenantId = process.env.DEFAULT_TENANT_ID;
        
        if (!defaultTenantId) {
            logger.error('DEFAULT_TENANT_ID environment variable is required for migration');
            logger.info('Please set DEFAULT_TENANT_ID to the ObjectId of the tenant that should own existing devices');
            process.exit(1);
        }

        // Validate that the tenantId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(defaultTenantId)) {
            logger.error('DEFAULT_TENANT_ID must be a valid MongoDB ObjectId');
            process.exit(1);
        }

        // Update all devices without tenantId
        const result = await AttendanceDevice.updateMany(
            { tenantId: { $exists: false } },
            { $set: { tenantId: new mongoose.Types.ObjectId(defaultTenantId) } }
        );

        logger.info(`Migration completed: ${result.modifiedCount} devices updated`);

        // Verify the migration
        const remainingDevicesWithoutTenant = await AttendanceDevice.countDocuments({ 
            tenantId: { $exists: false } 
        });

        if (remainingDevicesWithoutTenant === 0) {
            logger.info('✅ Migration successful - all devices now have tenantId');
        } else {
            logger.warn(`⚠️  ${remainingDevicesWithoutTenant} devices still missing tenantId`);
        }

    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
};

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateAttendanceDevices()
        .then(() => {
            logger.info('Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Migration script failed:', error);
            process.exit(1);
        });
}

export default migrateAttendanceDevices;