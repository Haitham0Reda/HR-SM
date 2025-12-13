/**
 * Create default tenant configuration
 * This script creates a default tenant configuration for development
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import TenantConfig from '../modules/hr-core/models/TenantConfig.js';
import { MODULES } from '../shared/constants/modules.js';

// Load environment variables
dotenv.config();

const createDefaultTenantConfig = async () => {
    try {
        // Load environment variables
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
        console.log('Connecting to MongoDB...');
        
        // Connect to MongoDB
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB');

        // Check if default tenant config already exists
        const existingConfig = await TenantConfig.findOne({ tenantId: 'default-tenant' });
        
        if (existingConfig) {
            console.log('Default tenant configuration already exists');
            return existingConfig;
        }

        // Create default tenant configuration
        const defaultConfig = new TenantConfig({
            tenantId: 'default-tenant',
            companyName: 'Default Company',
            deploymentMode: 'saas',
            modules: new Map([
                [MODULES.HR_CORE, { enabled: true, enabledAt: new Date() }],
                ['tasks', { enabled: true, enabledAt: new Date() }]
            ]),
            subscription: {
                plan: 'professional',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                maxEmployees: 100
            },
            settings: {
                timezone: 'UTC',
                dateFormat: 'YYYY-MM-DD',
                currency: 'USD',
                language: 'en'
            }
        });

        await defaultConfig.save();
        console.log('✓ Default tenant configuration created successfully');
        
        return defaultConfig;
    } catch (error) {
        console.error('Error creating default tenant configuration:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the script
createDefaultTenantConfig()
    .then(() => {
        console.log('✓ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('✗ Script failed:', error);
        process.exit(1);
    });

export default createDefaultTenantConfig;