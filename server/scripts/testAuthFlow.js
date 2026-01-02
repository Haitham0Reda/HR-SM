/**
 * Test Authentication Flow
 * 
 * Tests the complete authentication flow to identify issues
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1';

const testAuthFlow = async () => {
    try {
        console.log('🔐 Testing Authentication Flow...\n');

        // Test 1: Login with TechCorp Solutions credentials
        console.log('1️⃣ Testing login with auth controller...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@techcorpsolutions.com',
            password: 'Admin@123',
            tenantId: 'techcorp_solutions'
        });

        console.log('✅ Login successful!');
        console.log('Response structure:', {
            success: loginResponse.data.success,
            hasUser: !!loginResponse.data.data?.user,
            hasToken: !!loginResponse.data.data?.token,
            userEmail: loginResponse.data.data?.user?.email,
            userTenantId: loginResponse.data.data?.user?.tenantId
        });

        const token = loginResponse.data.data.token;
        const user = loginResponse.data.data.user;

        // Test 2: Use token to access protected endpoint
        console.log('\n2️⃣ Testing protected endpoint access...');
        const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Protected endpoint access successful!');
        console.log('User profile:', {
            success: meResponse.data.success,
            userEmail: meResponse.data.data?.email,
            userRole: meResponse.data.data?.role
        });

        // Test 3: Test forget-checks endpoint
        console.log('\n3️⃣ Testing forget-checks endpoint...');
        const forgetChecksResponse = await axios.get(`${API_BASE_URL}/forget-checks`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Forget checks endpoint access successful!');
        console.log('Forget checks count:', forgetChecksResponse.data?.length || 0);

        // Test 4: Test other endpoints that were failing
        console.log('\n4️⃣ Testing other endpoints...');
        
        const endpoints = [
            '/licenses/techcorp_solutions',
            '/modules/availability',
            '/notifications'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log(`✅ ${endpoint}: Status ${response.status}`);
            } catch (error) {
                console.log(`❌ ${endpoint}: Status ${error.response?.status} - ${error.response?.data?.message || error.message}`);
            }
        }

        console.log('\n🎉 Authentication flow test completed!');

    } catch (error) {
        console.error('❌ Authentication flow test failed:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data
        });
    }
};

testAuthFlow();