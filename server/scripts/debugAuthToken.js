#!/usr/bin/env node

/**
 * Debug Auth Token Script
 * Helps debug JWT token issues and tenant ID mismatches
 */

import jwt from 'jsonwebtoken';
import chalk from 'chalk';

function debugAuthToken() {
  console.log(chalk.blue('🔍 JWT Token Debugging Guide\n'));

  console.log(chalk.yellow('📋 Issue Analysis:'));
  console.log('The HR app is getting a 404 error when calling /api/v1/auth/me');
  console.log('Error shows tenantId: 693cd49496e80950a403b2c8 (old company)');
  console.log('But TechCorp users are now in: 693db0e2ccc5ea08aeee120c (new company)');

  console.log(chalk.yellow('\n🔧 Solution Steps:'));
  console.log('1. Clear browser localStorage to remove old tokens');
  console.log('2. Login again with correct credentials');
  console.log('3. Verify new token has correct tenant ID');

  console.log(chalk.green('\n🌐 Browser Console Commands:'));
  console.log(chalk.cyan('// Clear all localStorage'));
  console.log(chalk.cyan('localStorage.clear();'));
  console.log(chalk.cyan(''));
  console.log(chalk.cyan('// Or clear specific items'));
  console.log(chalk.cyan('localStorage.removeItem("token");'));
  console.log(chalk.cyan('localStorage.removeItem("tenant_token");'));
  console.log(chalk.cyan('localStorage.removeItem("user");'));
  console.log(chalk.cyan(''));
  console.log(chalk.cyan('// Refresh the page'));
  console.log(chalk.cyan('window.location.reload();'));

  console.log(chalk.green('\n🔑 Login Credentials:'));
  console.log('Email: admin@techcorp.com');
  console.log('Password: admin123');
  console.log('Tenant ID: 693db0e2ccc5ea08aeee120c');

  console.log(chalk.yellow('\n🧪 Token Verification:'));
  console.log('After login, check the new token contains correct tenant ID:');
  console.log(chalk.cyan('// In browser console:'));
  console.log(chalk.cyan('const token = localStorage.getItem("token") || localStorage.getItem("tenant_token");'));
  console.log(chalk.cyan('console.log("Token:", token);'));
  console.log(chalk.cyan(''));
  console.log(chalk.cyan('// Decode token (client-side - for debugging only)'));
  console.log(chalk.cyan('const payload = JSON.parse(atob(token.split(".")[1]));'));
  console.log(chalk.cyan('console.log("Token payload:", payload);'));

  // If a token is provided as argument, decode it
  const token = process.argv[2];
  if (token) {
    console.log(chalk.yellow('\n🔍 Decoding provided token:'));
    try {
      const decoded = jwt.decode(token);
      console.log(chalk.green('✅ Token decoded successfully:'));
      console.log(JSON.stringify(decoded, null, 2));
      
      if (decoded.tenantId) {
        if (decoded.tenantId === '693db0e2ccc5ea08aeee120c') {
          console.log(chalk.green('✅ Token has correct tenant ID'));
        } else {
          console.log(chalk.red('❌ Token has wrong tenant ID:'), decoded.tenantId);
          console.log(chalk.yellow('Expected:'), '693db0e2ccc5ea08aeee120c');
        }
      }
    } catch (error) {
      console.log(chalk.red('❌ Failed to decode token:'), error.message);
    }
  }

  console.log(chalk.blue('\n📝 Usage:'));
  console.log('node server/scripts/debugAuthToken.js [token]');
  console.log('');
  console.log('Example:');
  console.log('node server/scripts/debugAuthToken.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
}

debugAuthToken();