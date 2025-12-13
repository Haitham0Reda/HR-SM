/**
 * Create Admin and HR Users Script
 * 
 * Creates admin and HR users for testing purposes
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../modules/hr-core/users/models/user.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';
import Position from '../modules/hr-core/users/models/position.model.js';

dotenv.config();

const createAdminHRUsers = async () => {
    try {
        console.log('🔄 Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database\n');

        const tenantId = 'default-tenant';

        // Find HR department (or create if doesn't exist)
        let hrDepartment = await Department.findOne({ 
            name: { $regex: /hr|human.resources/i },
            tenantId 
        });

        if (!hrDepartment) {
            hrDepartment = await Department.create({
                name: 'Human Resources',
                code: 'HR',
                description: 'Human Resources Department',
                tenantId,
                isActive: true
            });
            console.log('✅ Created HR Department');
        }

        // Find or create HR Manager position
        let hrManagerPosition = await Position.findOne({
            title: { $regex: /hr.manager|human.resources.manager/i },
            tenantId
        });

        if (!hrManagerPosition) {
            hrManagerPosition = await Position.create({
                title: 'HR Manager',
                department: hrDepartment._id,
                level: 'Manager',
                description: 'Human Resources Manager',
                tenantId,
                isActive: true
            });
            console.log('✅ Created HR Manager Position');
        }

        // Create Admin User
        const adminExists = await User.findOne({ 
            email: 'admin@company.com',
            tenantId 
        });

        if (!adminExists) {
            const adminUser = await User.create({
                email: 'admin@company.com',
                password: 'Admin123!',
                firstName: 'System',
                lastName: 'Administrator',
                role: 'Admin',
                tenantId,
                employeeId: 'EMP-ADMIN-001',
                department: hrDepartment._id,
                position: hrManagerPosition._id,
                status: 'active'
            });
            console.log('✅ Created Admin User');
            console.log(`   Email: admin@company.com`);
            console.log(`   Password: Admin123!`);
            console.log(`   Role: Admin`);
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        // Create HR User
        const hrExists = await User.findOne({ 
            email: 'hr@company.com',
            tenantId 
        });

        if (!hrExists) {
            const hrUser = await User.create({
                email: 'hr@company.com',
                password: 'HR123!',
                firstName: 'HR',
                lastName: 'Manager',
                role: 'HR',
                tenantId,
                employeeId: 'EMP-HR-001',
                department: hrDepartment._id,
                position: hrManagerPosition._id,
                status: 'active'
            });
            console.log('✅ Created HR User');
            console.log(`   Email: hr@company.com`);
            console.log(`   Password: HR123!`);
            console.log(`   Role: HR`);
        } else {
            console.log('ℹ️  HR user already exists');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Admin and HR Users Creation Complete!');
        console.log('='.repeat(60));
        console.log('\n📝 Login Credentials for Testing:');
        console.log('\n🔑 Admin User:');
        console.log('   Email: admin@company.com');
        console.log('   Password: Admin123!');
        console.log('   Role: Admin');
        console.log('\n🔑 HR User:');
        console.log('   Email: hr@company.com');
        console.log('   Password: HR123!');
        console.log('   Role: HR');
        console.log('\n💡 Use these credentials to test resigned-employees endpoint');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
};

// Run the script
createAdminHRUsers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });