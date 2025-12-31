/**
 * Test Profile Picture Upload and Display Flow
 * 
 * This script tests the complete profile picture workflow:
 * 1. Upload a profile picture
 * 2. Verify it's saved to the correct location
 * 3. Check that the user object is updated
 * 4. Test the profile picture URL generation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const API_URL = `${SERVER_URL}/api/v1`;

// Helper function to create a test image
function createTestImage() {
    // Create a simple 1x1 pixel PNG image (base64 encoded)
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(base64Image, 'base64');
    
    const testImagePath = path.join(__dirname, 'test-profile-picture.png');
    fs.writeFileSync(testImagePath, buffer);
    
    return testImagePath;
}

// Helper function to get auth token
async function getAuthToken() {
    try {
        // Try to get token from localStorage simulation or use a test token
        const response = await fetch(`${API_URL}/dev/auto-login`);
        const data = await response.json();
        
        if (data.success) {
            return data.data.token;
        }
        
        // Fallback: try to login with admin credentials
        const loginResponse = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@techcorp.com',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        return loginData.token;
    } catch (error) {
        console.error('Failed to get auth token:', error);
        return null;
    }
}

// Test profile picture upload
async function testProfilePictureUpload() {
    console.log('🧪 Starting Profile Picture Upload Test...\n');
    
    try {
        // Step 1: Get authentication token
        console.log('1️⃣ Getting authentication token...');
        const token = await getAuthToken();
        
        if (!token) {
            console.error('❌ Failed to get authentication token');
            return false;
        }
        console.log('✅ Authentication token obtained');
        
        // Step 2: Get current user profile
        console.log('\n2️⃣ Getting current user profile...');
        const profileResponse = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!profileResponse.ok) {
            console.error('❌ Failed to get user profile:', profileResponse.status);
            return false;
        }
        
        const userProfile = await profileResponse.json();
        console.log('✅ User profile retrieved:', {
            id: userProfile._id,
            email: userProfile.email,
            currentProfilePicture: userProfile.personalInfo?.profilePicture || userProfile.profilePicture
        });
        
        // Step 3: Create test image
        console.log('\n3️⃣ Creating test image...');
        const testImagePath = createTestImage();
        console.log('✅ Test image created:', testImagePath);
        
        // Step 4: Upload profile picture
        console.log('\n4️⃣ Uploading profile picture...');
        const formData = new FormData();
        const imageBuffer = fs.readFileSync(testImagePath);
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        formData.append('profilePicture', blob, 'test-profile.png');
        
        const uploadResponse = await fetch(`${API_URL}/users/${userProfile._id}/profile-picture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('❌ Failed to upload profile picture:', uploadResponse.status, errorText);
            return false;
        }
        
        const uploadResult = await uploadResponse.json();
        console.log('✅ Profile picture uploaded successfully:', {
            profilePicture: uploadResult.profilePicture,
            message: uploadResult.message
        });
        
        // Step 5: Verify file exists on disk
        console.log('\n5️⃣ Verifying file exists on disk...');
        const expectedFilePath = path.join(__dirname, 'uploads', 'profile-pictures');
        const files = fs.readdirSync(expectedFilePath);
        const uploadedFile = files.find(file => file.startsWith('profile-'));
        
        if (uploadedFile) {
            console.log('✅ File exists on disk:', uploadedFile);
            console.log('📁 Full path:', path.join(expectedFilePath, uploadedFile));
        } else {
            console.error('❌ Uploaded file not found on disk');
            console.log('📁 Files in directory:', files);
            return false;
        }
        
        // Step 6: Get updated user profile
        console.log('\n6️⃣ Getting updated user profile...');
        const updatedProfileResponse = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const updatedProfile = await updatedProfileResponse.json();
        console.log('✅ Updated profile retrieved:', {
            profilePicture: updatedProfile.personalInfo?.profilePicture || updatedProfile.profilePicture
        });
        
        // Step 7: Test profile picture URL generation
        console.log('\n7️⃣ Testing profile picture URL generation...');
        const profilePictureUrl = updatedProfile.personalInfo?.profilePicture || updatedProfile.profilePicture;
        
        if (profilePictureUrl) {
            const fullUrl = profilePictureUrl.startsWith('http') 
                ? profilePictureUrl 
                : `${SERVER_URL}${profilePictureUrl}`;
            
            console.log('🌐 Profile picture URL:', fullUrl);
            
            // Test if URL is accessible
            try {
                const imageResponse = await fetch(fullUrl);
                if (imageResponse.ok) {
                    console.log('✅ Profile picture URL is accessible');
                } else {
                    console.error('❌ Profile picture URL not accessible:', imageResponse.status);
                }
            } catch (error) {
                console.error('❌ Error accessing profile picture URL:', error.message);
            }
        } else {
            console.error('❌ No profile picture URL found in updated profile');
            return false;
        }
        
        // Step 8: Clean up test files
        console.log('\n8️⃣ Cleaning up test files...');
        try {
            fs.unlinkSync(testImagePath);
            console.log('✅ Test image file cleaned up');
        } catch (error) {
            console.warn('⚠️ Could not clean up test image:', error.message);
        }
        
        console.log('\n🎉 Profile Picture Upload Test PASSED! ✅');
        return true;
        
    } catch (error) {
        console.error('\n❌ Profile Picture Upload Test FAILED:', error);
        return false;
    }
}

// Run the test
testProfilePictureUpload().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
});