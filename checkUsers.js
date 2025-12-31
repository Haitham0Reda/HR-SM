/**
 * Check users for techcorp_solutions tenant
 */
import mongoose from 'mongoose';
import User from './server/modules/hr-core/users/models/user.model.js';
import Department from './server/modules/hr-core/users/models/department.model.js';
import Position from './server/modules/hr-core/users/models/position.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrsm');
        console.log('✅ Connected to MongoDB');

        // Check users for techcorp_solutions
        const users = await User.find({ tenantId: 'techcorp_solutions' })
            .populate('department', 'name code')
            .populate('position', 'title code')
            .select('-password'); // Don't show passwords

        console.log(`\n👥 Users for techcorp_solutions: ${users.length} found`);
        
        if (users.length > 0) {
            console.log('\n📋 User Details:');
            users.forEach((user, index) => {
                console.log(`\n${index + 1}. ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
                console.log(`   📧 Email: ${user.email}`);
                console.log(`   👤 Username: ${user.username}`);
                console.log(`   🆔 Employee ID: ${user.employeeId}`);
                console.log(`   🎭 Role: ${user.role}`);
                console.log(`   🏢 Department: ${user.department?.name || 'N/A'} (${user.department?.code || 'N/A'})`);
                console.log(`   💼 Position: ${user.position?.title || 'N/A'} (${user.position?.code || 'N/A'})`);
                console.log(`   📱 Phone: ${user.phoneNumber || 'N/A'}`);
                console.log(`   ✅ Active: ${user.isActive ? 'Yes' : 'No'}`);
                console.log(`   📅 Hire Date: ${user.hireDate ? user.hireDate.toDateString() : 'N/A'}`);
            });
        } else {
            console.log('   ❌ No users found!');
        }

        // Check all users (for debugging)
        const allUsers = await User.find({});
        console.log(`\n🔍 Total users in database: ${allUsers.length}`);
        if (allUsers.length > 0) {
            console.log('   Tenant IDs found:');
            const tenantIds = [...new Set(allUsers.map(u => u.tenantId))];
            tenantIds.forEach(id => {
                const count = allUsers.filter(u => u.tenantId === id).length;
                console.log(`     - ${id}: ${count} users`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkUsers();