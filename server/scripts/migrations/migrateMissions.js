/**
 * Mission Migration Script
 * 
 * Migrates mission-type leaves from Leave model to Mission model
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
import Mission from '../../models/mission.model.js';

async function migrateMissions(dryRun = false) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all mission-type leaves
    console.log('\n🔍 Finding mission-type leaves...');
    const missionLeaves = await Leave.find({ leaveType: 'mission' }).lean();
    console.log(`📊 Found ${missionLeaves.length} mission-type leaves to migrate`);

    if (missionLeaves.length === 0) {
      console.log('⚠️  No mission-type leaves found. Nothing to migrate.');
      return { migrated: 0, failed: 0, skipped: 0 };
    }

    const stats = {
      migrated: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    console.log(`\n${dryRun ? '🧪 DRY RUN MODE - No data will be written' : '🚀 Starting migration...'}`);

    for (const leave of missionLeaves) {
      try {
        // Check if already migrated
        const existingMission = await Mission.findOne({
          employee: leave.employee,
          startDate: leave.startDate,
          endDate: leave.endDate,
          location: leave.mission?.location
        });

        if (existingMission) {
          console.log(`⏭️  Skipping already migrated mission: ${leave._id}`);
          stats.skipped++;
          continue;
        }

        // Map Leave fields to Mission fields
        const missionData = {
          // Core fields
          employee: leave.employee,
          startDate: leave.startDate,
          endDate: leave.endDate,
          startTime: leave.startTime,
          endTime: leave.endTime,
          duration: leave.duration,
          
          // Mission-specific fields
          location: leave.mission?.location || '',
          purpose: leave.mission?.purpose || leave.reason || '',
          relatedDepartment: leave.mission?.relatedDepartment,
          
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
          // Create new Mission document
          const mission = new Mission(missionData);
          await mission.save({ validateBeforeSave: true });
          stats.migrated++;
          console.log(`✅ Migrated mission: ${leave._id} -> ${mission._id}`);
        } else {
          stats.migrated++;
          console.log(`✅ [DRY RUN] Would migrate mission: ${leave._id}`);
        }

      } catch (error) {
        stats.failed++;
        stats.errors.push({
          leaveId: leave._id,
          error: error.message
        });
        console.error(`❌ Failed to migrate mission ${leave._id}:`, error.message);
      }
    }

    // Save migration metadata
    if (!dryRun) {
      const db = mongoose.connection.db;
      const metadataCollection = db.collection('migration_metadata');
      await metadataCollection.insertOne({
        type: 'mission_migration',
        sourceCollection: 'leaves',
        targetCollection: 'missions',
        totalDocuments: missionLeaves.length,
        migrated: stats.migrated,
        failed: stats.failed,
        skipped: stats.skipped,
        errors: stats.errors,
        createdAt: new Date(),
        status: stats.failed > 0 ? 'completed_with_errors' : 'completed'
      });
    }

    console.log('\n📋 Migration Summary:');
    console.log(`   - Total missions found: ${missionLeaves.length}`);
    console.log(`   - Successfully migrated: ${stats.migrated}`);
    console.log(`   - Failed: ${stats.failed}`);
    console.log(`   - Skipped (already migrated): ${stats.skipped}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      stats.errors.forEach(err => {
        console.log(`   - Leave ${err.leaveId}: ${err.error}`);
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
  
  migrateMissions(dryRun)
    .then((stats) => {
      if (stats.failed === 0) {
        console.log('\n✅ Mission migration completed successfully');
        process.exit(0);
      } else {
        console.log('\n⚠️  Mission migration completed with errors');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ Mission migration failed:', error);
      process.exit(1);
    });
}

export default migrateMissions;
