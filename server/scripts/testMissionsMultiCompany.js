import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Real companies from the database
const testCompanies = [
    {
        name: 'TechCorp Solutions',
        tenantId: '693db0e2ccc5ea08aeee120c',
        adminEmail: 'admin@techcorp.com',
        password: 'admin123'
    },
    {
        name: 'Global Manufacturing',
        tenantId: '693cd49596e80950a403b2e3',
        adminEmail: 'admin@globalmanuf.com',
        password: 'admin123'
    },
    {
        name: 'Startup Co',
        tenantId: '693cd49696e80950a403b2f3',
        adminEmail: 'founder@startupco.com',
        password: 'admin123'
    },
    {
        name: 'Test Company',
        tenantId: '693cd43ec91e4189aa2ecd2f',
        adminEmail: 'admin@testcompany.com',
        password: 'admin123'
    }
];

async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        throw error;
    }
}

async function createTestMissionsForAllCompanies() {
    try {
        console.log('🔧 Creating test missions for companies without missions...');
        
        // Import models
        const Mission = (await import('../modules/hr-core/missions/models/mission.model.js')).default;
        const User = (await import('../modules/hr-core/users/models/user.model.js')).default;
        
        for (const company of testCompanies) {
            console.log(`\n📝 Checking ${company.name}...`);
            
            // Find admin user for this company
            const adminUser = await User.findOne({ 
                email: company.adminEmail,
                tenantId: company.tenantId 
            });
            
            if (!adminUser) {
                console.log(`⚠️  Admin user not found for ${company.name}`);
                continue;
            }
            
            // Check if missions already exist for this company
            const existingMissions = await Mission.find({ tenantId: company.tenantId });
            
            if (existingMissions.length > 0) {
                console.log(`✅ ${company.name} already has ${existingMissions.length} missions`);
                continue;
            }
            
            // Create test missions for this company
            const missions = [
                {
                    employee: adminUser._id,
                    tenantId: company.tenantId,
                    location: `${company.name} - Regional Office`,
                    purpose: `Quarterly business review for ${company.name}`,
                    startDate: new Date('2024-03-15'),
                    endDate: new Date('2024-03-17'),
                    duration: 3,
                    status: 'pending'
                },
                {
                    employee: adminUser._id,
                    tenantId: company.tenantId,
                    location: `${company.name} - Client Site`,
                    purpose: `Project implementation meeting for ${company.name}`,
                    startDate: new Date('2024-04-10'),
                    endDate: new Date('2024-04-11'),
                    duration: 2,
                    status: 'approved'
                }
            ];
            
            await Mission.insertMany(missions);
            console.log(`✅ Created ${missions.length} test missions for ${company.name}`);
        }
        
    } catch (error) {
        console.error('❌ Error creating test missions:', error.message);
    }
}

async function testMissionsCompanyIsolation() {
    try {
        console.log('\n🧪 Testing Missions Company Data Isolation...\n');
        
        const results = [];
        
        for (const company of testCompanies) {
            console.log(`\n🏢 Testing ${company.name}...`);
            console.log('='.repeat(50));
            
            try {
                // Login to this company
                const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
                    email: company.adminEmail,
                    password: company.password,
                    tenantId: company.tenantId
                });
                
                const token = loginResponse.data.data.token;
                console.log(`✅ Login successful for ${company.name}`);
                
                // Get missions for this company
                const missionsResponse = await axios.get('http://localhost:5000/api/v1/missions', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const missions = missionsResponse.data.data || [];
                console.log(`📊 Found ${missions.length} missions for ${company.name}`);
                
                // Verify all missions belong to this company (critical security check)
                const invalidMissions = missions.filter(mission => mission.tenantId !== company.tenantId);
                
                if (invalidMissions.length > 0) {
                    console.log(`❌ CRITICAL SECURITY ISSUE: Found ${invalidMissions.length} missions from other companies!`);
                    invalidMissions.forEach(mission => {
                        console.log(`   - Mission ${mission._id} belongs to tenant ${mission.tenantId} (should be ${company.tenantId})`);
                    });
                } else {
                    console.log(`✅ All missions properly filtered for ${company.name}`);
                }
                
                // Verify employee data is also properly filtered
                const employeeIssues = missions.filter(mission => {
                    return mission.employee && mission.employee.tenantId && mission.employee.tenantId !== company.tenantId;
                });
                
                if (employeeIssues.length > 0) {
                    console.log(`❌ EMPLOYEE DATA LEAK: Found ${employeeIssues.length} missions with employees from other companies!`);
                } else {
                    console.log(`✅ Employee data properly isolated for ${company.name}`);
                }
                
                // Display mission details
                if (missions.length > 0) {
                    console.log(`📋 Mission details for ${company.name}:`);
                    missions.forEach((mission, index) => {
                        console.log(`   ${index + 1}. Location: ${mission.location}`);
                        console.log(`      Purpose: ${mission.purpose?.substring(0, 60)}...`);
                        console.log(`      Status: ${mission.status}`);
                        console.log(`      Tenant: ${mission.tenantId}`);
                        console.log(`      Employee: ${mission.employee?.personalInfo?.fullName || mission.employee?.username || 'N/A'}`);
                        console.log(`      Created: ${new Date(mission.createdAt).toLocaleDateString()}`);
                    });
                }
                
                results.push({
                    company: company.name,
                    tenantId: company.tenantId,
                    missionCount: missions.length,
                    properlyFiltered: invalidMissions.length === 0,
                    employeeDataSecure: employeeIssues.length === 0,
                    status: 'success'
                });
                
            } catch (error) {
                console.log(`❌ Error testing ${company.name}:`, error.response?.data?.message || error.message);
                results.push({
                    company: company.name,
                    tenantId: company.tenantId,
                    missionCount: 0,
                    properlyFiltered: false,
                    employeeDataSecure: false,
                    status: 'error',
                    error: error.message
                });
            }
        }
        
        // Comprehensive security report
        console.log('\n🔒 SECURITY ASSESSMENT REPORT');
        console.log('='.repeat(60));
        
        results.forEach(result => {
            const status = result.status === 'success' ? '✅' : '❌';
            const filtering = result.properlyFiltered ? '🔒 SECURE' : '⚠️  DATA LEAK';
            const employeeSecurity = result.employeeDataSecure ? '🔒 SECURE' : '⚠️  EMPLOYEE LEAK';
            
            console.log(`${status} ${result.company}`);
            console.log(`   Tenant ID: ${result.tenantId}`);
            console.log(`   Missions: ${result.missionCount}`);
            console.log(`   Mission Filtering: ${filtering}`);
            console.log(`   Employee Data: ${employeeSecurity}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            console.log('');
        });
        
        // Overall security assessment
        const successfulTests = results.filter(r => r.status === 'success').length;
        const secureFiltering = results.filter(r => r.properlyFiltered).length;
        const secureEmployeeData = results.filter(r => r.employeeDataSecure).length;
        
        console.log('🎯 OVERALL SECURITY STATUS:');
        console.log(`   Companies tested: ${results.length}`);
        console.log(`   Successful connections: ${successfulTests}`);
        console.log(`   Secure mission filtering: ${secureFiltering}/${results.length}`);
        console.log(`   Secure employee data: ${secureEmployeeData}/${results.length}`);
        
        if (secureFiltering === results.length && secureEmployeeData === results.length) {
            console.log('\n✅ EXCELLENT: ALL COMPANIES HAVE PROPER DATA ISOLATION');
            console.log('🔒 No data leakage detected between companies');
        } else {
            console.log('\n❌ CRITICAL SECURITY ISSUES DETECTED');
            console.log('⚠️  Data leakage between companies - IMMEDIATE ACTION REQUIRED');
        }
        
        // Test cross-company access attempt
        console.log('\n🕵️  Testing cross-company access prevention...');
        
        if (results.length >= 2) {
            const company1 = testCompanies[0];
            const company2 = testCompanies[1];
            
            try {
                // Login to company 1
                const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
                    email: company1.adminEmail,
                    password: company1.password,
                    tenantId: company1.tenantId
                });
                
                const token = loginResponse.data.data.token;
                
                // Try to access missions (should only see company 1's missions)
                const missionsResponse = await axios.get('http://localhost:5000/api/v1/missions', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const missions = missionsResponse.data.data || [];
                const otherCompanyMissions = missions.filter(m => m.tenantId !== company1.tenantId);
                
                if (otherCompanyMissions.length > 0) {
                    console.log(`❌ SECURITY BREACH: ${company1.name} can see missions from other companies!`);
                } else {
                    console.log(`✅ Cross-company access properly blocked for ${company1.name}`);
                }
                
            } catch (error) {
                console.log('⚠️  Could not test cross-company access:', error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function main() {
    try {
        await connectToDatabase();
        await createTestMissionsForAllCompanies();
        await testMissionsCompanyIsolation();
    } catch (error) {
        console.error('❌ Script failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

main();