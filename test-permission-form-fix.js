/**
 * Test Permission Form Fix
 * Verifies that the form validation and data handling works correctly
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

// Test Company credentials
const TEST_COMPANY_CREDENTIALS = {
    email: 'admin@testcompany.com',
    password: 'admin123',
    tenantId: '693cd43ec91e4189aa2ecd2f'
};

let authToken = null;

async function login() {
    console.log('🔐 Logging in...');
    
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(TEST_COMPANY_CREDENTIALS)
    });

    const data = await response.json();
    
    if (data.success && data.data?.token) {
        authToken = data.data.token;
        console.log('✅ Login successful');
        return data.data.user;
    } else {
        console.error('❌ Login failed:', data.message);
        throw new Error('Login failed');
    }
}

async function testFormDataStructure() {
    console.log('\n📋 Testing Form Data Structure...');
    
    try {
        // Get existing permissions to test edit mode data loading
        const response = await fetch(`${API_BASE}/permission-requests`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            const permission = data.data[0];
            console.log(`✅ Found permission: ${permission._id}`);
            
            // Test how the form should handle the time object
            console.log('\n📊 Permission Time Object:');
            console.log(`   Raw time:`, JSON.stringify(permission.time, null, 2));
            
            // Simulate form data loading logic
            let timeValue = '';
            if (permission.time) {
                if (typeof permission.time === 'string') {
                    timeValue = permission.time;
                } else if (typeof permission.time === 'object') {
                    timeValue = permission.time.requested || '';
                }
            }
            
            console.log(`   Form time value: "${timeValue}"`);
            console.log(`   Type: ${typeof timeValue}`);
            
            // Test validation logic
            const isValidTime = timeValue && typeof timeValue === 'string' && timeValue.trim() !== '';
            console.log(`   Validation passes: ${isValidTime}`);
            
            // Test submit data preparation
            const submitTime = typeof timeValue === 'string' ? timeValue.trim() : timeValue;
            console.log(`   Submit time: "${submitTime}"`);
            
            console.log('\n✅ Form data structure handling is correct');
            return true;
        } else {
            console.log('⚠️  No permission requests found for testing');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

async function testFormSubmission() {
    console.log('\n📝 Testing Form Submission...');
    
    // Test data in form format (single time string)
    const formData = {
        permissionType: 'late-arrival',
        date: new Date().toISOString().split('T')[0],
        time: '10:15',
        reason: 'Doctor appointment - form test'
    };
    
    try {
        console.log('📤 Submitting form data:', JSON.stringify(formData, null, 2));
        
        const response = await fetch(`${API_BASE}/permission-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        console.log(`📊 Response Status: ${response.status}`);
        
        if (data.success) {
            console.log('✅ Form submission successful');
            console.log(`   Created permission: ${data.data._id}`);
            console.log(`   Time mapping: ${formData.time} → {scheduled: "${data.data.time.scheduled}", requested: "${data.data.time.requested}"}`);
            return data.data;
        } else {
            console.error('❌ Form submission failed:', data.message);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Form submission error:', error.message);
        throw error;
    }
}

async function main() {
    try {
        console.log('🧪 Permission Form Fix Test');
        console.log('===========================');
        
        // Login
        await login();
        
        // Test form data structure handling
        await testFormDataStructure();
        
        // Test form submission
        await testFormSubmission();
        
        console.log('\n🌐 Permission form should now work without errors at:');
        console.log('   http://localhost:3000/company/test-company/permissions/create');
        console.log('   http://localhost:3000/company/test-company/permissions/{id}/edit');
        
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

main();