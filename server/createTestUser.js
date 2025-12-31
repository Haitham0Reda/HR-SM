import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import User from './modules/hr-core/users/models/user.model.js';

dotenv.config();

async function createTestUser() {
    try {
        await connectDB();
        console.log('Connected to database');
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: 'admin@techcorp.com' });
        if (existingUser) {
            console.log('✅ User already exists:', existingUser.email, 'tenant:', existingUser.tenantId);
            process.exit(0);
        }
        
        // Create test user
        const testUser = new User({
            tenantId: 'techcorp_solutions',
            employeeId: 'EMID-0001',
            username: 'admin',
            email: 'admin@techcorp.com',
            password: 'admin123',
            role: 'admin',
            status: 'active',
            personalInfo: {
                firstName: 'System',
                lastName: 'Administrator',
                arabicName: 'مسؤول النظام',
                phone: '+1-555-0101',
                gender: 'male',
                dateOfBirth: new Date('1980-01-01'),
                maritalStatus: 'married',
                nationalId: '1234567890'
            },
            employment: {
                hireDate: new Date('2020-01-01'),
                contractType: 'full-time',
                employmentStatus: 'active'
            }
        });
        
        await testUser.save();
        console.log('✅ Test user created successfully!');
        console.log('   Email:', testUser.email);
        console.log('   Tenant ID:', testUser.tenantId);
        console.log('   Password: admin123');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createTestUser();