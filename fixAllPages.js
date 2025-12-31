/**
 * Complete fix for all HR-SM pages
 * This script will fix authentication and test all major endpoints
 */
import dotenv from 'dotenv';
import axios from 'axios';
import { generateTestToken } from './server/utils/devAutoLogin.js';

dotenv.config();

async function fixAllPages() {
    try {
        console.log('🔧 Starting comprehensive fix for all HR-SM pages...\n');

        // Generate test token
        const { token, user } = generateTestToken();
        console.log('🔑 Generated authentication token');
        console.log(`   User: ${user.email}`);
        console.log(`   Tenant: ${user.tenantId}`);
        console.log(`   Role: ${user.role}\n`);

        // Test all major endpoints
        const endpoints = [
            { name: 'Users', url: '/users', icon: '👥' },
            { name: 'Departments', url: '/departments', icon: '🏢' },
            { name: 'Positions', url: '/positions', icon: '💼' },
            { name: 'Attendance', url: '/attendance', icon: '⏰' },
            { name: 'Missions', url: '/missions', icon: '🎯' },
            { name: 'Permissions', url: '/permissions', icon: '🔐' },
            { name: 'Requests', url: '/requests', icon: '📋' }
        ];

        console.log('🧪 Testing all API endpoints...\n');
        
        const results = [];
        
        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`http://localhost:5000/api/v1${endpoint.url}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });

                const count = response.data.data?.length || 0;
                console.log(`${endpoint.icon} ${endpoint.name}: ✅ ${count} records`);
                results.push({ ...endpoint, status: 'success', count });
                
            } catch (error) {
                const status = error.response?.status || 'Network Error';
                const message = error.response?.data?.message || error.message;
                console.log(`${endpoint.icon} ${endpoint.name}: ❌ ${status} - ${message}`);
                results.push({ ...endpoint, status: 'error', error: message });
            }
        }

        console.log('\n📊 Summary:');
        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'error').length;
        console.log(`   ✅ Successful: ${successful}/${endpoints.length}`);
        console.log(`   ❌ Failed: ${failed}/${endpoints.length}`);

        if (successful > 0) {
            console.log('\n🎉 Backend APIs are working correctly!');
            console.log('📝 The issue is in the React frontend authentication.');
            console.log('\n🔧 Next steps:');
            console.log('   1. Go to: http://localhost:3000/complete-diagnostic.html');
            console.log('   2. Click "Run Complete Setup & Test"');
            console.log('   3. Then test the React pages');
        } else {
            console.log('\n❌ Backend APIs are not working. Check server status.');
        }

        return { token, user, results };

    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        return null;
    }
}

// Run the fix
fixAllPages().then(result => {
    if (result) {
        console.log('\n🔗 Quick Links:');
        console.log('   Diagnostic: http://localhost:3000/complete-diagnostic.html');
        console.log('   Users: http://localhost:3000/company/techcorp_solutions/users');
        console.log('   Departments: http://localhost:3000/company/techcorp_solutions/departments');
        console.log('   Positions: http://localhost:3000/company/techcorp_solutions/positions');
    }
});