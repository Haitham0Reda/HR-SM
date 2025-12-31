#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api/v1';

async function testAuth() {
    try {
        console.log('🧪 Testing authentication and license validation...\n');

        // Test login with TechCorp Solutions credentials
        console.log('1. Testing login...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@techcorp.com',
            password: 'admin123',
            tenantId: 'techcorp_solutions'
        });

        if (loginResponse.data.success) {
            console.log('✅ Login successful');
            console.log(`   User: ${loginResponse.data.data.user.firstName} ${loginResponse.data.data.user.lastName}`);
            console.log(`   Role: ${loginResponse.data.data.user.role}`);
            console.log(`   Tenant: ${loginResponse.data.data.user.tenantId}`);
            
            const token = loginResponse.data.data.token;
            console.log(`   Token: ${token.substring(0, 20)}...`);

            // Test authenticated request
            console.log('\n2. Testing authenticated request...');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // Test attendance endpoint (requires license)
            try {
                const attendanceResponse = await axios.get(`${API_BASE}/attendance/today`, { headers });
                console.log('✅ Attendance endpoint accessible');
                console.log(`   Response: ${JSON.stringify(attendanceResponse.data).substring(0, 100)}...`);
            } catch (error) {
                if (error.response) {
                    console.log(`❌ Attendance endpoint failed: ${error.response.status} - ${error.response.data.message || error.response.data.error}`);
                } else {
                    console.log(`❌ Attendance endpoint failed: ${error.message}`);
                }
            }

            // Test license endpoint
            console.log('\n3. Testing license endpoint...');
            try {
                const licenseResponse = await axios.get(`${API_BASE}/licenses/techcorp_solutions`, { headers });
                console.log('✅ License endpoint accessible');
                console.log(`   Response: ${JSON.stringify(licenseResponse.data).substring(0, 100)}...`);
            } catch (error) {
                if (error.response) {
                    console.log(`❌ License endpoint failed: ${error.response.status} - ${error.response.data.message || error.response.data.error}`);
                } else {
                    console.log(`❌ License endpoint failed: ${error.message}`);
                }
            }

            // Test notifications endpoint
            console.log('\n4. Testing notifications endpoint...');
            try {
                const notificationsResponse = await axios.get(`${API_BASE}/notifications`, { headers });
                console.log('✅ Notifications endpoint accessible');
                console.log(`   Response: ${JSON.stringify(notificationsResponse.data).substring(0, 100)}...`);
            } catch (error) {
                if (error.response) {
                    console.log(`❌ Notifications endpoint failed: ${error.response.status} - ${error.response.data.message || error.response.data.error}`);
                } else {
                    console.log(`❌ Notifications endpoint failed: ${error.message}`);
                }
            }

        } else {
            console.log('❌ Login failed');
            console.log(`   Response: ${JSON.stringify(loginResponse.data)}`);
        }

    } catch (error) {
        if (error.response) {
            console.log(`❌ Test failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            console.log(`❌ Test failed: ${error.message}`);
        }
    }
}

testAuth();