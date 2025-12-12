/**
 * Verify that the database was seeded correctly
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory (root)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import connectDB from '../config/db.js';

// Import models
import User from '../modules/hr-core/users/models/user.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';
import Position from '../modules/hr-core/users/models/position.model.js';
import organization from '../platform/models/organization.model.js';

const verifySeeding = async () => {
    try {
        console.log('🔌 Connecting to database...');
        await connectDB();
        console.log('✅ Database connected');

        console.log('\n📊 Verifying seeded data...\n');

        // Check organizations
        const organizationCount = await organization.countDocuments();
        console.log(`🏫 organizations: ${organizationCount}`);

        // Check departments
        const departmentCount = await Department.countDocuments();
        console.log(`🏢 Departments: ${departmentCount}`);

        // Check positions
        const positionCount = await Position.countDocuments();
        console.log(`💼 Positions: ${positionCount}`);

        // Check users
        const userCount = await User.countDocuments();
        console.log(`👥 Users: ${userCount}`);

        // Check user roles
        const adminCount = await User.countDocuments({ role: 'admin' });
        const hrCount = await User.countDocuments({ role: 'hr' });
        const managerCount = await User.countDocuments({ role: 'manager' });
        const employeeCount = await User.countDocuments({ role: 'employee' });

        console.log(`\n👑 User Roles:`);
        console.log(`   Admin: ${adminCount}`);
        console.log(`   HR: ${hrCount}`);
        console.log(`   Manager: ${managerCount}`);
        console.log(`   Employee: ${employeeCount}`);

        // Check tenantId consistency
        const usersWithTenant = await User.countDocuments({ tenantId: 'default-tenant' });
        const departmentsWithTenant = await Department.countDocuments({ tenantId: 'default-tenant' });
        const positionsWithTenant = await Position.countDocuments({ tenantId: 'default-tenant' });

        console.log(`\n🏷️  TenantId Consistency:`);
        console.log(`   Users with tenantId: ${usersWithTenant}/${userCount}`);
        console.log(`   Departments with tenantId: ${departmentsWithTenant}/${departmentCount}`);
        console.log(`   Positions with tenantId: ${positionsWithTenant}/${positionCount}`);

        // Sample user data
        const sampleUser = await User.findOne({ username: 'admin' }).select('username email role tenantId');
        console.log(`\n👤 Sample User:`, {
            username: sampleUser.username,
            email: sampleUser.email,
            role: sampleUser.role,
            tenantId: sampleUser.tenantId
        });

        console.log('\n✅ Database verification completed successfully!');
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error verifying database:', error);
        process.exit(1);
    }
};

verifySeeding();