/**
 * Test admin user access to all endpoints and actions
 */
import dotenv from 'dotenv';
import axios from 'axios';
import { generateTestToken } from './server/utils/devAutoLogin.js';

dotenv.config();

async function testAdminAccess() {
    try {
        console.log('🔐 Testing Admin User Access...\n');

        // Generate admin token
        const { token, user } = generateTestToken();
        console.log('👤 Testing with user:', user.email);
        console.log('🎭 Role:', user.role);
        console.log('🏢 Tenant:', user.tenantId);
        
        if (user.role !== 'admin') {
            console.log('❌ Test user is not admin! Expected admin role.');
            return;
        }

        console.log('\n🧪 Testing Admin Access to All Endpoints...\n');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // Test all major endpoints that admin should have access to
        const endpoints = [
            // Basic data endpoints
            { name: 'Users', method: 'GET', url: '/users', expectData: true },
            { name: 'Departments', method: 'GET', url: '/departments', expectData: true },
            { name: 'Positions', method: 'GET', url: '/positions', expectData: true },
            
            // HR Operations
            { name: 'Attendance', method: 'GET', url: '/attendance', expectData: false },
            { name: 'Missions', method: 'GET', url: '/missions', expectData: false },
            { name: 'Sick Leaves', method: 'GET', url: '/sick-leaves', expectData: false },
            { name: 'Permissions', method: 'GET', url: '/permissions', expectData: false },
            { name: 'Overtime', method: 'GET', url: '/overtime', expectData: false },
            { name: 'Requests', method: 'GET', url: '/requests', expectData: false },
            { name: 'Vacations', method: 'GET', url: '/vacations', expectData: false },
            
            // Admin-specific endpoints
            { name: 'Roles', method: 'GET', url: '/roles', expectData: false },
            { name: 'System Settings', method: 'GET', url: '/system-settings', expectData: false },
            { name: 'Document Templates', method: 'GET', url: '/document-templates', expectData: false },
            
            // Documents and Reports
            { name: 'Documents', method: 'GET', url: '/documents', expectData: false },
            { name: 'Reports', method: 'GET', url: '/reports', expectData: false },
            
            // Communication
            { name: 'Announcements', method: 'GET', url: '/announcements', expectData: false },
            { name: 'Events', method: 'GET', url: '/events', expectData: false },
            { name: 'Surveys', method: 'GET', url: '/surveys', expectData: false },
            
            // Advanced features
            { name: 'Tasks', method: 'GET', url: '/tasks', expectData: false },
            { name: 'Holidays', method: 'GET', url: '/holidays', expectData: false }
        ];

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (const endpoint of endpoints) {
            try {
                const response = await axios({
                    method: endpoint.method,
                    url: `http://localhost:5000/api/v1${endpoint.url}`,
                    headers,
                    timeout: 5000
                });

                const isSuccess = response.status >= 200 && response.status < 300;
                const dataCount = response.data?.data?.length || response.data?.length || 0;
                
                if (isSuccess) {
                    console.log(`✅ ${endpoint.name}: ${response.status} - ${dataCount} records`);
                    successCount++;
                    results.push({ ...endpoint, status: 'success', code: response.status, count: dataCount });
                } else {
                    console.log(`⚠️ ${endpoint.name}: ${response.status} - Unexpected status`);
                    results.push({ ...endpoint, status: 'warning', code: response.status });
                }

            } catch (error) {
                const status = error.response?.status || 'Network Error';
                const message = error.response?.data?.message || error.message;
                
                if (status === 403) {
                    console.log(`🚫 ${endpoint.name}: 403 FORBIDDEN - Admin access denied!`);
                    errorCount++;
                    results.push({ ...endpoint, status: 'forbidden', code: 403, error: message });
                } else if (status === 401) {
                    console.log(`🔐 ${endpoint.name}: 401 UNAUTHORIZED - Authentication issue`);
                    errorCount++;
                    results.push({ ...endpoint, status: 'unauthorized', code: 401, error: message });
                } else if (status === 404) {
                    console.log(`❓ ${endpoint.name}: 404 NOT FOUND - Endpoint doesn't exist`);
                    results.push({ ...endpoint, status: 'not_found', code: 404, error: message });
                } else {
                    console.log(`❌ ${endpoint.name}: ${status} - ${message}`);
                    errorCount++;
                    results.push({ ...endpoint, status: 'error', code: status, error: message });
                }
            }
        }

        console.log('\n📊 Admin Access Test Summary:');
        console.log(`   ✅ Successful: ${successCount}/${endpoints.length}`);
        console.log(`   ❌ Errors/Forbidden: ${errorCount}/${endpoints.length}`);
        console.log(`   ❓ Not Found: ${results.filter(r => r.status === 'not_found').length}/${endpoints.length}`);

        // Check for access issues
        const forbiddenEndpoints = results.filter(r => r.status === 'forbidden');
        if (forbiddenEndpoints.length > 0) {
            console.log('\n🚫 ADMIN ACCESS ISSUES FOUND:');
            forbiddenEndpoints.forEach(endpoint => {
                console.log(`   - ${endpoint.name}: ${endpoint.error}`);
            });
            console.log('\n💡 These endpoints should be accessible to admin users!');
        }

        // Test specific admin actions
        console.log('\n🔧 Testing Admin-Specific Actions...');
        
        // Test creating a department (admin should be able to do this)
        try {
            const createDeptResponse = await axios.post('http://localhost:5000/api/v1/departments', {
                name: 'Test Department',
                code: 'TEST',
                description: 'Test department for admin access verification',
                isActive: true
            }, { headers });
            
            if (createDeptResponse.status === 201) {
                console.log('✅ Create Department: Admin can create departments');
                
                // Clean up - delete the test department
                const deptId = createDeptResponse.data.data._id;
                await axios.delete(`http://localhost:5000/api/v1/departments/${deptId}`, { headers });
                console.log('🗑️ Test department cleaned up');
            }
        } catch (error) {
            const status = error.response?.status;
            if (status === 403) {
                console.log('🚫 Create Department: FORBIDDEN - Admin should be able to create departments!');
            } else {
                console.log(`❌ Create Department: ${status} - ${error.response?.data?.message || error.message}`);
            }
        }

        if (successCount === endpoints.length) {
            console.log('\n🎉 PERFECT! Admin user has full access to all endpoints.');
        } else if (errorCount === 0) {
            console.log('\n✅ Admin user has good access. Some endpoints may not exist yet.');
        } else {
            console.log('\n⚠️ Admin user has some access restrictions that should be reviewed.');
        }

        return results;

    } catch (error) {
        console.error('❌ Admin access test failed:', error.message);
        return null;
    }
}

testAdminAccess();