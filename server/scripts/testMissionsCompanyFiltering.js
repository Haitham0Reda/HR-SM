import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Test companies data
const testCompanies = [
    {
        name: 'TechCorp Solutions',
        tenantId: '693db0e2ccc5ea08aeee120c',
        adminEmail: 'admin@techcorp.com',
        password: 'admin123'
    },
    {
        name: 'Healthcare Plus',
        tenantId: '693db0e2ccc5ea08aeee120d',
        adminEmail: 'admin@healthcareplus.com',
        password: 'admin123'
    },
    {
        name: 'Global Manufacturing Inc',
        tenantId: '693db0e2ccc5ea08aeee120e',
        adminEmail: 'admin@globalmanufacturing.com',
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

async function createTestMissions() {
    try {
        console.log('🔧 Creating test missions for each company...');
        
        // Import Mission model
        const Mission = (await import('../modules/hr-core/missions/models/mission.model.js')).default;
        const User = (await import('../modules/hr-core/users/models/user.model.js')).default;
        
        for (const company of testCompanies) {
            console.log(`\n📝 Creating missions for ${company.name}...`);
            
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
                    location: `${company.name} - New York Office`,
                    purpose: `Business meeting for ${company.name} quarterly review`,
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-01-17'),
                    duration: 3,
                    status: 'pending'
                },
                {
                    employee: adminUser._id,
                    tenantId: company.tenantId,
                    location: `${company.name} - London Branch`,
                    purpose: `Training session for ${company.name} new procedures`,
                    startDate: new Date('2024-02-10'),
                    endDate: new Date('2024-02-12'),
                    duration: 3,
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

async function testCompanyFiltering() {
    try {
        console.log('🧪 Testing Missions Company Filtering...\n');
        
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
                
                // Verify all missions belong to this company
                const invalidMissions = missions.filter(mission => mission.tenantId !== company.tenantId);
                
                if (invalidMissions.length > 0) {
                    console.log(`❌ SECURITY ISSUE: Found ${invalidMissions.length} missions from other companies!`);
                    invalidMissions.forEach(mission => {
                        console.log(`   - Mission ${mission._id} belongs to tenant ${mission.tenantId}`);
                    });
                } else {
                    console.log(`✅ All missions properly filtered for ${company.name}`);
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
                    });
                }
                
                results.push({
                    company: company.name,
                    tenantId: company.tenantId,
                    missionCount: missions.length,
                    properlyFiltered: invalidMissions.length === 0,
                    status: 'success'
                });
                
            } catch (error) {
                console.log(`❌ Error testing ${company.name}:`, error.response?.data?.message || error.message);
                results.push({
                    company: company.name,
                    tenantId: company.tenantId,
                    missionCount: 0,
                    properlyFiltered: false,
                    status: 'error',
                    error: error.message
                });
            }
        }
        
        // Summary report
        console.log('\n📊 COMPANY FILTERING TEST RESULTS');
        console.log('='.repeat(60));
        
        results.forEach(result => {
            const status = result.status === 'success' ? '✅' : '❌';
            const filtering = result.properlyFiltered ? '🔒 SECURE' : '⚠️  LEAK';
            console.log(`${status} ${result.company}`);
            console.log(`   Tenant ID: ${result.tenantId}`);
            console.log(`   Missions: ${result.missionCount}`);
            console.log(`   Filtering: ${filtering}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            console.log('');
        });
        
        // Overall assessment
        const successfulTests = results.filter(r => r.status === 'success').length;
        const secureFiltering = results.filter(r => r.properlyFiltered).length;
        
        console.log('🎯 OVERALL ASSESSMENT:');
        console.log(`   Companies tested: ${results.length}`);
        console.log(`   Successful logins: ${successfulTests}`);
        console.log(`   Secure filtering: ${secureFiltering}/${results.length}`);
        
        if (secureFiltering === results.length) {
            console.log('✅ ALL COMPANIES HAVE PROPER DATA ISOLATION');
        } else {
            console.log('❌ SECURITY ISSUES DETECTED - DATA LEAKAGE BETWEEN COMPANIES');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function main() {
    try {
        await connectToDatabase();
        await createTestMissions();
        await testCompanyFiltering();
    } catch (error) {
        console.error('❌ Script failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

main();