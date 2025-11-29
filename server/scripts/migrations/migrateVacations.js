/**
 * Vacation Migration Script
 * 
 * Migrates annual/casual/unpaid leaves from Leave model to Vacation model
 * Preserves all original field values, timestamps, and references
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Import models
import Leave from '../../models/leave.model.js';
import Vacation from '../../models/vacation.model.js';

// Vacation types to migrate
const VACATION_TYPES = ['annual', 'casual', 'unpaid'];

async function migrateVacations(dryRun = false) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all vacation-type leaves
    console.log('\n🔍 Finding vacation-type leaves...');
    const vacationLeaves = await Leave.find({ 
      leaveType: { $in: VACATION_TYPES } 
    }).lean();
    console.log(`📊 Found ${vacationLeaves.length} vacation-type leaves to migrate`);

    if (vacationLeaves.length === 0) {
      console.log('⚠️  No vacation-type leaves found. Nothing to migrate.');
      return { migrated: 0, failed: 0, skipped: 0 };
    }

    const stats = {
      migrated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      byType: {
        annual: 0,
        casual: 0,
        unpaid: 0
      }
    };

    console.log(`\n${dryRun ? '🧪 DRY RUN MODE - No data will be written' : '🚀 Starting migration...'}`);

    for (const leave of vacationLeaves) {
      try {
        // Check if already migrated
        const existingVacation = await Vacation.findOne({
          employee: leave.employee,
          startDate: leave.startDate,
          endDate: leave.endDate,
          vacationType: leave.leaveType
        });

        if (existingVacation) {
          console.log(`⏭️  Skipping already migrated vacation: ${leave._id}`);
          stats.skipped++;
          continue;
        }

        // Map Leave fields to Vacation fields
        const vacationData = {
          // Core fields
          employee: leave.employee,
          vacationType: leave.leaveType, // annual, casual, unpaid
          startDate: leave.startDate,
          endDate: leave.endDate,
          startTime: leave.startTime,
          endTime: leave.endTime,
          duration: leave.duration,
          reason: leave.reason,
          
          // Status and approval fields
          status: leave.status,
          approvedBy: leave.approvedBy,
          approvedAt: leave.approvedAt,
          rejectedBy: leave.rejectedBy,
          rejectedAt: leave.rejectedAt,
          rejectionReason: leave.rejectionReason,
          cancelledBy: leave.cancelledBy,
          cancelledAt: leave.cancelledAt,
          cancellationReason: leave.cancellationReason,
          approverNotes: leave.approverNotes,
          
          // Vacation balance reference
          vacationBalance: leave.vacationBalance,
          
          // Denormalized fields
          department: leave.department,
          position: leave.position,
          
          // Attachments
          attachments: leave.attachments || [],
          
          // Notifications
          notifications: leave.notifications || {},
          
          // Preserve original timestamps
          createdAt: leave.createdAt,
          updatedAt: leave.updatedAt,
          
          // Store original Leave ID for reference
          _originalLeaveId: leave._id
        };

        if (!dryRun) {
          // Create new Vacation document
          const vacation = new Vacation(vacationData);
          await vacation.save({ validateBeforeSave: true });
          stats.migrated++;
          stats.byType[leave.leaveType]++;
          console.log(`✅ Migrated ${leave.leaveType} vacation: ${leave._id} -> ${vacation._id}`);
        } else {
          stats.migrated++;
          stats.byType[leave.leaveType]++;
          console.log(`✅ [DRY RUN] Would migrate ${leave.leaveType} vacation: ${leave._id}`);
        }

      } catch (error) {
        stats.failed++;
        stats.errors.push({
          leaveId: leave._id,
          leaveType: leave.leaveType,
          error: error.message
        });
        console.error(`❌ Failed to migrate vacation ${leave._id}:`, error.message);
      }
    }

    // Save migration metadata
    if (!dryRun) {
      const db = mongoose.connection.db;
      const metadataCollection = db.collection('migration_metadata');
      await metadataCollection.insertOne({
        type: 'vacation_migration',
        sourceCollection: 'leaves',
        targetCollection: 'vacations',
        totalDocuments: vacationLeaves.length,
        migrated: stats.migrated,
        failed: stats.failed,
        skipped: stats.skipped,
        byType: stats.byType,
        errors: stats.errors,
        createdAt: new Date(),
        status: stats.failed > 0 ? 'completed_with_errors' : 'completed'
      });
    }

    console.log('\n📋 Migration Summary:');
    console.log(`   - Total vacations found: ${vacationLeaves.length}`);
    console.log(`   - Successfully migrated: ${stats.migrated}`);
    console.log(`     • Annual: ${stats.byType.annual}`);
    console.log(`     • Casual: ${stats.byType.casual}`);
    console.log(`     • Unpaid: ${stats.byType.unpaid}`);
    console.log(`   - Failed: ${stats.failed}`);
    console.log(`   - Skipped (already migrated): ${stats.skipped}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      stats.errors.forEach(err => {
        console.log(`   - Leave ${err.leaveId} (${err.leaveType}): ${err.error}`);
      });
    }

    return stats;

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes('--dry-run');
  
  migrateVacations(dryRun)
    .then((stats) => {
      if (stats.failed === 0) {
        console.log('\n✅ Vacation migration completed successfully');
        process.exit(0);
      } else {
        console.log('\n⚠️  Vacation migration completed with errors');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ Vacation migration failed:', error);
      process.exit(1);
    });
}

export default migrateVacations;
