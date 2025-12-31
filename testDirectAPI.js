/**
 * Test Direct API Call
 * 
 * This script makes a direct API call to see server response
 */

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const API_URL = `${SERVER_URL}/api/v1`;

async function testDirectAPI() {
    console.log('🔍 Testing Direct API Call...\n');
    
    try {
        // Step 1: Get authentication token
        console.log('1️⃣ Getting authentication token...');
        const response = await fetch(`${API_URL}/dev/auto-login`);
        const data = await response.json();
        
        if (!data.success) {
            console.error('❌ Failed to get token:', data.message);
            return false;
        }
        
        const token = data.data.token;
        console.log('✅ Got token');
        
        // Step 2: Make profile request with detailed error handling
        console.log('\n2️⃣ Making profile request...');
        const profileResponse = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Response status: ${profileResponse.status}`);
        console.log(`Response headers:`, Object.fromEntries(profileResponse.headers.entries()));
        
        const responseText = await profileResponse.text();
        console.log(`Response body: ${responseText}`);
        
        if (profileResponse.ok) {
            const profileData = JSON.parse(responseText);
            console.log('✅ Profile request successful:', profileData);
        } else {
            console.log('❌ Profile request failed');
            try {
                const errorData = JSON.parse(responseText);
                console.log('Error details:', errorData);
            } catch (e) {
                console.log('Raw error response:', responseText);
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        return false;
    }
}

// Run the test
testDirectAPI().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
});