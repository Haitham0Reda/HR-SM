/**
 * Test script to verify the fixes for:
 * 1. Tenant config 404 error
 * 2. Departments filter error
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';

const testFixes = async () => {
    console.log('🧪 Testing fixes...\n');

    // Test 1: Tenant config endpoint (should return 401/403, not 404)
    console.log('1. Testing tenant config endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/tenant/config`);
        console.log('   ✓ Tenant config endpoint is working');
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('   ✓ Tenant config endpoint exists (requires auth)');
        } else if (error.response?.status === 404) {
            console.log('   ✗ Tenant config endpoint still returns 404');
        } else {
            console.log(`   ? Tenant config endpoint returned: ${error.response?.status}`);
        }
    }

    // Test 2: Departments endpoint (should return 401/403, not 404)
    console.log('\n2. Testing departments endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/departments`);
        console.log('   ✓ Departments endpoint is working');
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('   ✓ Departments endpoint exists (requires auth)');
        } else if (error.response?.status === 404) {
            console.log('   ✗ Departments endpoint still returns 404');
        } else {
            console.log(`   ? Departments endpoint returned: ${error.response?.status}`);
        }
    }

    // Test 3: Positions endpoint (should return 401/403, not 404)
    console.log('\n3. Testing positions endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/positions`);
        console.log('   ✓ Positions endpoint is working');
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('   ✓ Positions endpoint exists (requires auth)');
        } else if (error.response?.status === 404) {
            console.log('   ✗ Positions endpoint still returns 404');
        } else {
            console.log(`   ? Positions endpoint returned: ${error.response?.status}`);
        }
    }

    // Test 4: Vacations endpoint (should return 401/403, not 404)
    console.log('\n4. Testing vacations endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/vacations`);
        console.log('   ✓ Vacations endpoint is working');
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('   ✓ Vacations endpoint exists (requires auth)');
        } else if (error.response?.status === 404) {
            console.log('   ✗ Vacations endpoint still returns 404');
        } else {
            console.log(`   ? Vacations endpoint returned: ${error.response?.status}`);
        }
    }

    // Test 5: Missions endpoint (should return 401/403, not 400 TENANT_ID_REQUIRED)
    console.log('\n5. Testing missions endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/missions`);
        console.log('   ✓ Missions endpoint is working');
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('   ✓ Missions endpoint exists (requires auth)');
        } else if (error.response?.status === 400) {
            console.log('   ✗ Missions endpoint still returns 400 (TENANT_ID_REQUIRED)');
        } else if (error.response?.status === 404) {
            console.log('   ✗ Missions endpoint returns 404');
        } else {
            console.log(`   ? Missions endpoint returned: ${error.response?.status}`);
        }
    }

    // Test 6: Sick Leaves endpoint (should return 401/403, not 404)
    console.log('\n6. Testing sick-leaves endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/sick-leaves`);
        console.log('   ✓ Sick Leaves endpoint is working');
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('   ✓ Sick Leaves endpoint exists (requires auth)');
        } else if (error.response?.status === 404) {
            console.log('   ✗ Sick Leaves endpoint still returns 404');
        } else {
            console.log(`   ? Sick Leaves endpoint returned: ${error.response?.status}`);
        }
    }

    // Test 7: Forget Checks endpoint (should return 401/403, not 404)
    console.log('\n7. Testing forget-checks endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/forget-checks`);
        console.log('   ✓ Forget Checks endpoint is working');
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('   ✓ Forget Checks endpoint exists (requires auth)');
        } else if (error.response?.status === 404) {
            console.log('   ✗ Forget Checks endpoint still returns 404');
        } else {
            console.log(`   ? Forget Checks endpoint returned: ${error.response?.status}`);
        }
    }

    // Test 8: Resigned Employees endpoint (should return 401/403, not 404)
    console.log('\n8. Testing resigned-employees endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/resigned-employees`);
        console.log('   ✓ Resigned Employees endpoint is working');
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('   ✓ Resigned Employees endpoint exists (requires auth)');
        } else if (error.response?.status === 404) {
            console.log('   ✗ Resigned Employees endpoint still returns 404');
        } else {
            console.log(`   ? Resigned Employees endpoint returned: ${error.response?.status}`);
        }
    }

    console.log('\n✅ Test completed!');
    console.log('\nNote: All endpoints should require authentication (401/403), not return 404 or 400.');
    console.log('The React app should handle the response format correctly and not have .map/.filter errors.');
};

testFixes().catch(console.error);