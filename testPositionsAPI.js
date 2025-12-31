/**
 * Test the positions API endpoint
 */
import dotenv from 'dotenv';
import axios from 'axios';
import { generateTestToken } from './server/utils/devAutoLogin.js';

// Load environment variables
dotenv.config();

async function testPositionsAPI() {
    try {
        console.log('🧪 Testing Positions API...\n');

        // Generate test token
        const { token, user } = generateTestToken();
        console.log('🔑 Generated test token for:', user.email);
        console.log('   Tenant ID:', user.tenantId);
        console.log('   Role:', user.role);

        // Test the positions endpoint
        const response = await axios.get('http://localhost:5000/api/v1/positions', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n✅ API Response:');
        console.log('   Status:', response.status);
        console.log('   Success:', response.data.success);
        console.log('   Positions count:', response.data.data?.length || 0);

        if (response.data.data && response.data.data.length > 0) {
            console.log('\n💼 Positions found:');
            response.data.data.forEach((pos, index) => {
                console.log(`   ${index + 1}. ${pos.title} (${pos.code}) - Active: ${pos.isActive}`);
                console.log(`      Department: ${pos.department?.name || 'N/A'}`);
            });
        } else {
            console.log('\n❌ No positions returned from API');
        }

    } catch (error) {
        console.error('❌ API Error:');
        console.error('   Status:', error.response?.status);
        console.error('   Message:', error.response?.data?.message || error.message);
        console.error('   Error:', error.response?.data?.error || 'Unknown error');
        
        if (error.response?.status === 401) {
            console.log('\n🔐 Authentication issue detected');
        } else if (error.response?.status === 403) {
            console.log('\n🚫 Authorization issue detected');
        }
    }
}

testPositionsAPI();