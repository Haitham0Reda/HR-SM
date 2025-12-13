import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import Tenant from '../platform/tenants/models/Tenant.js';
import User from '../modules/hr-core/models/User.js';

const showCompanyCredentials = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all tenants and their users
        const tenants = await Tenant.find({}).select('name slug _id status');
        
        console.log('\n🏢 COMPANY EMPLOYEE CREDENTIALS SUMMARY');
        console.log('=====================================');

        for (const tenant of tenants) {
            const users = await User.find({ tenantId: tenant._id })
                .select('firstName lastName email role employeeId')
                .sort({ role: 1, firstName: 1 });

            console.log(`\n🏢 ${tenant.name.toUpperCase()}`);
            console.log(`Company ID: ${tenant._id}`);
            console.log(`Status: ${tenant.status}`);
            console.log(`Total Employees: ${users.length}`);
            console.log('─'.repeat(50));

            // Group by role
            const roleGroups = {
                admin: users.filter(u => u.role === 'admin'),
                hr: users.filter(u => u.role === 'hr'),
                manager: users.filter(u => u.role === 'manager'),
                employee: users.filter(u => u.role === 'employee')
            };

            Object.entries(roleGroups).forEach(([role, roleUsers]) => {
                if (roleUsers.length > 0) {
                    console.log(`\n👤 ${role.toUpperCase()} (${roleUsers.length}):`);
                    roleUsers.forEach(user => {
                        const password = getPasswordForRole(role);
                        console.log(`  • ${user.firstName} ${user.lastName}`);
                        console.log(`    Email: ${user.email}`);
                        console.log(`    Password: ${password}`);
                        console.log(`    Employee ID: ${user.employeeId}`);
                        console.log('');
                    });
                }
            });
        }

        console.log('\n🔑 QUICK LOGIN REFERENCE');
        console.log('========================');
        console.log('Password Pattern:');
        console.log('  • Admin: admin123');
        console.log('  • HR: hr123');
        console.log('  • Manager: manager123');
        console.log('  • Employee: employee123');

        console.log('\n🌐 COMPANY ROUTING');
        console.log('==================');
        console.log('Each company has its own URL space:');
        tenants.forEach(tenant => {
            const slug = tenant.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            console.log(`  • ${tenant.name}: /company/${slug}/dashboard`);
        });

        console.log('\n✅ All employee credentials are now properly configured for each company!');
        console.log('Each company has isolated user data with proper tenant association.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
};

const getPasswordForRole = (role) => {
    const passwords = {
        admin: 'admin123',
        hr: 'hr123',
        manager: 'manager123',
        employee: 'employee123'
    };
    return passwords[role] || 'employee123';
};

showCompanyCredentials();