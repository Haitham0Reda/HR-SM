/**
 * Create default positions for testing
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Position from '../modules/hr-core/users/models/position.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';

// Load environment variables
dotenv.config();

const createDefaultPositions = async () => {
    try {
        // Load environment variables
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
        console.log('Connecting to MongoDB...');
        
        // Connect to MongoDB
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB');

        // Check if positions already exist (with or without tenantId)
        const allPositions = await Position.find({});
        const tenantPositions = await Position.find({ tenantId: 'default-tenant' });
        
        console.log(`Found ${allPositions.length} total positions, ${tenantPositions.length} for default-tenant`);
        
        if (allPositions.length > 0) {
            console.log('Existing positions:');
            allPositions.forEach(pos => {
                console.log(`  - ${pos.title} (${pos.code}) - tenantId: ${pos.tenantId || 'none'}`);
            });
        }
        
        if (tenantPositions.length > 0) {
            return tenantPositions;
        }

        // Get departments to link positions to
        const departments = await Department.find({ tenantId: 'default-tenant' });
        
        if (departments.length === 0) {
            console.log('No departments found. Please create departments first.');
            return [];
        }

        console.log(`Found ${departments.length} departments`);

        // Create default positions
        const defaultPositions = [
            {
                tenantId: 'default-tenant',
                title: 'HR Manager',
                arabicTitle: 'مدير الموارد البشرية',
                code: 'HR-MGR',
                department: departments.find(d => d.code === 'HR')?._id || departments[0]._id,
                isActive: true
            },
            {
                tenantId: 'default-tenant',
                title: 'Software Developer',
                arabicTitle: 'مطور برمجيات',
                code: 'SW-DEV',
                department: departments.find(d => d.code === 'IT')?._id || departments[0]._id,
                isActive: true
            },
            {
                tenantId: 'default-tenant',
                title: 'Financial Analyst',
                arabicTitle: 'محلل مالي',
                code: 'FIN-ANA',
                department: departments.find(d => d.code === 'FIN')?._id || departments[0]._id,
                isActive: true
            },
            {
                tenantId: 'default-tenant',
                title: 'Marketing Specialist',
                arabicTitle: 'أخصائي تسويق',
                code: 'MKT-SPC',
                department: departments.find(d => d.code === 'MKT')?._id || departments[0]._id,
                isActive: true
            },
            {
                tenantId: 'default-tenant',
                title: 'Operations Coordinator',
                arabicTitle: 'منسق العمليات',
                code: 'OPS-CRD',
                department: departments.find(d => d.code === 'OPS')?._id || departments[0]._id,
                isActive: true
            }
        ];

        const createdPositions = await Position.insertMany(defaultPositions);
        console.log(`✓ Created ${createdPositions.length} default positions`);
        
        return createdPositions;
    } catch (error) {
        console.error('Error creating default positions:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the script
createDefaultPositions()
    .then(() => {
        console.log('✓ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('✗ Script failed:', error);
        process.exit(1);
    });