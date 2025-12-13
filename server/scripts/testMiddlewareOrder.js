/**
 * Test Middleware Order
 * This script tests if the middleware is working correctly
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TENANT_ID = 'techcorp-solutions-d8f0689c';

// Test credentials
const testCredentials = {
    email: 'admin@techcorp.com',
    password: 'admin123',
    tenantId: TENANT_ID
};

async function testMiddlewareOrder() {
    console.log('🧪 Testing Middleware Order...\n');

    try {
        // Step 1: Login to get token
        console.log('1. Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testCredentials)
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful');
        console.log('Token:', token.substring(0, 50) + '...');

        // Step 2: Make a test request with detailed logging
        console.log('\n2. Making test request to /api/v1/users/profile...');
        const profileResponse = await fetch(`${BASE_URL}/api/v1/users/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Profile Response: ${profileResponse.status} ${profileResponse.statusText}`);
        
        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('Profile data received:', profileData.user ? 'User data present' : 'No user data');
        }

        // Step 3: Wait and check logs
        console.log('\n3. Waiting for logs to be written...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 4: Check if log files exist
        console.log('\n4. Checking log files...');
        
        // Try to read the log file directly
        try {
            const fs = await import('fs');
            const path = await import('path');
            
            const logDir = path.join(process.cwd(), 'logs', 'companies', 'techcorp_solutions');
            const logFile = path.join(logDir, '2025-12-13-application.log');
            
            console.log('Log directory:', logDir);
            console.log('Log file path:', logFile);
            
            if (fs.existsSync(logFile)) {
                const logContent = fs.readFileSync(logFile, 'utf8');
                console.log('✅ Log file exists');
                console.log('Log file size:', logContent.length, 'bytes');
                if (logContent.length > 0) {
                    console.log('📝 Log content preview:');
                    console.log(logContent.substring(0, 500) + (logContent.length > 500 ? '...' : ''));
                } else {
                    console.log('⚠️  Log file is empty');
                }
            } else {
                console.log('❌ Log file does not exist');
                
                // Check if directory exists
                if (fs.existsSync(logDir)) {
                    console.log('✅ Log directory exists');
                    const files = fs.readdirSync(logDir);
                    console.log('Files in log directory:', files);
                } else {
                    console.log('❌ Log directory does not exist');
                }
            }
        } catch (error) {
            console.error('Error checking log files:', error.message);
        }

        console.log('\n🎉 Middleware order test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testMiddlewareOrder();