#!/usr/bin/env node

/**
 * Script to test API endpoints with proper authentication
 */

import fetch from 'node-fetch';
import mongoose from 'mongoose';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'http://localhost:5000/api/v1';

async function getAuthToken() {
    try {
        // Connect to database to get a user
        await mongoose.connect(process.env.MONGODB_URI);
        
        const { default: User } = await import('../modules/hr-core/users/models/user.model.js');
        const user = await User.findOne({ role: 'admin' }).select('email tenantId');
        
        if (!user) {
            throw new Error('No admin user found');
        }
        
        console.log(`📧 Using user: ${user.email}`);
        console.log(`🏢 Tenant ID: ${user.tenantId}`);
        
        // Try to login
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: user.email,
                password: 'password123' // Default password
            })
        });
        
        if (loginResponse.status === 200) {
            const loginData = await loginResponse.json();
            return {
                token: loginData.token,
                user: loginData.user,
                tenantId: user.tenantId
            };
        } else {
            console.log(`❌ Login failed: ${loginResponse.status}`);
            return null;
        }
        
    } catch (error) {
        console.log(`❌ Auth error: ${error.message}`);
        return null;
    } finally {
        await mongoose.disconnect();
    }
}

async function testAPIEndpoint(endpoint, token, tenantId) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-tenant-id': tenantId
            }
        });
        
        const data = await response.text();
        let parsedData;
        
        try {
            parsedData = JSON.parse(data);
        } catch {
            parsedData = data;
        }
        
        return {
            status: response.status,
            statusText: response.statusText,
            data: parsedData
        };
        
    } catch (error) {
        return {
            status: 'ERROR',
            statusText: error.message,
            data: null
        };
    }
}

async function testAPIWithAuth() {
    console.log('🧪 Testing API endpoints with authentication...\n');
    
    // Get authentication token
    console.log('🔐 Getting authentication token...');
    const auth = await getAuthToken();
    
    if (!auth) {
        console.log('❌ Could not get authentication token');
        console.log('💡 Make sure there is an admin user with email/password in the database');
        return;
    }
    
    console.log('✅ Authentication successful');
    console.log(`👤 User: ${auth.user.name} (${auth.user.email})`);
    console.log(`🏢 Tenant: ${auth.tenantId}\n`);
    
    // Test endpoints
    const endpoints = [
        '/announcements',
        '/announcements/active',
        '/notifications',
        '/document-templates',
        '/reports',
        '/payroll'
    ];
    
    console.log('📋 Testing API endpoints...\n');
    
    for (const endpoint of endpoints) {
        console.log(`🔍 Testing ${endpoint}`);
        console.log('─'.repeat(40));
        
        const result = await testAPIEndpoint(endpoint, auth.token, auth.tenantId);
        
        console.log(`Status: ${result.status} ${result.statusText}`);
        
        if (result.status === 200) {
            console.log('✅ Success');
            
            if (Array.isArray(result.data)) {
                console.log(`📊 Data: Array with ${result.data.length} items`);
                if (result.data.length > 0) {
                    console.log(`📝 First item keys: ${Object.keys(result.data[0]).join(', ')}`);
                }
            } else if (result.data && typeof result.data === 'object') {
                console.log(`📊 Data: Object with keys: ${Object.keys(result.data).join(', ')}`);
            } else {
                console.log(`📊 Data: ${typeof result.data}`);
            }
        } else {
            console.log('❌ Failed');
            if (result.data && typeof result.data === 'object' && result.data.message) {
                console.log(`💬 Error: ${result.data.message}`);
            }
        }
        
        console.log('');
    }
    
    console.log('📋 SUMMARY');
    console.log('═'.repeat(50));
    console.log('If endpoints return 200 with data:');
    console.log('  ✅ API is working correctly');
    console.log('  🔍 Check frontend authentication and data handling');
    console.log('');
    console.log('If endpoints return errors:');
    console.log('  🔧 Check license validation and module configuration');
    console.log('  🔄 Restart server to clear caches');
}

// Run the test
testAPIWithAuth().catch(console.error);