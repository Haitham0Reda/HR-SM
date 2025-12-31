/**
 * Test User Routes Accessibility
 * 
 * This script tests if the user routes are properly loaded and accessible
 */

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const API_URL = `${SERVER_URL}/api/v1`;

async function testUserRoutes() {
    console.log('🧪 Testing User Routes Accessibility...\n');
    
    try {
        // Test 1: Check if server is running
        console.log('1️⃣ Testing server connectivity...');
        try {
            const response = await fetch(SERVER_URL);
            console.log(`✅ Server is running (Status: ${response.status})`);
        } catch (error) {
            console.error('❌ Server is not running or not accessible');
            console.error('   Make sure to start the server with: npm run server');
            return false;
        }
        
        // Test 2: Check if user routes are loaded
        console.log('\n2️⃣ Testing user routes endpoint...');
        try {
            const response = await fetch(`${API_URL}/users`);
            console.log(`📡 GET /api/v1/users - Status: ${response.status}`);
            
            if (response.status === 401) {
                console.log('✅ User routes are loaded (401 = authentication required)');
            } else if (response.status === 200) {
                console.log('✅ User routes are loaded and accessible');
            } else {
                console.log(`⚠️  Unexpected status: ${response.status}`);
                const text = await response.text();
                console.log('Response:', text);
            }
        } catch (error) {
            console.error('❌ User routes not accessible:', error.message);
            return false;
        }
        
        // Test 3: Check profile picture upload route specifically
        console.log('\n3️⃣ Testing profile picture upload route...');
        try {
            const testUserId = '693c9ac2c99e484cf80f9338'; // The user ID from the error
            const response = await fetch(`${API_URL}/users/${testUserId}/profile-picture`, {
                method: 'POST'
            });
            console.log(`📡 POST /api/v1/users/${testUserId}/profile-picture - Status: ${response.status}`);
            
            if (response.status === 401) {
                console.log('✅ Profile picture route exists (401 = authentication required)');
            } else if (response.status === 400) {
                console.log('✅ Profile picture route exists (400 = bad request, likely missing file)');
            } else if (response.status === 404) {
                console.error('❌ Profile picture route not found (404)');
                const text = await response.text();
                console.log('Response:', text);
                return false;
            } else {
                console.log(`⚠️  Unexpected status: ${response.status}`);
                const text = await response.text();
                console.log('Response:', text);
            }
        } catch (error) {
            console.error('❌ Profile picture route test failed:', error.message);
            return false;
        }
        
        // Test 4: Check auth routes (should be working)
        console.log('\n4️⃣ Testing auth routes...');
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({}) // Empty body to test route existence
            });
            console.log(`📡 POST /api/v1/auth/login - Status: ${response.status}`);
            
            if (response.status === 400) {
                console.log('✅ Auth routes are loaded (400 = bad request, missing credentials)');
            } else {
                console.log(`⚠️  Unexpected auth status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Auth routes test failed:', error.message);
        }
        
        // Test 5: List all available routes (if possible)
        console.log('\n5️⃣ Testing route discovery...');
        const testRoutes = [
            '/api/v1/users',
            '/api/v1/auth',
            '/api/v1/departments',
            '/api/v1/positions',
            '/api/v1/dashboard'
        ];
        
        for (const route of testRoutes) {
            try {
                const response = await fetch(`${SERVER_URL}${route}`);
                const status = response.status;
                const statusText = status === 404 ? '❌ Not Found' : 
                                 status === 401 ? '✅ Auth Required' :
                                 status === 200 ? '✅ Accessible' :
                                 `⚠️  Status ${status}`;
                console.log(`   ${route} - ${statusText}`);
            } catch (error) {
                console.log(`   ${route} - ❌ Error: ${error.message}`);
            }
        }
        
        console.log('\n📋 DIAGNOSIS:');
        console.log('If profile picture route shows 404, the issue is likely:');
        console.log('1. Server not loading user routes properly');
        console.log('2. Route path mismatch in module registry');
        console.log('3. Module system not initializing correctly');
        console.log('\n🔧 SOLUTIONS:');
        console.log('1. Restart the server: npm run server');
        console.log('2. Check server logs for route loading messages');
        console.log('3. Verify module registry configuration');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Test execution failed:', error);
        return false;
    }
}

// Run the test
testUserRoutes().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
});