#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api/v1';

async function debugAuth() {
    try {
        console.log('🔍 Debugging authentication details...\n');

        // Test login
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
        const user = loginResponse.data.data.user;
        
        console.log('📋 Login Response User Object:');
        console.log(JSON.stringify(user, null, 2));
        
        console.log('\n🔑 Token (first 50 chars):', token.substring(0, 50) + '...');

        // Test a simple authenticated endpoint to see what req.user contains
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // Try to get current user info
        try {
            const currentUserResponse = await axios.get(`${API_BASE}/auth/me`, { headers });
            console.log('\n👤 Current User Response:');
            console.log(JSON.stringify(currentUserResponse.data, null, 2));
        } catch (error) {
            console.log('\n❌ Current user endpoint failed:', error.response?.status, error.response?.data);
        }

        // Try departments endpoint (should work)
        try {
            const deptResponse = await axios.get(`${API_BASE}/departments`, { headers });
            console.log('\n🏢 Departments endpoint works:', deptResponse.status === 200 ? 'YES' : 'NO');
        } catch (error) {
            console.log('\n❌ Departments endpoint failed:', error.response?.status, error.response?.data);
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.status, error.response.data);
        }
    }
}

debugAuth();