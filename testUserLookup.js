/**
 * Test User Lookup
 * 
 * This script tests user lookup directly
 */

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const API_URL = `${SERVER_URL}/api/v1`;

async function testUserLookup() {
    console.log('🔍 Testing User Lookup...\n');
    
    try {
        // Step 1: Get authentication token and user ID
        console.log('1️⃣ Getting authentication token...');
        const response = await fetch(`${API_URL}/dev/auto-login`);
        const data = await response.json();
        
        if (!data.success) {
            console.error('❌ Failed to get token:', data.message);
            return false;
        }
        
        const token = data.data.token;
        const userId = data.data.user.id;
        console.log('✅ Got token and user ID:', userId);
        
        // Step 2: Test getUserById endpoint directly
        console.log('\n2️⃣ Testing getUserById endpoint...');
        const userByIdResponse = await fetch(`${API_URL}/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`getUserById status: ${userByIdResponse.status}`);
        const userByIdText = await userByIdResponse.text();
        console.log(`getUserById response: ${userByIdText}`);
        
        // Step 3: Test all users endpoint
        console.log('\n3️⃣ Testing all users endpoint...');
        const allUsersResponse = await fetch(`${API_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`All users status: ${allUsersResponse.status}`);
        if (allUsersResponse.ok) {
            const allUsersData = await allUsersResponse.json();
            console.log(`Found ${allUsersData.data?.length || 0} users`);
            
            // Check if our user ID is in the list
            const targetUser = allUsersData.data?.find(user => user._id === userId);
            if (targetUser) {
                console.log('✅ Target user found in all users list:', targetUser.email);
            } else {
                console.log('❌ Target user NOT found in all users list');
                console.log('Available user IDs:', allUsersData.data?.map(u => u._id).slice(0, 5));
            }
        } else {
            const errorText = await allUsersResponse.text();
            console.log(`All users error: ${errorText}`);
        }
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        return false;
    }
}

// Run the test
testUserLookup().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
});