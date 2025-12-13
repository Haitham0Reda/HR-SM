#!/usr/bin/env node

/**
 * Test Module Access Script
 * Tests the module access service directly to verify TechCorp Solutions modules
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ModuleAccessService from '../services/ModuleAccessService.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-platform');
    console.log(chalk.green('✅ Connected to MongoDB'));
  } catch (error) {
    console.error(chalk.red('❌ MongoDB connection failed:'), error.message);
    process.exit(1);
  }
}

async function testModuleAccess() {
  try {
    await connectDB();

    console.log(chalk.blue('\n🧪 Testing Module Access for TechCorp Solutions\n'));

    // Test with both slug formats
    const slugs = ['techcorp_solutions', 'techcorp-solutions'];

    for (const slug of slugs) {
      console.log(chalk.yellow(`\n📋 Testing slug: ${slug}`));
      
      try {
        const result = await ModuleAccessService.getCompanyModules(slug);
        
        if (result.success) {
          console.log(chalk.green('✅ Success!'));
          console.log('Company:', result.company?.name);
          console.log('Modules found:', Object.keys(result.modules || {}).length);
          
          // Show enabled modules
          const enabledModules = Object.entries(result.modules || {})
            .filter(([key, module]) => module.enabled)
            .map(([key, module]) => `${key} (${module.name})`);
          
          console.log('Enabled modules:', enabledModules.join(', '));
          
          // Test specific module access
          console.log('\n🔍 Testing specific module access:');
          const testModules = ['reports', 'hr-core', 'attendance'];
          
          for (const moduleKey of testModules) {
            const accessResult = await ModuleAccessService.checkAccess(slug, moduleKey);
            const status = accessResult.hasAccess ? chalk.green('✅ ALLOWED') : chalk.red('❌ DENIED');
            console.log(`  ${moduleKey}: ${status} ${accessResult.reason ? `(${accessResult.reason})` : ''}`);
          }
          
        } else {
          console.log(chalk.red('❌ Failed:'), result.message);
        }
      } catch (error) {
        console.log(chalk.red('❌ Error:'), error.message);
      }
    }

  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.blue('\n🔌 Disconnected from MongoDB'));
  }
}

// Run the test
testModuleAccess();