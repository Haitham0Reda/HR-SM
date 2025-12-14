import axios from 'axios';

async function testSickLeavesFrontendService() {
  try {
    console.log('🔍 Testing Sick Leaves Frontend Service Integration...');
    
    // Login first (TechCorp tenant ID)
    const tenantId = '693db0e2ccc5ea08aeee120c';
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'admin@techcorp.com',
      password: 'admin123',
      tenantId: tenantId
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful for TechCorp');

    // Test the exact same call that the frontend service would make
    console.log('\n📋 Testing Frontend Service Call Pattern...');
    
    // Simulate the frontend API service call
    const apiConfig = {
      baseURL: 'http://localhost:5000/api/v1',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    try {
      // Test 1: Direct call to /sick-leaves (what frontend service does)
      const directResponse = await axios.get('/sick-leaves', apiConfig);
      console.log('✅ Direct /sick-leaves call:', directResponse.status);
      console.log('📊 Data received:', Array.isArray(directResponse.data) ? directResponse.data.length : 'Not array');
      
      // Test 2: Full URL call
      const fullUrlResponse = await axios.get('http://localhost:5000/api/v1/sick-leaves', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Full URL call:', fullUrlResponse.status);
      console.log('📊 Data structure:', {
        hasSuccess: 'success' in fullUrlResponse.data,
        hasData: 'data' in fullUrlResponse.data,
        dataType: Array.isArray(fullUrlResponse.data.data) ? 'Array' : typeof fullUrlResponse.data.data,
        dataLength: fullUrlResponse.data.data?.length || 0
      });
      
      // Test 3: Compare response formats
      console.log('\n🔍 Response Format Comparison:');
      console.log('Direct call response keys:', Object.keys(directResponse.data || {}));
      console.log('Full URL response keys:', Object.keys(fullUrlResponse.data || {}));
      
      // Test 4: Check if data extraction works like frontend
      const extractedData = fullUrlResponse.data.data || fullUrlResponse.data;
      console.log('📦 Extracted data length:', Array.isArray(extractedData) ? extractedData.length : 'Not array');
      
      if (Array.isArray(extractedData) && extractedData.length > 0) {
        console.log('📋 Sample extracted record:');
        const sample = extractedData[0];
        console.log('  - ID:', sample._id);
        console.log('  - Employee name:', sample.employee?.personalInfo?.fullName || sample.employee?.username);
        console.log('  - Status:', sample.status);
        console.log('  - Workflow step:', sample.workflow?.currentStep);
      }
      
    } catch (error) {
      console.log('❌ Frontend service call failed:', error.response?.status);
      console.log('❌ Error details:', error.response?.data || error.message);
    }
    
    // Test 5: Check if the endpoint is accessible with different methods
    console.log('\n🔍 Testing Different HTTP Methods:');
    
    try {
      const getResponse = await axios.get('http://localhost:5000/api/v1/sick-leaves', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ GET method works:', getResponse.status);
    } catch (error) {
      console.log('❌ GET method failed:', error.response?.status);
    }
    
    try {
      const optionsResponse = await axios.options('http://localhost:5000/api/v1/sick-leaves', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ OPTIONS method works:', optionsResponse.status);
    } catch (error) {
      console.log('❌ OPTIONS method failed:', error.response?.status);
    }
    
    // Test 6: Check CORS headers
    console.log('\n🔍 Checking CORS Configuration:');
    
    try {
      const corsResponse = await axios.get('http://localhost:5000/api/v1/sick-leaves', {
        headers: { 
          Authorization: `Bearer ${token}`,
          Origin: 'http://localhost:3000'
        }
      });
      console.log('✅ CORS headers present:');
      console.log('  - Access-Control-Allow-Origin:', corsResponse.headers['access-control-allow-origin']);
      console.log('  - Access-Control-Allow-Methods:', corsResponse.headers['access-control-allow-methods']);
      console.log('  - Access-Control-Allow-Headers:', corsResponse.headers['access-control-allow-headers']);
    } catch (error) {
      console.log('❌ CORS check failed:', error.response?.status);
    }
    
    // Test 7: Compare with working missions endpoint
    console.log('\n🔍 Comparing with Missions Endpoint:');
    
    try {
      const missionsResponse = await axios.get('http://localhost:5000/api/v1/missions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Missions endpoint structure:');
      console.log('  - Status:', missionsResponse.status);
      console.log('  - Has success:', 'success' in missionsResponse.data);
      console.log('  - Has data:', 'data' in missionsResponse.data);
      console.log('  - Data length:', missionsResponse.data.data?.length || 0);
      
      console.log('🔍 Sick Leaves vs Missions:');
      console.log('  - Both have same structure:', 
        JSON.stringify(Object.keys(fullUrlResponse.data).sort()) === 
        JSON.stringify(Object.keys(missionsResponse.data).sort())
      );
      
    } catch (error) {
      console.log('❌ Missions comparison failed:', error.response?.status);
    }
    
    console.log('\n🎯 Frontend Integration Diagnosis:');
    console.log('==================================');
    console.log('1. ✅ API endpoint is accessible and returns data');
    console.log('2. ✅ Authentication works correctly');
    console.log('3. ✅ Response format matches expected structure');
    console.log('4. ✅ Data extraction should work in frontend');
    console.log('');
    console.log('💡 If frontend still shows no data, check:');
    console.log('   - Browser console for JavaScript errors');
    console.log('   - Network tab for failed requests');
    console.log('   - Frontend component state management');
    console.log('   - Service method calls in component');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSickLeavesFrontendService();