import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import Tenant from '../platform/tenants/models/Tenant.js';
import User from '../modules/hr-core/models/User.js';

const createCompanyEmployees = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear all existing users
        console.log('Clearing existing users...');
        await User.deleteMany({});
        console.log('✓ Users cleared');

        // Get all tenants (companies)
        const tenants = await Tenant.find({}).select('name slug _id status');
        console.log(`\nFound ${tenants.length} companies:`);
        tenants.forEach(tenant => {
            console.log(`- ${tenant.name} - ID: ${tenant._id}`);
        });

        // Define company-specific employee data with unique employee IDs
        const companyEmployees = {
            'TechCorp Solutions': [
                { email: 'admin@techcorp.com', firstName: 'Admin', lastName: 'TechCorp', role: 'admin', password: 'admin123', employeeId: 'TC001' },
                { email: 'hr@techcorp.com', firstName: 'Sarah', lastName: 'Johnson', role: 'hr', password: 'hr123', employeeId: 'TC002' },
                { email: 'manager@techcorp.com', firstName: 'Mike', lastName: 'Wilson', role: 'manager', password: 'manager123', employeeId: 'TC003' },
                { email: 'john.doe@techcorp.com', firstName: 'John', lastName: 'Doe', role: 'employee', password: 'employee123', employeeId: 'TC004' },
                { email: 'jane.smith@techcorp.com', firstName: 'Jane', lastName: 'Smith', role: 'employee', password: 'employee123', employeeId: 'TC005' },
                { email: 'ahmed.ali@techcorp.com', firstName: 'Ahmed', lastName: 'Ali', role: 'employee', password: 'employee123', employeeId: 'TC006' },
                { email: 'fatma.mohamed@techcorp.com', firstName: 'Fatma', lastName: 'Mohamed', role: 'employee', password: 'employee123', employeeId: 'TC007' },
                { email: 'omar.ibrahim@techcorp.com', firstName: 'Omar', lastName: 'Ibrahim', role: 'employee', password: 'employee123', employeeId: 'TC008' }
            ],
            'Test Company': [
                { email: 'admin@testcompany.com', firstName: 'Test', lastName: 'Admin', role: 'admin', password: 'admin123', employeeId: 'TEST001' },
                { email: 'hr@testcompany.com', firstName: 'Test', lastName: 'HR', role: 'hr', password: 'hr123', employeeId: 'TEST002' },
                { email: 'employee@testcompany.com', firstName: 'Test', lastName: 'Employee', role: 'employee', password: 'employee123', employeeId: 'TEST003' }
            ],
            'Global Manufacturing Inc': [
                { email: 'admin@globalmanuf.com', firstName: 'Global', lastName: 'Admin', role: 'admin', password: 'admin123', employeeId: 'GM001' },
                { email: 'hr@globalmanuf.com', firstName: 'Maria', lastName: 'Rodriguez', role: 'hr', password: 'hr123', employeeId: 'GM002' },
                { email: 'manager@globalmanuf.com', firstName: 'David', lastName: 'Chen', role: 'manager', password: 'manager123', employeeId: 'GM003' },
                { email: 'worker1@globalmanuf.com', firstName: 'Robert', lastName: 'Brown', role: 'employee', password: 'employee123', employeeId: 'GM004' },
                { email: 'worker2@globalmanuf.com', firstName: 'Lisa', lastName: 'Davis', role: 'employee', password: 'employee123', employeeId: 'GM005' }
            ],
            'StartupCo': [
                { email: 'founder@startupco.com', firstName: 'Alex', lastName: 'Founder', role: 'admin', password: 'admin123', employeeId: 'SC001' },
                { email: 'cto@startupco.com', firstName: 'Sam', lastName: 'Tech', role: 'manager', password: 'manager123', employeeId: 'SC002' },
                { email: 'dev1@startupco.com', firstName: 'Emma', lastName: 'Developer', role: 'employee', password: 'employee123', employeeId: 'SC003' },
                { email: 'dev2@startupco.com', firstName: 'Ryan', lastName: 'Coder', role: 'employee', password: 'employee123', employeeId: 'SC004' }
            ]
        };

        console.log('\n=== CREATING COMPANY EMPLOYEES ===');

        let totalCreated = 0;

        // Create users for each company (skip duplicate StartupCo)
        const processedCompanies = new Set();
        
        for (const tenant of tenants) {
            const companyName = tenant.name;
            
            // Skip duplicate StartupCo entries
            if (processedCompanies.has(companyName)) {
                console.log(`⚠️  Skipping duplicate company: ${companyName}`);
                continue;
            }
            processedCompanies.add(companyName);
            
            const employees = companyEmployees[companyName];
            
            if (!employees) {
                console.log(`⚠️  No employee data defined for ${companyName}, skipping...`);
                continue;
            }

            console.log(`\n📝 Creating employees for ${companyName}:`);

            for (const employeeData of employees) {
                try {
                    // Create user with proper tenant ID and unique employee ID
                    const user = new User({
                        firstName: employeeData.firstName,
                        lastName: employeeData.lastName,
                        email: employeeData.email,
                        password: employeeData.password, // Will be hashed by pre-save hook
                        role: employeeData.role,
                        employeeId: employeeData.employeeId, // Unique employee ID
                        tenantId: tenant._id, // Use ObjectId, not string
                        status: 'active',
                        hireDate: new Date(),
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });

                    await user.save();
                    console.log(`  ✓ Created: ${employeeData.firstName} ${employeeData.lastName} (${employeeData.email}) - ${employeeData.role} - ID: ${employeeData.employeeId}`);
                    totalCreated++;

                } catch (error) {
                    console.error(`  ✗ Failed to create ${employeeData.email}:`, error.message);
                }
            }
        }

        console.log(`\n=== SUMMARY ===`);
        console.log(`Total employees created: ${totalCreated}`);

        // Verify the updates
        console.log('\n=== VERIFICATION ===');
        const updatedUsers = await User.find({}).select('firstName lastName email role employeeId tenantId');
        
        for (const tenant of tenants) {
            const companyName = tenant.name;
            if (!processedCompanies.has(companyName)) continue;
            
            const tenantUsers = updatedUsers.filter(user => 
                user.tenantId && user.tenantId.toString() === tenant._id.toString()
            );
            console.log(`\n${tenant.name} (${tenantUsers.length} employees):`);
            tenantUsers.forEach(user => {
                console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role} - ID: ${user.employeeId}`);
            });
        }

        console.log('\n✅ Company employees created successfully!');
        console.log('\n🔑 Login credentials for testing:');
        console.log('\n🏢 TechCorp Solutions:');
        console.log('  Admin: admin@techcorp.com / admin123');
        console.log('  HR: hr@techcorp.com / hr123');
        console.log('  Manager: manager@techcorp.com / manager123');
        console.log('  Employee: john.doe@techcorp.com / employee123');
        
        console.log('\n🏢 Test Company:');
        console.log('  Admin: admin@testcompany.com / admin123');
        console.log('  HR: hr@testcompany.com / hr123');
        
        console.log('\n🏢 Global Manufacturing Inc:');
        console.log('  Admin: admin@globalmanuf.com / admin123');
        console.log('  HR: hr@globalmanuf.com / hr123');
        
        console.log('\n🏢 StartupCo:');
        console.log('  Admin: founder@startupco.com / admin123');
        console.log('  Manager: cto@startupco.com / manager123');

        console.log('\n📝 All employees now have proper company-specific credentials and employee IDs!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
};

createCompanyEmployees();