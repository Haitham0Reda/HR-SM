#!/usr/bin/env node

/**
 * Fix TechCorp Passwords Script
 * Fixes missing passwords for TechCorp Solutions users
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

async function fixTechCorpPasswords() {
  try {
    await connectDB();

    console.log(chalk.blue('🔧 Fixing TechCorp Solutions User Passwords\n'));

    // Find TechCorp company
    const company = await Company.findOne({ slug: 'techcorp_solutions' });
    if (!company) {
      console.log(chalk.red('❌ TechCorp Solutions company not found'));
      return;
    }

    // Define password mappings
    const passwordMap = {
      'admin@techcorp.com': 'admin123',
      'hr@techcorp.com': 'hr123',
      'manager@techcorp.com': 'manager123',
      'john.doe@techcorp.com': 'employee123',
      'jane.smith@techcorp.com': 'employee123',
      'ahmed.ali@techcorp.com': 'employee123',
      'fatma.mohamed@techcorp.com': 'employee123',
      'omar.ibrahim@techcorp.com': 'employee123'
    };

    // Find users for this company
    const users = await User.find({ tenantId: company._id });
    console.log(chalk.yellow(`📋 Fixing passwords for ${users.length} users:\n`));

    let fixed = 0;

    for (const user of users) {
      const plainPassword = passwordMap[user.email];
      
      if (plainPassword) {
        console.log(chalk.blue(`🔧 Fixing password for ${user.firstName} ${user.lastName} (${user.email})`));
        
        try {
          // Hash the password manually
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
          
          // Update the user directly in the database
          await User.updateOne(
            { _id: user._id },
            { 
              $set: { 
                password: hashedPassword,
                updatedAt: new Date()
              }
            }
          );
          
          console.log(chalk.green(`  ✅ Password updated successfully`));
          fixed++;
          
        } catch (error) {
          console.log(chalk.red(`  ❌ Failed to update password:`), error.message);
        }
      } else {
        console.log(chalk.yellow(`⚠️ No password mapping found for ${user.email}`));
      }
    }

    console.log(chalk.blue(`\n📊 Summary: Fixed ${fixed} passwords`));

    // Verify the fixes
    console.log(chalk.yellow('\n🧪 Verifying fixes...\n'));
    
    const adminUser = await User.findOne({ email: 'admin@techcorp.com' });
    if (adminUser && adminUser.password) {
      const isValid = await bcrypt.compare('admin123', adminUser.password);
      if (isValid) {
        console.log(chalk.green('✅ Admin password verification successful!'));
      } else {
        console.log(chalk.red('❌ Admin password verification failed'));
      }
    } else {
      console.log(chalk.red('❌ Admin user not found or password still missing'));
    }

    console.log(chalk.green('\n🎉 Password fixes completed!'));
    console.log(chalk.blue('\n🔑 Updated credentials:'));
    console.log('  Admin: admin@techcorp.com / admin123');
    console.log('  HR: hr@techcorp.com / hr123');
    console.log('  Manager: manager@techcorp.com / manager123');
    console.log('  Employee: john.doe@techcorp.com / employee123');

  } catch (error) {
    console.error(chalk.red('❌ Fix failed:'), error.message);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.blue('\n🔌 Disconnected from MongoDB'));
  }
}

fixTechCorpPasswords();