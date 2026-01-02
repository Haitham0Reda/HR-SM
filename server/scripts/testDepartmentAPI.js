import axios from 'axios';
import { readFile } from 'fs/promises';

const testDepartmentAPI = async () => {
    try {
        console.log('🧪 Testing Department API with Multi-Tenant Database...\n');

        // Test login with TechCorp admin
        console.log('🔐 Logging in as TechCorp admin...');
        const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
            email: 'admin@techcorp.com',
            password: 'admin123'
        });

        if (loginResponse.data.success) {
            console.log('✅ Login successful');
            console.log(`   User: ${loginResponse.data.user.username}`);
            console.log(`   Role: ${loginResponse.data.user.role}`);
            console.log(`   Tenant: ${loginResponse.data.user.tenantId}`);

            const token = loginResponse.data.token;

            // Test department API
            console.log('\n📂 Fetching departments...');
            const departmentResponse = await axios.get('http://localhost:5000/api/v1/departments', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (departmentResponse.data.success) {
                console.log('✅ Departments fetched successfully');
                console.log(`   Found ${departmentResponse.data.data.length} departments:`);
                
                departmentResponse.data.data.forEach((dept, index) => {
                    console.log(`   ${index + 1}. ${dept.name} (ID: ${dept._id})`);
                    console.log(`      Tenant: ${dept.tenantId}`);
                    console.log(`      Manager: ${dept.manager ? dept.manager.username : 'None'}`);
                });
            } else {
                console.log('❌ Failed to fetch departments');
                console.log('   Error:', departmentResponse.data.message);
            }

        } else {
            console.log('❌ Login failed');
            console.log('   Error:', loginResponse.data.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        if (error.code) {
            console.error('   Code:', error.code);
        }
    }
};

testDepartmentAPI();