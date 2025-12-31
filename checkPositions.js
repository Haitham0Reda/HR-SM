/**
 * Check positions for techcorp_solutions tenant
 */
import mongoose from 'mongoose';
import Position from './server/modules/hr-core/users/models/position.model.js';
import Tenant from './server/platform/tenants/models/Tenant.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkPositions() {
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
        } else {
            console.log('   ❌ Tenant not found!');
            return;
        }

        // Check positions for techcorp_solutions
        const positions = await Position.find({ tenantId: 'techcorp_solutions' });
        console.log(`\n💼 Positions for techcorp_solutions: ${positions.length} found`);
        
        if (positions.length > 0) {
            positions.forEach((pos, index) => {
                console.log(`   ${index + 1}. ${pos.title} (${pos.code}) - Active: ${pos.isActive}`);
            });
        } else {
            console.log('   ❌ No positions found!');
            
            // Get departments first
            const Department = (await import('./server/modules/hr-core/users/models/department.model.js')).default;
            const departments = await Department.find({ tenantId: 'techcorp_solutions' });
            
            if (departments.length === 0) {
                console.log('   ❌ No departments found! Cannot create positions without departments.');
                return;
            }
            
            console.log(`   📁 Found ${departments.length} departments to assign positions to`);
            
            // Create sample positions
            console.log('\n🔧 Creating sample positions...');
            const samplePositions = [
                {
                    tenantId: 'techcorp_solutions',
                    title: 'Software Engineer',
                    code: 'SE',
                    department: departments.find(d => d.code === 'ENG')?._id || departments[0]._id,
                    jobDescription: 'Software development and maintenance',
                    isActive: true
                },
                {
                    tenantId: 'techcorp_solutions',
                    title: 'Product Manager',
                    code: 'PM',
                    department: departments.find(d => d.code === 'PM')?._id || departments[0]._id,
                    jobDescription: 'Product strategy and management',
                    isActive: true
                },
                {
                    tenantId: 'techcorp_solutions',
                    title: 'DevOps Engineer',
                    code: 'DEVOPS',
                    department: departments.find(d => d.code === 'DEVOPS')?._id || departments[0]._id,
                    jobDescription: 'Infrastructure and deployment',
                    isActive: true
                },
                {
                    tenantId: 'techcorp_solutions',
                    title: 'QA Engineer',
                    code: 'QA',
                    department: departments.find(d => d.code === 'QA')?._id || departments[0]._id,
                    jobDescription: 'Quality assurance and testing',
                    isActive: true
                },
                {
                    tenantId: 'techcorp_solutions',
                    title: 'HR Specialist',
                    code: 'HR',
                    department: departments.find(d => d.code === 'HR')?._id || departments[0]._id,
                    jobDescription: 'Human resources management',
                    isActive: true
                }
            ];
            
            await Position.insertMany(samplePositions);
            console.log('   ✅ Sample positions created');
        }

        // Check all positions (for debugging)
        const allPositions = await Position.find({});
        console.log(`\n🔍 Total positions in database: ${allPositions.length}`);
        if (allPositions.length > 0) {
            console.log('   Tenant IDs found:');
            const tenantIds = [...new Set(allPositions.map(p => p.tenantId))];
            tenantIds.forEach(id => {
                const count = allPositions.filter(p => p.tenantId === id).length;
                console.log(`     - ${id}: ${count} positions`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkPositions();