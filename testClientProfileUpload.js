/**
 * Test Client-Side Profile Picture Upload
 * 
 * This script simulates the exact request that the client makes
 * to identify why it's getting a 404 error
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const API_URL = `${SERVER_URL}/api/v1`;

// Helper function to create a test image
function createTestImage() {
    // Create a simple 1x1 pixel PNG image (base64 encoded)
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(base64Image, 'base64');
    
    const testImagePath = path.join(__dirname, 'test-profile-upload.png');
    fs.writeFileSync(testImagePath, buffer);
    
    return testImagePath;
}

async function testClientProfileUpload() {
    console.log('🧪 Testing Client-Side Profile Picture Upload...\n');
    
    try {
        // Step 1: Try to get authentication token
        console.log('1️⃣ Getting authentication token...');
        let authToken = null;
        
        // Try development auto-login first
        try {
            const response = await fetch(`${API_URL}/dev/auto-login`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    authToken = data.data.token;
                    console.log('✅ Got token from dev auto-login');
                }
            }
        } catch (error) {
            console.log('⚠️  Dev auto-login not available');
        }
        
        // If no token from auto-login, try manual login
        if (!authToken) {
            console.log('🔐 Attempting manual login...');
            try {
                const loginResponse = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: 'admin@techcorp.com',
                        password: 'admin123'
                    })
                });
                
                if (loginResponse.ok) {
                    const loginData = await loginResponse.json();
                    authToken = loginData.token;
                    console.log('✅ Got token from manual login');
                } else {
                    const errorText = await loginResponse.text();
                    console.log(`❌ Login failed: ${loginResponse.status} - ${errorText}`);
                }
            } catch (error) {
                console.log(`❌ Login error: ${error.message}`);
            }
        }
        
        if (!authToken) {
            console.log('❌ Could not obtain authentication token');
            console.log('   Please ensure the server is running and credentials are correct');
            return false;
        }
        
        // Step 2: Get user profile to get user ID
        console.log('\n2️⃣ Getting user profile...');
        let userId = null;
        
        try {
            const profileResponse = await fetch(`${API_URL}/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (profileResponse.ok) {
                const userProfile = await profileResponse.json();
                userId = userProfile._id;
                console.log(`✅ Got user profile - ID: ${userId}`);
            } else {
                const errorText = await profileResponse.text();
                console.log(`❌ Profile fetch failed: ${profileResponse.status} - ${errorText}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Profile fetch error: ${error.message}`);
            return false;
        }
        
        // Step 3: Test the exact profile picture upload request
        console.log('\n3️⃣ Testing profile picture upload...');
        
        // Create test image
        const testImagePath = createTestImage();
        const imageBuffer = fs.readFileSync(testImagePath);
        
        // Create FormData exactly like the client does
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        formData.append('profilePicture', blob, 'test-profile.png');
        
        const uploadUrl = `${API_URL}/users/${userId}/profile-picture`;
        console.log(`📡 Uploading to: ${uploadUrl}`);
        
        try {
            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                    // Note: Don't set Content-Type for FormData, let browser set it with boundary
                },
                body: formData
            });
            
            console.log(`📊 Upload response status: ${uploadResponse.status}`);
            
            if (uploadResponse.ok) {
                const result = await uploadResponse.json();
                console.log('✅ Upload successful!');
                console.log(`🖼️  Profile picture URL: ${result.profilePicture}`);
                
                // Test if the uploaded image is accessible
                const imageUrl = `${SERVER_URL}${result.profilePicture}`;
                console.log(`🌐 Testing image accessibility: ${imageUrl}`);
                
                const imageResponse = await fetch(imageUrl);
                if (imageResponse.ok) {
                    console.log('✅ Uploaded image is accessible');
                } else {
                    console.log(`⚠️  Image not accessible: ${imageResponse.status}`);
                }
                
            } else {
                const errorText = await uploadResponse.text();
                console.log(`❌ Upload failed: ${uploadResponse.status}`);
                console.log(`📄 Error response: ${errorText}`);
                
                // Analyze the error
                if (uploadResponse.status === 404) {
                    console.log('\n🔍 404 Error Analysis:');
                    console.log('   - Route not found at the specified path');
                    console.log('   - Check if server is loading user routes correctly');
                    console.log('   - Verify the exact URL being requested');
                    console.log(`   - Expected route: POST /api/v1/users/:id/profile-picture`);
                    console.log(`   - Actual request: POST ${uploadUrl}`);
                } else if (uploadResponse.status === 401) {
                    console.log('\n🔍 401 Error Analysis:');
                    console.log('   - Authentication token invalid or expired');
                    console.log('   - Token might not be properly formatted');
                } else if (uploadResponse.status === 400) {
                    console.log('\n🔍 400 Error Analysis:');
                    console.log('   - Bad request - likely missing file or invalid data');
                    console.log('   - Check FormData structure');
                }
            }
        } catch (error) {
            console.log(`❌ Upload request error: ${error.message}`);
        }
        
        // Step 4: Verify route exists with different methods
        console.log('\n4️⃣ Verifying route existence...');
        
        // Test with GET (should return 405 Method Not Allowed if route exists)
        try {
            const getResponse = await fetch(uploadUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            console.log(`📡 GET ${uploadUrl} - Status: ${getResponse.status}`);
            
            if (getResponse.status === 405) {
                console.log('✅ Route exists (405 = Method Not Allowed for GET)');
            } else if (getResponse.status === 404) {
                console.log('❌ Route does not exist (404)');
            } else {
                console.log(`⚠️  Unexpected status: ${getResponse.status}`);
            }
        } catch (error) {
            console.log(`❌ Route verification error: ${error.message}`);
        }
        
        // Clean up test file
        try {
            fs.unlinkSync(testImagePath);
        } catch (error) {
            // Ignore cleanup errors
        }
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Test execution failed:', error);
        return false;
    }
}

// Run the test
testClientProfileUpload().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
});