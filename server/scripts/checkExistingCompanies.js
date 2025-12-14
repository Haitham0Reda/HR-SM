import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkExistingCompanies() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
        console.log('✅ Connected to MongoDB');
        
        // Import models
        const User = (await import('../modules/hr-core/users/models/user.model.js')).default;
        const Mission = (await import('../modules/hr-core/missions/models/mission.model.js')).default;
        
        console.log('\n🏢 Checking existing companies and users...');
        
        // Get all unique tenant IDs from users
        const tenants = await User.aggregate([
            { $group: { _id: '$tenantId', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log(`\n📊 Found ${tenants.length} companies with users:`);
        
        for (const tenant of tenants) {
            if (!tenant._id) continue;
            
            console.log(`\n🏢 Tenant ID: ${tenant._id}`);
            console.log(`   Users: ${tenant.count}`);
            
            // Get admin users for this tenant
            const adminUsers = await User.find({ 
                tenantId: tenant._id,
                $or: [
                    { role: 'admin' },
                    { email: { $regex: /admin@/ } }
                ]
            }).select('email username role');
            
            console.log(`   Admin users: ${adminUsers.length}`);
            adminUsers.forEach(admin => {
                console.log(`     - ${admin.email} (${admin.role})`);
            });
            
            // Check missions for this tenant
            const missions = await Mission.find({ tenantId: tenant._id });
            console.log(`   Missions: ${missions.length}`);
            
            if (missions.length > 0) {
                missions.forEach((mission, index) => {
                    console.log(`     ${index + 1}. ${mission.location} - ${mission.status}`);
                });
            }
        }
        
        // Check for missions without proper tenant isolation
        console.log('\n🔍 Checking for data isolation issues...');
        
        const allMissions = await Mission.find({}).populate('employee', 'email tenantId');
        console.log(`\n📋 Total missions in database: ${allMissions.length}`);
        
        const isolationIssues = [];
        
        for (const mission of allMissions) {
            if (mission.employee && mission.employee.tenantId !== mission.tenantId) {
                isolationIssues.push({
                    missionId: mission._id,
                    missionTenant: mission.tenantId,
                    employeeTenant: mission.employee.tenantId,
                    employeeEmail: mission.employee.email
                });
            }
        }
        
        if (isolationIssues.length > 0) {
            console.log(`❌ Found ${isolationIssues.length} data isolation issues:`);
            isolationIssues.forEach(issue => {
                console.log(`   Mission ${issue.missionId}:`);
                console.log(`     Mission tenant: ${issue.missionTenant}`);
                console.log(`     Employee tenant: ${issue.employeeTenant}`);
                console.log(`     Employee: ${issue.employeeEmail}`);
            });
        } else {
            console.log('✅ No data isolation issues found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkExistingCompanies();