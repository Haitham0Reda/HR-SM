#!/usr/bin/env node

/**
 * Check User Tenants Script
 * Checks which tenant IDs users are associated with
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';
import User from '../modules/hr-core/models/User.js';

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

async function checkUserTenants() {
  try {
    await connectDB();

    console.log(chalk.blue('🔍 Checking User Tenant Associations\n'));

    // Find all users with admin@techcorp.com
    const techCorpUsers = await User.find({ email: 'admin@techcorp.com' });
    
    console.log(chalk.yellow(`📋 Found ${techCorpUsers.length} users with admin@techcorp.com:\n`));

    for (const user of techCorpUsers) {
      console.log(chalk.blue(`👤 ${user.firstName} ${user.lastName}`));
      console.log(`  Email: ${user.email}`);
      console.log(`  Tenant ID: ${user.tenantId}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Created: ${user.createdAt}`);
      
      // Check which tenant this is
      if (user.tenantId.toString() === '693cd49496e80950a403b2c8') {
        console.log(chalk.red('  ⚠️ OLD TENANT ID (should be removed or updated)'));
      } else if (user.tenantId.toString() === '693db0e2ccc5ea08aeee120c') {
        console.log(chalk.green('  ✅ NEW TENANT ID (correct)'));
      } else {
        console.log(chalk.yellow('  ❓ UNKNOWN TENANT ID'));
      }
      console.log('');
    }

    // Check all unique tenant IDs
    console.log(chalk.yellow('📊 All unique tenant IDs in system:'));
    const tenantIds = await User.distinct('tenantId');
    
    for (const tenantId of tenantIds) {
      const userCount = await User.countDocuments({ tenantId });
      console.log(`  ${tenantId}: ${userCount} users`);
      
      if (tenantId.toString() === '693cd49496e80950a403b2c8') {
        console.log(chalk.red('    ^ OLD TENANT - Consider removing these users'));
      } else if (tenantId.toString() === '693db0e2ccc5ea08aeee120c') {
        console.log(chalk.green('    ^ NEW TENANT - Correct TechCorp users'));
      }
    }

    console.log(chalk.blue('\n💡 Recommendations:'));
    console.log('1. Remove users with old tenant ID: 693cd49496e80950a403b2c8');
    console.log('2. Keep users with new tenant ID: 693db0e2ccc5ea08aeee120c');
    console.log('3. Clear browser localStorage to remove old tokens');
    console.log('4. Login again with admin@techcorp.com / admin123');

  } catch (error) {
    console.error(chalk.red('❌ Check failed:'), error.message);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.blue('\n🔌 Disconnected from MongoDB'));
  }
}

checkUserTenants();