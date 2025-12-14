import axios from 'axios';

async function debugSickLeavesDisplay() {
  try {
    console.log('🔍 Debugging Sick Leaves Data Display...');
    
    // Login first (TechCorp tenant ID)
    const tenantId = '693db0e2ccc5ea08aeee120c';
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'admin@techcorp.com',
      password: 'admin123',
      tenantId: tenantId
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful for TechCorp');
    console.log('🔑 Token:', token.substring(0, 20) + '...');

    // Test sick leaves API endpoint
    console.log('\n📋 Testing Sick Leaves API...');
    
    try {
      const response = await axios.get('http://localhost:5000/api/v1/sick-leaves', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ API Response Status:', response.status);
      console.log('📊 Response Headers:', response.headers['content-type']);
      console.log('📦 Raw Response Data:', JSON.stringify(response.data, null, 2));
      
      // Analyze response structure
      if (response.data) {
        console.log('\n🔍 Response Analysis:');
        console.log('- Has success field:', 'success' in response.data);
        console.log('- Success value:', response.data.success);
        console.log('- Has data field:', 'data' in response.data);
        console.log('- Data type:', Array.isArray(response.data.data) ? 'Array' : typeof response.data.data);
        console.log('- Data length:', response.data.data?.length || 0);
        
        if (response.data.data && response.data.data.length > 0) {
          console.log('\n📋 First Sick Leave Record:');
          const firstRecord = response.data.data[0];
          console.log('- ID:', firstRecord._id);
          console.log('- Employee ID:', firstRecord.employee);
          console.log('- Employee Object:', JSON.stringify(firstRecord.employee, null, 2));
          console.log('- Tenant ID:', firstRecord.tenantId);
          console.log('- Start Date:', firstRecord.startDate);
          console.log('- End Date:', firstRecord.endDate);
          console.log('- Duration:', firstRecord.duration);
          console.log('- Status:', firstRecord.status);
          console.log('- Workflow:', JSON.stringify(firstRecord.workflow, null, 2));
          console.log('- Reason:', firstRecord.reason);
          console.log('- Created At:', firstRecord.createdAt);
        } else {
          console.log('\n⚠️  No sick leave records found');
        }
      }
      
    } catch (error) {
      console.log('❌ API Error:', error.response?.status);
      console.log('❌ Error Message:', error.response?.data?.message || error.message);
      console.log('❌ Full Error Response:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 404) {
        console.log('💡 Endpoint not found - checking route registration...');
      }
    }
    
    // Test if the route is accessible at all
    console.log('\n🔍 Testing Route Accessibility...');
    
    try {
      const healthResponse = await axios.get('http://localhost:5000/health');
      console.log('✅ Server is running:', healthResponse.status === 200);
    } catch (error) {
      console.log('❌ Server not accessible:', error.message);
    }
    
    // Test auth endpoint
    try {
      const authTestResponse = await axios.get('http://localhost:5000/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Auth working:', authTestResponse.status === 200);
      console.log('👤 Current user:', authTestResponse.data.data?.email);
    } catch (error) {
      console.log('❌ Auth issue:', error.response?.status, error.response?.data?.message);
    }
    
    // Test other endpoints for comparison
    console.log('\n🔍 Testing Other Endpoints for Comparison...');
    
    // Test missions endpoint
    try {
      const missionsResponse = await axios.get('http://localhost:5000/api/v1/missions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Missions endpoint:', missionsResponse.status, '- Count:', missionsResponse.data.data?.length || 0);
    } catch (error) {
      console.log('❌ Missions endpoint:', error.response?.status);
    }
    
    // Test users endpoint
    try {
      const usersResponse = await axios.get('http://localhost:5000/api/v1/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Users endpoint:', usersResponse.status, '- Count:', usersResponse.data.data?.length || 0);
    } catch (error) {
      console.log('❌ Users endpoint:', error.response?.status);
    }
    
    console.log('\n🎯 Diagnosis Summary:');
    console.log('====================');
    console.log('1. Check if sick leaves API returns data');
    console.log('2. Verify response format matches frontend expectations');
    console.log('3. Compare with working endpoints (missions, users)');
    console.log('4. Check for any authentication or authorization issues');
    console.log('5. Verify frontend service configuration');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugSickLeavesDisplay();