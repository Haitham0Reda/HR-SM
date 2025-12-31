#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api/v1';

async function testAnalytics() {
    try {
        console.log('🧪 Testing analytics endpoint...\n');

        // Test login
        console.log('1. Testing login...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@techcorp.com',
            password: 'admin123',
            tenantId: 'techcorp_solutions'
        });

        if (!loginResponse.data.success) {
            console.log('❌ Login failed');
            return;
        }

        const token = loginResponse.data.data.token;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('✅ Login successful');

        // Test analytics endpoints
        const analyticsEndpoints = [
            '/analytics',
            '/analytics/dashboard',
            '/analytics/attendance',
            '/analytics/leave',
            '/analytics/employees',
            '/analytics/payroll',
            '/analytics/kpis',
            '/analytics/trends'
        ];

        console.log('\n2. Testing analytics endpoints...');
        for (const endpoint of analyticsEndpoints) {
            try {
                const response = await axios.get(`${API_BASE}${endpoint}`, { headers });
                console.log(`✅ ${endpoint}: ${response.status} - Success`);
            } catch (error) {
                if (error.response) {
                    console.log(`❌ ${endpoint}: ${error.response.status} - ${error.response.data.message || error.response.data.error}`);
                } else {
                    console.log(`❌ ${endpoint}: ${error.message}`);
                }
            }
        }

    } catch (error) {
        if (error.response) {
            console.log(`❌ Test failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            console.log(`❌ Test failed: ${error.message}`);
        }
    }
}

testAnalytics();