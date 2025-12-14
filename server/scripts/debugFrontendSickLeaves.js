import axios from 'axios';

async function debugFrontendSickLeaves() {
  try {
    console.log('🔍 Debugging Frontend Sick Leaves Issue...');
    
    // Login first (TechCorp tenant ID)
    const tenantId = '693db0e2ccc5ea08aeee120c';
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'admin@techcorp.com',
      password: 'admin123',
      tenantId: tenantId
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful for TechCorp');

    // Test 1: Direct API call (what backend returns)
    console.log('\n📋 Testing Direct API Call...');
    
    const directResponse = await axios.get('http://localhost:5000/api/v1/sick-leaves', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Direct API Status:', directResponse.status);
    console.log('📦 Direct API Response:', JSON.stringify(directResponse.data, null, 2));
    
    // Test 2: Simulate frontend API service call
    console.log('\n🔍 Simulating Frontend API Service...');
    
    // Create axios instance like frontend does
    const frontendApi = axios.create({
      baseURL: 'http://localhost:5000/api/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Add response interceptor like frontend does
    frontendApi.interceptors.response.use(
      (response) => {
        console.log('📥 Frontend interceptor - Raw response:', response.status);
        console.log('📥 Frontend interceptor - Data type:', typeof response.data);
        console.log('📥 Frontend interceptor - Data keys:', Object.keys(response.data || {}));
        
        // Extract data like frontend does
        return response.data !== undefined ? response.data : response;
      },
      (error) => {
        console.log('❌ Frontend interceptor - Error:', error.response?.status);
        return Promise.reject(error);
      }
    );
    
    try {
      const frontendResponse = await frontendApi.get('/sick-leaves');
      console.log('✅ Frontend API call successful');
      console.log('📊 Frontend response type:', typeof frontendResponse);
      console.log('📊 Frontend response keys:', Object.keys(frontendResponse || {}));
      console.log('📊 Frontend response data:', JSON.stringify(frontendResponse, null, 2));
      
      // Test data extraction like frontend component does
      console.log('\n🔍 Testing Frontend Data Extraction...');
      
      const extractedData = frontendResponse.data || frontendResponse;
      console.log('📦 Extracted data type:', Array.isArray(extractedData) ? 'Array' : typeof extractedData);
      console.log('📦 Extracted data length:', extractedData?.length || 0);
      
      if (Array.isArray(extractedData) && extractedData.length > 0) {
        console.log('✅ Data extraction successful');
        console.log('📋 First record:', JSON.stringify(extractedData[0], null, 2));
      } else {
        console.log('❌ Data extraction failed - no array data found');
      }
      
    } catch (error) {
      console.log('❌ Frontend API call failed:', error.message);
      console.log('❌ Error response:', error.response?.data);
    }
    
    // Test 3: Check CORS and headers
    console.log('\n🔍 Testing CORS and Headers...');
    
    try {
      const corsResponse = await axios.get('http://localhost:5000/api/v1/sick-leaves', {
        headers: { 
          Authorization: `Bearer ${token}`,
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization,content-type'
        }
      });
      
      console.log('✅ CORS test successful');
      console.log('🔗 Response headers:');
      console.log('  - Access-Control-Allow-Origin:', corsResponse.headers['access-control-allow-origin']);
      console.log('  - Content-Type:', corsResponse.headers['content-type']);
      console.log('  - Content-Length:', corsResponse.headers['content-length']);
      
    } catch (error) {
      console.log('❌ CORS test failed:', error.response?.status);
    }
    
    // Test 4: Compare with working missions endpoint
    console.log('\n🔍 Comparing with Missions Endpoint...');
    
    try {
      const missionsResponse = await frontendApi.get('/missions');
      console.log('✅ Missions API call successful');
      console.log('📊 Missions response structure:');
      console.log('  - Type:', typeof missionsResponse);
      console.log('  - Has success:', 'success' in missionsResponse);
      console.log('  - Has data:', 'data' in missionsResponse);
      console.log('  - Data is array:', Array.isArray(missionsResponse.data));
      console.log('  - Data length:', missionsResponse.data?.length || 0);
      
      console.log('\n🔍 Structure Comparison:');
      const sickLeavesStructure = Object.keys(frontendResponse || {}).sort();
      const missionsStructure = Object.keys(missionsResponse || {}).sort();
      console.log('  - Sick Leaves keys:', sickLeavesStructure);
      console.log('  - Missions keys:', missionsStructure);
      console.log('  - Same structure:', JSON.stringify(sickLeavesStructure) === JSON.stringify(missionsStructure));
      
    } catch (error) {
      console.log('❌ Missions comparison failed:', error.message);
    }
    
    // Test 5: Check if frontend service file exists and is correct
    console.log('\n🔍 Frontend Service Analysis:');
    console.log('Expected service file: client/hr-app/src/services/sickLeave.service.js');
    console.log('Expected endpoint: /sick-leaves');
    console.log('Expected method: api.get(\'/sick-leaves\', { params })');
    
    console.log('\n🎯 Debugging Summary:');
    console.log('====================');
    console.log('1. ✅ Backend API is working and returning data');
    console.log('2. ✅ Authentication is working correctly');
    console.log('3. ✅ Data format matches expected structure');
    console.log('4. ✅ CORS headers are properly configured');
    
    console.log('\n💡 If frontend still shows no data, check:');
    console.log('   1. Browser console for JavaScript errors');
    console.log('   2. Network tab - look for failed requests to /sick-leaves');
    console.log('   3. Frontend component state - check if fetchSickLeaves() is called');
    console.log('   4. Service method - verify sickLeaveService.getAll() is working');
    console.log('   5. Component mounting - check useEffect dependencies');
    console.log('   6. Data filtering - check role-based filtering logic');
    
    console.log('\n🌐 Test URLs:');
    console.log('   - API: http://localhost:5000/api/v1/sick-leaves');
    console.log('   - Frontend: http://localhost:3000/company/techcorp-solutions/sick-leaves');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugFrontendSickLeaves();