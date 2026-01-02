#!/usr/bin/env node
/**
 * License Validation Script
 * Test license validation functionality
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import licenseValidationService from '../services/licenseValidationService.js';
import connectDB from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const validateLicenses = async () => {
  try {
    console.log(chalk.blue('🔍 License Validation Tool'));
    console.log(chalk.gray('═'.repeat(50)));

    // Connect to database
    console.log(chalk.blue('\n🔌 Connecting to database...'));
    await connectDB();
    console.log(chalk.green('✅ Database connected'));

    // Get company ID from environment or command line
    const companyId = process.argv[2] || process.env.COMPANY_ID || 'default-company';
    
    console.log(chalk.cyan(`\n🏢 Validating license for company: ${companyId}`));

    // Test online validation
    console.log(chalk.blue('\n🌐 Testing online validation...'));
    const onlineResult = await licenseValidationService.validateLicense(companyId, {
      useCache: false,
      forceOffline: false
    });

    console.log(chalk.yellow('\n📊 Online Validation Result:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`   Valid: ${onlineResult.valid ? chalk.green('✅ Yes') : chalk.red('❌ No')}`);
    console.log(`   Online: ${onlineResult.online ? chalk.green('✅ Yes') : chalk.yellow('⚠️  No')}`);
    console.log(`   Reason: ${onlineResult.reason || 'N/A'}`);
    console.log(`   Processing Time: ${onlineResult.processingTime}ms`);
    
    if (onlineResult.license) {
      console.log(chalk.blue('\n📄 License Information:'));
      console.log(`   License Number: ${onlineResult.license.licenseNumber}`);
      console.log(`   License Type: ${onlineResult.license.licenseType}`);
      console.log(`   Status: ${onlineResult.license.status}`);
      console.log(`   Expires: ${onlineResult.license.expiresAt}`);
      console.log(`   Max Users: ${onlineResult.license.maxUsers}`);
      console.log(`   Modules: ${onlineResult.license.enabledModules?.join(', ') || 'None'}`);
    }

    // Test offline validation
    console.log(chalk.blue('\n📱 Testing offline validation...'));
    const offlineResult = await licenseValidationService.validateLicense(companyId, {
      useCache: false,
      forceOffline: true
    });

    console.log(chalk.yellow('\n📊 Offline Validation Result:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`   Valid: ${offlineResult.valid ? chalk.green('✅ Yes') : chalk.red('❌ No')}`);
    console.log(`   Offline: ${offlineResult.offline ? chalk.green('✅ Yes') : chalk.yellow('⚠️  No')}`);
    console.log(`   Fallback Used: ${offlineResult.fallbackUsed ? chalk.yellow('⚠️  Yes') : chalk.green('✅ No')}`);
    console.log(`   Reason: ${offlineResult.reason || 'N/A'}`);
    console.log(`   Processing Time: ${offlineResult.processingTime}ms`);

    // Test module validation
    const testModules = ['hr-core', 'attendance', 'payroll', 'reports'];
    
    console.log(chalk.blue('\n🧩 Testing module validation...'));
    for (const moduleId of testModules) {
      const moduleResult = await licenseValidationService.validateModule(companyId, moduleId);
      const status = moduleResult.valid ? chalk.green('✅ Licensed') : chalk.red('❌ Not Licensed');
      console.log(`   ${moduleId}: ${status}`);
    }

    // Test limits checking
    console.log(chalk.blue('\n📊 Testing limits checking...'));
    const mockUsage = {
      users: 50,
      storage: 1024 * 1024 * 1024, // 1GB
      apiCallsThisMonth: 5000
    };

    const limitsResult = await licenseValidationService.checkLimits(companyId, mockUsage);
    
    console.log(chalk.yellow('\n📈 Limits Check Result:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`   Within Limits: ${limitsResult.withinLimits ? chalk.green('✅ Yes') : chalk.red('❌ No')}`);
    
    if (limitsResult.violations && limitsResult.violations.length > 0) {
      console.log(chalk.red('\n⚠️  Limit Violations:'));
      limitsResult.violations.forEach(violation => {
        console.log(chalk.red(`   • ${violation.type}: ${violation.current}/${violation.limit} (${violation.severity})`));
      });
    }

    // Get validation statistics
    const stats = licenseValidationService.getValidationStats();
    console.log(chalk.blue('\n📈 Validation Statistics:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`   Cache Size: ${stats.cacheSize}/${stats.maxCacheSize}`);
    console.log(`   Cache Timeout: ${stats.cacheTimeout / 1000}s`);

    console.log(chalk.green('\n🎉 License validation testing completed!'));
    
    process.exit(0);

  } catch (error) {
    console.error(chalk.red('\n💥 License validation script failed:'), error.message);
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
};

validateLicenses();