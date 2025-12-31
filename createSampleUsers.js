/**
 * Create sample users for techcorp_solutions tenant
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './server/modules/hr-core/users/models/user.model.js';
import Department from './server/modules/hr-core/users/models/department.model.js';
import Position from './server/modules/hr-core/users/models/position.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function createSampleUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrsm');
        console.log('✅ Connected to MongoDB');

        // Get departments and positions
        const departments = await Department.find({ tenantId: 'techcorp_solutions' });
        const positions = await Position.find({ tenantId: 'techcorp_solutions' });
        
        console.log(`📁 Found ${departments.length} departments`);
        console.log(`💼 Found ${positions.length} positions`);

        if (departments.length === 0 || positions.length === 0) {
            console.log('❌ Need departments and positions to create users');
            return;
        }

        // Check existing users
        const existingUsers = await User.find({ tenantId: 'techcorp_solutions' });
        console.log(`👥 Found ${existingUsers.length} existing users`);

        if (existingUsers.length > 0) {
            console.log('✅ Users already exist:');
            existingUsers.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.username} (${user.email}) - ${user.role}`);
            });
            return;
        }

        // Create sample users
        console.log('\n🔧 Creating sample users...');
        
        const sampleUsers = [
            {
                tenantId: 'techcorp_solutions',
                employeeId: 'EMP001',
                username: 'admin',
                email: 'admin@techcorp.com',
                password: await bcrypt.hash('admin123', 10),
                firstName: 'System',
                lastName: 'Administrator',
                role: 'admin',
                department: departments.find(d => d.code === 'HR')?._id || departments[0]._id,
                position: positions.find(p => p.code === 'HR')?._id || positions[0]._id,
                isActive: true,
                phoneNumber: '+1-555-0001',
                dateOfBirth: new Date('1985-01-15'),
                hireDate: new Date('2020-01-01'),
                gender: 'male'
            },
            {
                tenantId: 'techcorp_solutions',
                employeeId: 'EMP002',
                username: 'john.doe',
                email: 'john.doe@techcorp.com',
                password: await bcrypt.hash('password123', 10),
                firstName: 'John',
                lastName: 'Doe',
                role: 'employee',
                department: departments.find(d => d.code === 'ENG')?._id || departments[0]._id,
                position: positions.find(p => p.code === 'SE')?._id || positions[0]._id,
                isActive: true,
                phoneNumber: '+1-555-0002',
                dateOfBirth: new Date('1990-03-20'),
                hireDate: new Date('2021-06-15'),
                gender: 'male'
            },
            {
                tenantId: 'techcorp_solutions',
                employeeId: 'EMP003',
                username: 'jane.smith',
                email: 'jane.smith@techcorp.com',
                password: await bcrypt.hash('password123', 10),
                firstName: 'Jane',
                lastName: 'Smith',
                role: 'hr',
                department: departments.find(d => d.code === 'HR')?._id || departments[0]._id,
                position: positions.find(p => p.code === 'HR')?._id || positions[0]._id,
                isActive: true,
                phoneNumber: '+1-555-0003',
                dateOfBirth: new Date('1988-07-10'),
                hireDate: new Date('2020-09-01'),
                gender: 'female'
            },
            {
                tenantId: 'techcorp_solutions',
                employeeId: 'EMP004',
                username: 'mike.johnson',
                email: 'mike.johnson@techcorp.com',
                password: await bcrypt.hash('password123', 10),
                firstName: 'Mike',
                lastName: 'Johnson',
                role: 'manager',
                department: departments.find(d => d.code === 'PM')?._id || departments[0]._id,
                position: positions.find(p => p.code === 'PM')?._id || positions[0]._id,
                isActive: true,
                phoneNumber: '+1-555-0004',
                dateOfBirth: new Date('1982-11-25'),
                hireDate: new Date('2019-03-10'),
                gender: 'male'
            },
            {
                tenantId: 'techcorp_solutions',
                employeeId: 'EMP005',
                username: 'sarah.wilson',
                email: 'sarah.wilson@techcorp.com',
                password: await bcrypt.hash('password123', 10),
                firstName: 'Sarah',
                lastName: 'Wilson',
                role: 'employee',
                department: departments.find(d => d.code === 'QA')?._id || departments[0]._id,
                position: positions.find(p => p.code === 'QA')?._id || positions[0]._id,
                isActive: true,
                phoneNumber: '+1-555-0005',
                dateOfBirth: new Date('1992-05-18'),
                hireDate: new Date('2022-01-20'),
                gender: 'female'
            }
        ];

        await User.insertMany(sampleUsers);
        console.log(`✅ Created ${sampleUsers.length} sample users`);
        
        // Verify creation
        const newUsers = await User.find({ tenantId: 'techcorp_solutions' })
            .populate('department', 'name code')
            .populate('position', 'title code');
            
        console.log('\n👥 Created users:');
        newUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
            console.log(`      Role: ${user.role} | Dept: ${user.department?.name} | Pos: ${user.position?.title}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

createSampleUsers();