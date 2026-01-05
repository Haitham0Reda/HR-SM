// Quick Mission Diagnostic Script - Node.js Version
// Run this with: node quick-mission-diagnostic.js

console.log('🔍 Starting Quick Mission Diagnostic (Node.js)...');

async function login() {
    console.log('🔐 Logging in to get authentication token...');
    
    try {
        const response = await fetch('http://localhost:5000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@techcorp.com',
                password: 'admin123',
                tenantId: 'techcorp_solutions'
            })
        });
        
        if (!response.ok) {
            console.log(`❌ Login failed: ${response.status}`);
            return null;
        }
        
        const loginData = await response.json();
        const token = loginData.data?.token;
        const user = loginData.data?.user;
        
        if (!token) {
            console.log('❌ No token received from login');
            return null;
        }
        
        console.log('✅ Login successful');
        console.log(`👤 User ID: ${user._id}`);
        console.log(`👤 Email: ${user.email}`);
        console.log(`👤 Role: ${user.role}`);
        
        return { token, user };
        
    } catch (error) {
        console.log(`❌ Login error: ${error.message}`);
        return null;
    }
}

async function checkMissionsAPI(token, currentUser) {
    console.log('📡 Making API call to check missions...');
    
    try {
        const response = await fetch('http://localhost:5000/api/v1/missions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.log(`❌ API call failed: ${response.status}`);
            const errorText = await response.text();
            console.log(`Error details: ${errorText}`);
            return;
        }
        
        const data = await response.json();
        const missions = data.data || [];
        
        console.log(`📊 API Response: ${missions.length} missions found`);
        
        if (missions.length === 0) {
            console.log('❌ No missions in database');
            console.log('💡 This explains why "My Missions" tab shows "No missions found"');
            console.log('💡 Try creating a new mission to test the functionality');
            return;
        }
        
        console.log('🔍 Mission Analysis:');
        missions.forEach((mission, index) => {
            const missionUserId = mission.employee?._id || mission.employee;
            const matches = String(missionUserId) === String(currentUser._id);
            
            console.log(`\nMission ${index + 1}:`);
            console.log(`  - ID: ${mission._id}`);
            console.log(`  - Location: ${mission.location}`);
            console.log(`  - Purpose: ${mission.purpose || 'N/A'}`);
            console.log(`  - Employee field: ${JSON.stringify(mission.employee)}`);
            console.log(`  - Employee ID: ${missionUserId}`);
            console.log(`  - Current user ID: ${currentUser._id}`);
            console.log(`  - Matches current user: ${matches ? '✅ YES' : '❌ NO'}`);
            console.log(`  - Created: ${mission.createdAt || mission.dateCreated || 'Unknown'}`);
        });
        
        const userMissions = missions.filter(mission => {
            const missionUserId = mission.employee?._id || mission.employee;
            return String(missionUserId) === String(currentUser._id);
        });
        
        console.log(`\n📊 SUMMARY:`);
        console.log(`� TotaIl missions: ${missions.length}`);
        console.log(`👤 Your missions: ${userMissions.length}`);
        
        if (userMissions.length === 0 && missions.length > 0) {
            console.log('\n❌ PROBLEM IDENTIFIED:');
            console.log('   Missions exist but none are assigned to your user ID');
            console.log('   This is why "My Missions" tab shows "No missions found"');
            
            // Check for common issues
            const nullEmployees = missions.filter(m => !m.employee);
            if (nullEmployees.length > 0) {
                console.log(`\n⚠️  Found ${nullEmployees.length} missions with no employee assigned`);
            }
            
            const otherUsers = missions.filter(m => m.employee && String(m.employee?._id || m.employee) !== String(currentUser._id));
            if (otherUsers.length > 0) {
                console.log(`\n📋 Found ${otherUsers.length} missions belonging to other users:`);
                otherUsers.forEach((mission, index) => {
                    console.log(`   ${index + 1}. ${mission.location} - Employee: ${mission.employee?._id || mission.employee}`);
                });
            }
            
        } else if (userMissions.length > 0) {
            console.log('\n✅ MISSIONS FOUND FOR YOUR USER:');
            console.log('   The missions should be showing in the HR app');
            console.log('   If they are not showing, there might be a frontend issue');
            
            userMissions.forEach((mission, index) => {
                console.log(`   ${index + 1}. ${mission.location} - ${mission.purpose || 'No purpose'}`);
            });
        }
        
    } catch (error) {
        console.log(`❌ API call error: ${error.message}`);
    }
}

async function main() {
    const auth = await login();
    if (!auth) {
        console.log('❌ Cannot proceed without authentication');
        return;
    }
    
    await checkMissionsAPI(auth.token, auth.user);
    
    console.log('\n💡 Next steps:');
    console.log('1. If no missions found: Create a new mission and test');
    console.log('2. If missions exist but not yours: Check mission creation process');
    console.log('3. If your missions exist: Check frontend console for errors');
    console.log('4. Open debug-new-mission-issue.html for detailed browser-based analysis');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.log('❌ This script requires Node.js 18+ with built-in fetch support');
    console.log('💡 Alternative: Open debug-new-mission-issue.html in your browser instead');
    process.exit(1);
}

main().catch(console.error);