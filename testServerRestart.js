/**
 * Test if Server Has Updated Code
 * 
 * This script tests if the server has picked up the updated uploadProfilePicture function
 * by checking for the new debug logging
 */

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const API_URL = `${SERVER_URL}/api/v1`;

async function testServerRestart() {
    console.log('🔄 Testing if server has updated code...\n');
    
    try {
        // Get auth token
        const response = await fetch(`${API_URL}/dev/auto-login`);
        const data = await response.json();
        const authToken = data.data.token;
        
        // Get user profile
        const profileResponse = await fetch(`${API_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const userProfile = await profileResponse.json();
        const userId = userProfile._id;
        
        console.log(`👤 Testing with user ID: ${userId}`);
        console.log(`🏢 User tenant ID: ${userProfile.tenantId}`);
        
        // Test the upload endpoint - this should trigger the new debug logging
        console.log('\n📡 Making request to profile picture upload endpoint...');
        console.log('   (Check server console for new debug messages)');
        
        const uploadResponse = await fetch(`${API_URL}/users/${userId}/profile-picture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
            // No body - should get "No file uploaded" error
        });
        
        const responseText = await uploadResponse.text();
        console.log(`📊 Response: ${uploadResponse.status} - ${responseText}`);
        
        if (uploadResponse.status === 400 && responseText.includes('No file uploaded')) {
            console.log('\n✅ Server has updated code!');
            console.log('   The endpoint is working but needs a file upload');
            console.log('   Check server console for debug message:');
            console.log('   "🔍 Updating user profile picture with query: ..."');
            return true;
        } else if (uploadResponse.status === 404) {
            console.log('\n❌ Server still has old code or tenant filtering issue');
            console.log('   Expected: 400 "No file uploaded"');
            console.log('   Got: 404 "User not found"');
            return false;
        } else {
            console.log('\n⚠️  Unexpected response');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

testServerRestart().then(success => {
    if (success) {
        console.log('\n🎉 Server is updated! The issue is likely tenant context.');
        console.log('💡 Next step: Check tenant middleware configuration');
    } else {
        console.log('\n🔄 Server needs restart or code not deployed');
        console.log('💡 Try: npm run server (restart the server)');
    }
    process.exit(success ? 0 : 1);
});