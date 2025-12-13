#!/usr/bin/env node

/**
 * Verify TechCorp Users Script
 * Checks if TechCorp users exist and can authenticate
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';
import User from '../modules/hr-core/models/User.js';
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

async function verifyTechCorpUsers() {
  try {
    await connectDB();

    console.log(chalk.blue('🔍 Verifying TechCorp Solutions Users\n'));

    // Find TechCorp company
    const company = await Company.findOne({ slug: 'techcorp_solutions' });
    if (!company) {
      console.log(chalk.red('❌ TechCorp Solutions company not found'));
      return;
    }

    console.log(chalk.green('✅ Found TechCorp Solutions company:'));
    console.log(`  ID: ${company._id}`);
    console.log(`  Name: ${company.name}`);

    // Find users for this company (include password field)
    const users = await User.find({ tenantId: company._id }).select('+password');
    console.log(chalk.yellow(`\n📋 Found ${users.length} users for TechCorp Solutions:\n`));

    for (const user of users) {
      console.log(chalk.blue(`👤 ${user.firstName} ${user.lastName}`));
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Employee ID: ${user.employeeId}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Tenant ID: ${user.tenantId}`);
      console.log(`  Password Hash: ${user.password ? 'Present' : 'Missing'}`);
      
      // Test password verification
      if (user.email === 'admin@techcorp.com') {
        console.log(chalk.yellow('  🔐 Testing password verification...'));
        try {
          const isValid = await bcrypt.compare('admin123', user.password);
          if (isValid) {
            console.log(chalk.green('  ✅ Password verification successful'));
          } else {
            console.log(chalk.red('  ❌ Password verification failed'));
            
            // Try to fix the password
            console.log(chalk.yellow('  🔧 Fixing password...'));
            user.password = 'admin123'; // This will trigger the pre-save hook to hash it
            await user.save();
            console.log(chalk.green('  ✅ Password updated'));
          }
        } catch (error) {
          console.log(chalk.red('  ❌ Password test error:'), error.message);
        }
      }
      
      console.log('');
    }

    // Test login simulation
    console.log(chalk.yellow('🧪 Testing login simulation...\n'));
    
    const testUser = await User.findOne({ email: 'admin@techcorp.com' }).select('+password');
    if (testUser) {
      console.log('Found admin user for login test');
      
      // Simulate login process
      const isPasswordValid = await bcrypt.compare('admin123', testUser.password);
      console.log('Password valid:', isPasswordValid);
      
      if (isPasswordValid) {
        console.log(chalk.green('✅ Login simulation successful!'));
        console.log('User can authenticate with admin@techcorp.com / admin123');
      } else {
        console.log(chalk.red('❌ Login simulation failed - password mismatch'));
      }
    }

  } catch (error) {
    console.error(chalk.red('❌ Verification failed:'), error.message);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.blue('\n🔌 Disconnected from MongoDB'));
  }
}

verifyTechCorpUsers();