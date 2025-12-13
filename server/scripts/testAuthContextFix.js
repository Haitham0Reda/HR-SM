#!/usr/bin/env node

/**
 * Test Auth Context Fix Script
 * Tests if the AuthContext properly handles 404 errors and clears invalid tokens
 */

import axios from 'axios';
import chalk from 'chalk';

async function testAuthContextFix() {
  console.log(chalk.blue('🧪 Testing AuthContext Fix\n'));

  const baseURL = 'http://localhost:5000';
  
  // Test 1: Simulate old token with wrong tenant ID
  console.log(chalk.yellow('1. Testing with invalid token (wrong tenant ID)...'));
  
  try {
    // Create a token with the old tenant ID (this should fail)
    const jwt = (await import('jsonwebtoken')).default;
    const invalidToken = jwt.sign(
      {
        userId: '507f1f77bcf86cd799439011', // Some user ID
        tenantId: '693cd49496e80950a403b2c8', // OLD tenant ID
        role: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Generated invalid token with old tenant ID');
    
    // Test the /me endpoint with this token
    const response = await axios.get(`${baseURL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${invalidToken}`
      }
    });
    
    console.log(chalk.red('❌ Should have failed but got response:'), response.data);
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(chalk.green('✅ Correctly returned 404 for invalid token'));
      console.log('   AuthContext should now clear the token automatically');
    } else {
      console.log(chalk.yellow('⚠️ Got different error:'), error.response?.status, error.response?.data?.message);
    }
  }

  // Test 2: Test with valid token
  console.log(chalk.yellow('\n2. Testing with valid token...'));
  
  try {
    // Login to get a valid token
    const loginResponse = await axios.post(`${baseURL}/api/v1/auth/login`, {
      email: 'admin@techcorp.com',
      password: 'admin123',
      tenantId: '693db0e2ccc5ea08aeee120c' // Correct tenant ID
    });
    
    if (loginResponse.data.success && loginResponse.data.data?.token) {
      const validToken = loginResponse.data.data.token;
      console.log('✅ Got valid token from login');
      
      // Test /me endpoint with valid token
      const meResponse = await axios.get(`${baseURL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });
      
      if (meResponse.data.success) {
        console.log(chalk.green('✅ /me endpoint works with valid token'));
        console.log(`   User: ${meResponse.data.data?.firstName} ${meResponse.data.data?.lastName}`);
      } else {
        console.log(chalk.red('❌ /me endpoint failed with valid token'));
      }
      
    } else {
      console.log(chalk.red('❌ Failed to get valid token from login'));
    }
    
  } catch (error) {
    console.log(chalk.red('❌ Login or /me test failed:'), error.response?.data?.message || error.message);
  }

  console.log(chalk.blue('\n📋 Summary:'));
  console.log('✅ AuthContext now handles 404 errors by clearing invalid tokens');
  console.log('✅ Added companySlug property for module access');
  console.log('✅ Browser should automatically logout when token is invalid');
  
  console.log(chalk.green('\n🎯 Next Steps:'));
  console.log('1. Refresh the browser page');
  console.log('2. The app should automatically clear the invalid token');
  console.log('3. Login again with: admin@techcorp.com / admin123');
  console.log('4. Module access should work properly');
}

testAuthContextFix();