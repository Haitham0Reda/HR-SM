#!/usr/bin/env node

/**
 * Debug Login Script
 * Detailed debugging of the login process
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';
import User from '../modules/hr-core/models/User.js';
import TenantConfig from '../modules/hr-core/models/TenantConfig.js';
import Company from '../platform/models/Company.js';
import bcrypt from 'bcryptjs';

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

async function debugLogin() {
  try {
    await connectDB();

    console.log(chalk.blue('🔍 Debugging Login Process\n'));

    const email = 'admin@techcorp.com';
    const password = 'admin123';
    
    // Step 1: Find company
    const company = await Company.findOne({ slug: 'techcorp_solutions' });
    console.log(chalk.yellow('1. Company lookup:'));
    if (company) {
      console.log(chalk.green(`  ✅ Found: ${company.name} (${company._id})`));
    } else {
      console.log(chalk.red('  ❌ Company not found'));
      return;
    }

    const tenantId = company._id.toString();

    // Step 2: Find user
    console.log(chalk.yellow('\n2. User lookup:'));
    const user = await User.findOne({ email, tenantId }).select('+password');
    if (user) {
      console.log(chalk.green(`  ✅ Found: ${user.firstName} ${user.lastName}`));
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Tenant ID: ${user.tenantId}`);
      console.log(`  Password hash: ${user.password ? 'Present' : 'Missing'}`);
    } else {
      console.log(chalk.red('  ❌ User not found'));
      return;
    }

    // Step 3: Test password comparison
    console.log(chalk.yellow('\n3. Password verification:'));
    try {
      const isPasswordValid = await user.comparePassword(password);
      if (isPasswordValid) {
        console.log(chalk.green('  ✅ Password is valid'));
      } else {
        console.log(chalk.red('  ❌ Password is invalid'));
        
        // Try manual bcrypt comparison
        const manualCheck = await bcrypt.compare(password, user.password);
        console.log(`  Manual bcrypt check: ${manualCheck ? 'Valid' : 'Invalid'}`);
      }
    } catch (error) {
      console.log(chalk.red('  ❌ Password comparison error:'), error.message);
    }

    // Step 4: Check tenant config
    console.log(chalk.yellow('\n4. Tenant config lookup:'));
    const tenant = await TenantConfig.findOne({ tenantId });
    if (tenant) {
      console.log(chalk.green(`  ✅ Found: ${tenant.companyName}`));
      console.log(`  Deployment mode: ${tenant.deploymentMode}`);
      console.log(`  Status: ${tenant.status}`);
      console.log(`  Plan: ${tenant.subscription?.plan}`);
    } else {
      console.log(chalk.red('  ❌ Tenant config not found'));
      return;
    }

    // Step 5: Simulate full login process
    console.log(chalk.yellow('\n5. Simulating login process:'));
    
    if (!user || !(await user.comparePassword(password))) {
      console.log(chalk.red('  ❌ Authentication failed'));
      return;
    }

    if (user.status !== 'active') {
      console.log(chalk.red('  ❌ User not active'));
      return;
    }

    if (tenant.deploymentMode === 'on-premise' && !tenant.validateLicense) {
      console.log(chalk.red('  ❌ License validation failed'));
      return;
    }

    console.log(chalk.green('  ✅ All checks passed - login should succeed!'));

    // Step 6: Test actual API call
    console.log(chalk.yellow('\n6. Testing API call:'));
    
    const axios = (await import('axios')).default;
    
    try {
      const response = await axios.post('http://localhost:5000/api/v1/auth/login', {
        email,
        password,
        tenantId
      });
      
      if (response.data.success) {
        console.log(chalk.green('  ✅ API login successful!'));
        console.log(`  Token: ${response.data.data?.token ? 'Present' : 'Missing'}`);
        console.log(`  User: ${response.data.data?.user?.firstName} ${response.data.data?.user?.lastName}`);
        
        if (response.data.data?.token) {
          console.log(chalk.green('  🎉 Login fully working - token and user data received!'));
        }
      } else {
        console.log(chalk.red('  ❌ API login failed:'), response.data.message);
      }
    } catch (apiError) {
      console.log(chalk.red('  ❌ API call failed:'));
      console.log(`  Status: ${apiError.response?.status}`);
      console.log(`  Message: ${apiError.response?.data?.message || apiError.message}`);
    }

  } catch (error) {
    console.error(chalk.red('❌ Debug failed:'), error.message);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.blue('\n🔌 Disconnected from MongoDB'));
  }
}

debugLogin();