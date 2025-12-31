/**
 * Test Multer Middleware
 * 
 * This script tests if the multer middleware is working properly
 * by sending different types of requests
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
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(base64Image, 'base64');
    
    const testImagePath = path.join(__dirname, 'test-multer.png');
    fs.writeFileSync(testImagePath, buffer);
    
    return testImagePath;
}

async function testMulterMiddleware() {
    console.log('🧪 Testing Multer Middleware...\n');
    
    try {
        // Get auth token and user ID
        const response = await fetch(`${API_URL}/dev/auto-login`);
        const data = await response.json();
        const authToken = data.data.token;
        
        const profileResponse = await fetch(`${API_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const userProfile = await profileResponse.json();
        const userId = userProfile._id;
        
        console.log(`👤 Testing with user: ${userProfile.email} (${userId})`);
        
        // Test 1: Request without file (should reach controller)
        console.log('\n1️⃣ Testing request without file...');
        const noFileResponse = await fetch(`${API_URL}/users/${userId}/profile-picture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log(`📊 No file: ${noFileResponse.status} - ${await noFileResponse.text()}`);
        
        // Test 2: Request with wrong field name (should fail at multer level)
        console.log('\n2️⃣ Testing request with wrong field name...');
        const formData1 = new FormData();
        const testImagePath = createTestImage();
        const imageBuffer = fs.readFileSync(testImagePath);
        const blob1 = new Blob([imageBuffer], { type: 'image/png' });
        formData1.append('wrongFieldName', blob1, 'test.png'); // Wrong field name
        
        const wrongFieldResponse = await fetch(`${API_URL}/users/${userId}/profile-picture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData1
        });
        
        console.log(`📊 Wrong field: ${wrongFieldResponse.status} - ${await wrongFieldResponse.text()}`);
        
        // Test 3: Request with correct field name
        console.log('\n3️⃣ Testing request with correct field name...');
        const formData2 = new FormData();
        const blob2 = new Blob([imageBuffer], { type: 'image/png' });
        formData2.append('profilePicture', blob2, 'test.png'); // Correct field name
        
        const correctFieldResponse = await fetch(`${API_URL}/users/${userId}/profile-picture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData2
        });
        
        const correctFieldText = await correctFieldResponse.text();
        console.log(`📊 Correct field: ${correctFieldResponse.status} - ${correctFieldText}`);
        
        // Test 4: Request with invalid file type
        console.log('\n4️⃣ Testing request with invalid file type...');
        const formData3 = new FormData();
        const textBlob = new Blob(['test content'], { type: 'text/plain' });
        formData3.append('profilePicture', textBlob, 'test.txt'); // Invalid file type
        
        const invalidTypeResponse = await fetch(`${API_URL}/users/${userId}/profile-picture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData3
        });
        
        console.log(`📊 Invalid type: ${invalidTypeResponse.status} - ${await invalidTypeResponse.text()}`);
        
        // Test 5: Check if uploaded file exists (if upload was successful)
        if (correctFieldResponse.ok) {
            console.log('\n5️⃣ Checking uploaded file...');
            try {
                const result = JSON.parse(correctFieldText);
                const profilePictureUrl = result.profilePicture;
                console.log(`🖼️  Profile picture URL: ${profilePictureUrl}`);
                
                // Check if file exists on disk
                const expectedPath = path.join(__dirname, 'uploads', 'profile-pictures');
                const files = fs.readdirSync(expectedPath);
                const uploadedFile = files.find(file => file.startsWith('profile-'));
                
                if (uploadedFile) {
                    console.log(`✅ File exists on disk: ${uploadedFile}`);
                } else {
                    console.log('❌ File not found on disk');
                }
                
                // Test if URL is accessible
                const imageUrl = `${SERVER_URL}${profilePictureUrl}`;
                const imageResponse = await fetch(imageUrl);
                if (imageResponse.ok) {
                    console.log('✅ Image URL is accessible');
                } else {
                    console.log(`❌ Image URL not accessible: ${imageResponse.status}`);
                }
                
            } catch (error) {
                console.log('❌ Could not parse upload response');
            }
        }
        
        // Clean up test file
        try {
            fs.unlinkSync(testImagePath);
        } catch (error) {
            // Ignore cleanup errors
        }
        
        console.log('\n📋 ANALYSIS:');
        console.log('Expected results:');
        console.log('1. No file: 400 "No file uploaded"');
        console.log('2. Wrong field: 400 "No file uploaded" (multer ignores wrong field)');
        console.log('3. Correct field: 200 with success message');
        console.log('4. Invalid type: 400 with multer error');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

testMulterMiddleware().then(success => {
    process.exit(success ? 0 : 1);
});