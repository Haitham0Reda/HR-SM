/**
 * Test script to verify departments API is working for TechCorp Solutions
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TENANT_ID = 'techcorp-solutions-d8f0689c';

async function testDepartmentsAPI() {
    try {
        console.log('Testing Departments API for TechCorp Solutions...\n');
        
        // 1. Login to get token
        console.log('1. Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@techcorp.com',
                password: 'admin123',
                tenantId: TENANT_ID
            })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            throw new Error('Login failed: ' + loginData.message);
        }
        
        const token = loginData.token;
        console.log('✓ Login successful');
        
        // 2. Test departments API
        console.log('\n2. Testing departments API...');
        const departmentsResponse = await fetch(`${BASE_URL}/api/v1/departments`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const departmentsData = await departmentsResponse.json();
        console.log('Departments API status:', departmentsResponse.status);
        
        if (departmentsData.success) {
            console.log(`✓ Found ${departmentsData.data.length} departments:`);
            departmentsData.data.forEach((dept, index) => {
                console.log(`   ${index + 1}. ${dept.name} (ID: ${dept._id})`);
            });
        } else {
            console.log('❌ Departments API error:', departmentsData.message);
        }
        
        // 3. Test positions API (related data)
        console.log('\n3. Testing positions API...');
        const positionsResponse = await fetch(`${BASE_URL}/api/v1/positions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const positionsData = await positionsResponse.json();
        console.log('Positions API status:', positionsResponse.status);
        
        if (positionsData.success) {
            console.log(`✓ Found ${positionsData.data.length} positions:`);
            positionsData.data.forEach((pos, index) => {
                console.log(`   ${index + 1}. ${pos.title}`);
            });
        } else {
            console.log('❌ Positions API error:', positionsData.message);
        }
        
        console.log('\n🎉 API tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testDepartmentsAPI();