/**
 * Check departments for techcorp_solutions tenant
 */
import mongoose from 'mongoose';
import Department from './server/modules/hr-core/users/models/department.model.js';
import Tenant from './server/platform/tenants/models/Tenant.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkDepartments() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrsm');
        console.log('✅ Connected to MongoDB');

        // Check if techcorp_solutions tenant exists
        const tenant = await Tenant.findOne({ tenantId: 'techcorp_solutions' });
        console.log('\n📋 Tenant Info:');
        if (tenant) {
            console.log(`   Name: ${tenant.name}`);
            console.log(`   Status: ${tenant.status}`);
            console.log(`   Enabled Modules: ${JSON.stringify(tenant.enabledModules)}`);
        } else {
            console.log('   ❌ Tenant not found!');
            return;
        }

        // Check departments for techcorp_solutions
        const departments = await Department.find({ tenantId: 'techcorp_solutions' });
        console.log(`\n📁 Departments for techcorp_solutions: ${departments.length} found`);
        
        if (departments.length > 0) {
            departments.forEach((dept, index) => {
                console.log(`   ${index + 1}. ${dept.name} (${dept.code}) - Active: ${dept.isActive}`);
            });
        } else {
            console.log('   ❌ No departments found!');
            
            // Create a sample department
            console.log('\n🔧 Creating sample department...');
            const sampleDept = new Department({
                tenantId: 'techcorp_solutions',
                name: 'Information Technology',
                arabicName: 'تكنولوجيا المعلومات',
                code: 'IT',
                description: 'IT Department',
                isActive: true
            });
            
            await sampleDept.save();
            console.log('   ✅ Sample department created');
        }

        // Check all departments (for debugging)
        const allDepts = await Department.find({});
        console.log(`\n🔍 Total departments in database: ${allDepts.length}`);
        if (allDepts.length > 0) {
            console.log('   Tenant IDs found:');
            const tenantIds = [...new Set(allDepts.map(d => d.tenantId))];
            tenantIds.forEach(id => {
                const count = allDepts.filter(d => d.tenantId === id).length;
                console.log(`     - ${id}: ${count} departments`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkDepartments();