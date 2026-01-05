/**
 * Quick User ID Check
 * Run this in the browser console on the missions page to check user ID matching
 */

// Get current user from localStorage or Redux store
const getCurrentUser = () => {
    // Try localStorage first
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            return JSON.parse(storedUser);
        } catch (e) {
            console.log('Could not parse stored user');
        }
    }
    
    // Try Redux store if available
    if (window.store) {
        const state = window.store.getState();
        return state.auth?.user;
    }
    
    return null;
};

// Test API and check user ID matching
const testUserIdMatching = async () => {
    console.log('🔍 Testing User ID Matching...\n');
    
    // Get current user
    const currentUser = getCurrentUser();
    console.log('👤 Current User:', currentUser);
    
    if (!currentUser) {
        console.log('❌ No current user found');
        return;
    }
    
    console.log('👤 Current User ID:', currentUser._id);
    console.log('👤 Current User ID Type:', typeof currentUser._id);
    
    // Get token
    const token = localStorage.getItem('tenant_token') || localStorage.getItem('token');
    if (!token) {
        console.log('❌ No token found');
        return;
    }
    
    // Test API
    try {
        const response = await fetch('http://localhost:5000/api/v1/missions', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('📡 API Response:', data);
        
        if (!data.success) {
            console.log('❌ API call failed:', data.message);
            return;
        }
        
        const missions = data.data;
        console.log(`📊 Total missions: ${missions.length}`);
        
        if (missions.length === 0) {
            console.log('⚠️ No missions returned from API');
            return;
        }
        
        // Check each mission
        console.log('\n🔍 Checking each mission:');
        missions.forEach((mission, i) => {
            const missionUserId = mission.employee?._id || mission.employee;
            const matches = missionUserId === currentUser._id || String(missionUserId) === String(currentUser._id);
            
            console.log(`\nMission ${i + 1}:`);
            console.log(`  ID: ${mission._id}`);
            console.log(`  Location: ${mission.location}`);
            console.log(`  Employee Field: ${JSON.stringify(mission.employee)}`);
            console.log(`  Employee ID: ${missionUserId} (${typeof missionUserId})`);
            console.log(`  Current User ID: ${currentUser._id} (${typeof currentUser._id})`);
            console.log(`  Strict Match: ${missionUserId === currentUser._id}`);
            console.log(`  String Match: ${String(missionUserId) === String(currentUser._id)}`);
            console.log(`  Will Show: ${matches ? '✅ YES' : '❌ NO'}`);
        });
        
        // Summary
        const matchingMissions = missions.filter(mission => {
            const missionUserId = mission.employee?._id || mission.employee;
            return missionUserId === currentUser._id || String(missionUserId) === String(currentUser._id);
        });
        
        console.log(`\n📊 Summary:`);
        console.log(`  Total missions: ${missions.length}`);
        console.log(`  Matching missions: ${matchingMissions.length}`);
        
        if (matchingMissions.length === 0) {
            console.log('\n❌ NO MISSIONS MATCH CURRENT USER');
            console.log('💡 This explains why no data shows on the page');
            
            // Suggest fixes
            console.log('\n🔧 Possible fixes:');
            console.log('1. Check if missions were created with correct employee ID');
            console.log('2. Verify user is logged in with correct account');
            console.log('3. Check if employee reference in mission is populated correctly');
        } else {
            console.log('\n✅ MISSIONS SHOULD BE VISIBLE');
            console.log('💡 If missions are not showing, the issue is in the frontend rendering');
        }
        
    } catch (error) {
        console.log('❌ API Error:', error);
    }
};

// Run the test
testUserIdMatching();