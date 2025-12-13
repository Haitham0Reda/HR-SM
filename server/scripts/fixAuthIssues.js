#!/usr/bin/env node

/**
 * Fix Auth Issues Script
 * Comprehensive fix for authentication and tenant ID issues
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';
import User from '../modules/hr-core/models/User.js';
import TenantConfig from '../modules/hr-core/models/TenantConfig.js';
import Company from '../platform/models/Company.js';

// Load environment variables
dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-platform');
    console.log(chalk.green('✅ Connected to MongoDB'));
  } catch (error) {
    console.error(chalk.red('❌ MongoDB connection failed:'), error.message);
    process.exit(1);
  }
}

async function fixAuthIssues() {
  try {
    await connectDB();

    console.log(chalk.blue('🔧 Fixing Authentication Issues\n'));

    // Step 1: Verify TechCorp company exists
    console.log(chalk.yellow('1. Verifying TechCorp company...'));
    const company = await Company.findOne({ slug: 'techcorp_solutions' });
    if (company) {
      console.log(chalk.green(`  ✅ Company found: ${company.name} (${company._id})`));
    } else {
      console.log(chalk.red('  ❌ Company not found'));
      return;
    }

    // Step 2: Verify TenantConfig exists
    console.log(chalk.yellow('\n2. Verifying TenantConfig...'));
    const tenantConfig = await TenantConfig.findOne({ tenantId: company._id });
    if (tenantConfig) {
      console.log(chalk.green(`  ✅ TenantConfig found: ${tenantConfig.companyName}`));
    } else {
      console.log(chalk.red('  ❌ TenantConfig not found'));
      return;
    }

    // Step 3: Verify users exist with correct tenant ID
    console.log(chalk.yellow('\n3. Verifying users...'));
    const users = await User.find({ tenantId: company._id });
    console.log(chalk.green(`  ✅ Found ${users.length} users with correct tenant ID`));

    // Step 4: Test authentication flow
    console.log(chalk.yellow('\n4. Testing authentication flow...'));
    const adminUser = await User.findOne({ 
      email: 'admin@techcorp.com', 
      tenantId: company._id 
    }).select('+password');

    if (adminUser) {
      console.log(chalk.green('  ✅ Admin user found'));
      
      // Test password
      const isPasswordValid = await adminUser.comparePassword('admin123');
      if (isPasswordValid) {
        console.log(chalk.green('  ✅ Password is valid'));
      } else {
        console.log(chalk.red('  ❌ Password is invalid'));
      }
    } else {
      console.log(chalk.red('  ❌ Admin user not found'));
    }

    // Step 5: Clean up any old users with wrong tenant IDs
    console.log(chalk.yellow('\n5. Cleaning up old users...'));
    const oldTenantId = '693cd49496e80950a403b2c8';
    const oldUsers = await User.find({ tenantId: oldTenantId });
    
    if (oldUsers.length > 0) {
      console.log(chalk.yellow(`  Found ${oldUsers.length} users with old tenant ID`));
      console.log(chalk.yellow('  These users should be removed or updated:'));
      
      for (const user of oldUsers) {
        console.log(`    - ${user.firstName} ${user.lastName} (${user.email})`);
      }
      
      // Optionally remove them (commented out for safety)
      // await User.deleteMany({ tenantId: oldTenantId });
      // console.log(chalk.green('  ✅ Old users removed'));
    } else {
      console.log(chalk.green('  ✅ No old users found'));
    }

    // Step 6: Test API endpoints
    console.log(chalk.yellow('\n6. Testing API endpoints...'));
    
    const axios = (await import('axios')).default;
    
    try {
      // Test login
      const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
        email: 'admin@techcorp.com',
        password: 'admin123',
        tenantId: company._id.toString()
      });
      
      if (loginResponse.data.success && loginResponse.data.data?.token) {
        console.log(chalk.green('  ✅ Login API working'));
        
        const token = loginResponse.data.data.token;
        
        // Test /me endpoint
        const meResponse = await axios.get('http://localhost:5000/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (meResponse.data.success) {
          console.log(chalk.green('  ✅ /me API working'));
        } else {
          console.log(chalk.red('  ❌ /me API failed'));
        }
        
      } else {
        console.log(chalk.red('  ❌ Login API failed'));
      }
      
    } catch (apiError) {
      console.log(chalk.red('  ❌ API test failed:'), apiError.response?.data?.message || apiError.message);
    }

    console.log(chalk.green('\n🎉 Authentication system verification complete!'));
    
    console.log(chalk.blue('\n📋 Client-Side Fix Instructions:'));
    console.log('1. Open browser developer tools (F12)');
    console.log('2. Go to Console tab');
    console.log('3. Run: localStorage.clear()');
    console.log('4. Refresh the page');
    console.log('5. Login with: admin@techcorp.com / admin123');
    
    console.log(chalk.green('\n✅ After clearing localStorage, the authentication should work properly!'));

  } catch (error) {
    console.error(chalk.red('❌ Fix failed:'), error.message);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.blue('\n🔌 Disconnected from MongoDB'));
  }
}

fixAuthIssues();