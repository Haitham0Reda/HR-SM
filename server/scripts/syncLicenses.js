#!/usr/bin/env node
/**
 * License Synchronization Script
 * Manually sync licenses from License Server to Company Databases
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import licenseSyncService from '../services/licenseSyncService.js';
import connectDB from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const syncLicenses = async () => {
  try {
    console.log(chalk.blue('🔄 License Synchronization Tool'));
    console.log(chalk.gray('═'.repeat(50)));

    // Connect to database
    console.log(chalk.blue('\n🔌 Connecting to database...'));
    await connectDB();
    console.log(chalk.green('✅ Database connected'));

    // Initialize sync service
    console.log(chalk.blue('\n🚀 Initializing license sync service...'));
    await licenseSyncService.initialize();

    // Perform sync
    console.log(chalk.blue('\n🔄 Syncing license from server...'));
    const result = await licenseSyncService.syncLicenseFromServer();

    if (result.success) {
      console.log(chalk.green('\n✅ License sync completed successfully!'));
      console.log(chalk.gray(`   Duration: ${result.duration}ms`));
      console.log(chalk.gray(`   License ID: ${result.licenseId}`));
      console.log(chalk.gray(`   Action: ${result.result?.action || 'synced'}`));
    } else {
      console.log(chalk.red('\n❌ License sync failed!'));
      console.log(chalk.red(`   Error: ${result.error}`));
      console.log(chalk.gray(`   Duration: ${result.duration}ms`));
    }

    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error(chalk.red('\n💥 License sync script failed:'), error.message);
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
};

syncLicenses();