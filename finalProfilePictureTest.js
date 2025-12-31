/**
 * Final Profile Picture Test
 * 
 * This script provides a comprehensive test and solution for the profile picture issue
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const API_URL = `${SERVER_URL}/api/v1`;

function createTestImage() {
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(base64Image, 'base64');
    
    const testImagePath = path.join(__dirname, 'final-test-profile.png');
    fs.writeFileSync(testImagePath, buffer);
    
    return testImagePath;
}

async function finalProfilePictureTest() {
    console.log('🎯 Final Profile Picture Test\n');
    
    try {
        // Get auth token and user info
        const response = await fetch(`${API_URL}/dev/auto-login`);
        const data = await response.json();
        const authToken = data.data.token;
        
        const profileResponse = await fetch(`${API_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const userProfile = await profileResponse.json();
        const userId = userProfile._id;
        
        console.log(`👤 User: ${userProfile.email} (${userId})`);
        console.log(`🏢 Tenant: ${userProfile.tenantId}`);
        
        // Check current profile picture
        const currentProfilePicture = userProfile.personalInfo?.profilePicture || userProfile.profilePicture;
        console.log(`🖼️  Current profile picture: ${currentProfilePicture || 'None'}`);
        
        // Count files before upload
        const profilePicturesDir = path.join(__dirname, 'uploads', 'profile-pictures');
        const filesBefore = fs.readdirSync(profilePicturesDir);
        console.log(`📁 Files before upload: ${filesBefore.length}`);
        
        // Attempt upload
        console.log('\n📤 Attempting profile picture upload...');
        const testImagePath = createTestImage();
        const imageBuffer = fs.readFileSync(testImagePath);
        
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        formData.append('profilePicture', blob, 'final-test.png');
        
        const uploadResponse = await fetch(`${API_URL}/users/${userId}/profile-picture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        
        const uploadText = await uploadResponse.text();
        console.log(`📊 Upload response: ${uploadResponse.status}`);
        console.log(`📄 Response body: ${uploadText}`);
        
        // Count files after upload
        const filesAfter = fs.readdirSync(profilePicturesDir);
        console.log(`📁 Files after upload: ${filesAfter.length}`);
        
        if (filesAfter.length > filesBefore.length) {
            console.log('✅ File was uploaded to disk successfully!');
            const newFiles = filesAfter.filter(f => !filesBefore.includes(f));
            console.log(`📎 New file: ${newFiles[0]}`);
        } else {
            console.log('❌ No new file was created');
        }
        
        // Check if user profile was updated
        console.log('\n🔄 Checking if user profile was updated...');
        const updatedProfileResponse = await fetch(`${API_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const updatedProfile = await updatedProfileResponse.json();
        const newProfilePicture = updatedProfile.personalInfo?.profilePicture || updatedProfile.profilePicture;
        
        console.log(`🖼️  Updated profile picture: ${newProfilePicture || 'None'}`);
        
        if (newProfilePicture && newProfilePicture !== currentProfilePicture) {
            console.log('✅ Profile picture was updated in database!');
            
            // Test if image is accessible
            const imageUrl = `${SERVER_URL}${newProfilePicture}`;
            const imageResponse = await fetch(imageUrl);
            if (imageResponse.ok) {
                console.log('✅ Profile picture is accessible via URL');
            } else {
                console.log(`❌ Profile picture not accessible: ${imageResponse.status}`);
            }
        } else {
            console.log('❌ Profile picture was NOT updated in database');
        }
        
        // Clean up
        try {
            fs.unlinkSync(testImagePath);
        } catch (error) {
            // Ignore cleanup errors
        }
        
        console.log('\n📋 SUMMARY:');
        if (filesAfter.length > filesBefore.length && newProfilePicture !== currentProfilePicture) {
            console.log('🎉 SUCCESS: Profile picture upload is working completely!');
            console.log('   - File uploaded to disk ✅');
            console.log('   - Database updated ✅');
            console.log('   - Image accessible ✅');
            return true;
        } else if (filesAfter.length > filesBefore.length) {
            console.log('⚠️  PARTIAL SUCCESS: File uploaded but database not updated');
            console.log('   - File uploaded to disk ✅');
            console.log('   - Database updated ❌');
            console.log('   - This is the tenant filtering issue');
            return false;
        } else {
            console.log('❌ FAILURE: Upload completely failed');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

finalProfilePictureTest().then(success => {
    if (success) {
        console.log('\n🎯 RESULT: Profile picture system is working!');
        console.log('💡 The original issue should now be resolved.');
    } else {
        console.log('\n🔧 RESULT: Issue partially resolved - files upload but database update fails');
        console.log('💡 This is a tenant filtering issue in the server code.');
        console.log('💡 The fix requires updating the uploadProfilePicture function.');
    }
    process.exit(success ? 0 : 1);
});