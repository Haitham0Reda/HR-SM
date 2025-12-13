/**
 * Create default departments for testing
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Department from '../modules/hr-core/users/models/department.model.js';

// Load environment variables
dotenv.config();

const createDefaultDepartments = async () => {
    try {
        // Load environment variables
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
        console.log('Connecting to MongoDB...');
        
        // Connect to MongoDB
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB');

        // Check if departments already exist
        const existingDepartments = await Department.find({ tenantId: 'default-tenant' });
        
        if (existingDepartments.length > 0) {
            console.log(`Found ${existingDepartments.length} existing departments`);
            return existingDepartments;
        }

        // Create default departments
        const defaultDepartments = [
            {
                tenantId: 'default-tenant',
                name: 'Human Resources',
                arabicName: 'الموارد البشرية',
                code: 'HR',
                isActive: true
            },
            {
                tenantId: 'default-tenant',
                name: 'Information Technology',
                arabicName: 'تكنولوجيا المعلومات',
                code: 'IT',
                isActive: true
            },
            {
                tenantId: 'default-tenant',
                name: 'Finance',
                arabicName: 'المالية',
                code: 'FIN',
                isActive: true
            },
            {
                tenantId: 'default-tenant',
                name: 'Marketing',
                arabicName: 'التسويق',
                code: 'MKT',
                isActive: true
            },
            {
                tenantId: 'default-tenant',
                name: 'Operations',
                arabicName: 'العمليات',
                code: 'OPS',
                isActive: true
            }
        ];

        const createdDepartments = await Department.insertMany(defaultDepartments);
        console.log(`✓ Created ${createdDepartments.length} default departments`);
        
        return createdDepartments;
    } catch (error) {
        console.error('Error creating default departments:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the script
createDefaultDepartments()
    .then(() => {
        console.log('✓ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('✗ Script failed:', error);
        process.exit(1);
    });