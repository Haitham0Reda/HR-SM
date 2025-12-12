/**
 * SickLeave Migration Script
 * 
 * Migrates sick-type leaves from Leave model to SickLeave model
 * Preserves all original field values, timestamps, workflow state, and medical documentation
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
import Leave from '../../modules/hr-core/vacations/models/leave.model.js';
import SickLeave from '../../modules/hr-core/vacations/models/sickLeave.model.js';

async function migrateSickLeaves(dryRun = false) {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all sick-type leaves
    console.log('\n🔍 Finding sick-type leaves...');
    const sickLeaves = await Leave.find({ leaveType: 'sick' }).lean();
    console.log(`📊 Found ${sickLeaves.length} sick-type leaves to migrate`);

    if (sickLeaves.length === 0) {
      console.log('⚠️  No sick-type leaves found. Nothing to migrate.');
      return { migrated: 0, failed: 0, skipped: 0 };
    }

    const stats = {
      migrated: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    console.log(`\n${dryRun ? '🧪 DRY RUN MODE - No data will be written' : '🚀 Starting migration...'}`);

    for (const leave of sickLeaves) {
      try {
        // Check if already migrated
        const existingSickLeave = await SickLeave.findOne({
          employee: leave.employee,
          startDate: leave.startDate,
          endDate: leave.endDate
        });

        if (existingSickLeave) {
          console.log(`⏭️  Skipping already migrated sick leave: ${leave._id}`);
          stats.skipped++;
          continue;
        }

        // Map Leave fields to SickLeave fields
        const sickLeaveData = {
          // Core fields
          employee: leave.employee,
          startDate: leave.startDate,
          endDate: leave.endDate,
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
          
          // Medical documentation (preserve all fields)
          medicalDocumentation: {
            required: leave.medicalDocumentation?.required || false,
            provided: leave.medicalDocumentation?.provided || false,
            documents: leave.medicalDocumentation?.documents || [],
            reviewedByDoctor: leave.medicalDocumentation?.reviewedByDoctor || false,
            doctorReviewedBy: leave.medicalDocumentation?.doctorReviewedBy,
            doctorReviewedAt: leave.medicalDocumentation?.doctorReviewedAt,
            doctorNotes: leave.medicalDocumentation?.doctorNotes,
            additionalDocRequested: leave.medicalDocumentation?.additionalDocRequested || false,
            requestNotes: leave.medicalDocumentation?.requestNotes
          },
          
          // Workflow state (preserve all fields)
          workflow: {
            supervisorApprovalStatus: leave.workflow?.supervisorApprovalStatus || 'pending',
            doctorApprovalStatus: leave.workflow?.doctorApprovalStatus || 'pending',
            currentStep: leave.workflow?.currentStep || 'supervisor-review'
          },
          
          // Vacation balance reference
          vacationBalance: leave.vacationBalance,
          
          // Denormalized fields
          department: leave.department,
          position: leave.position,
          
          // Notifications
          notifications: leave.notifications || {},
          
          // Preserve original timestamps
          createdAt: leave.createdAt,
          updatedAt: leave.updatedAt,
          
          // Store original Leave ID for reference
          _originalLeaveId: leave._id
        };

        if (!dryRun) {
          // Create new SickLeave document
          const sickLeave = new SickLeave(sickLeaveData);
          await sickLeave.save({ validateBeforeSave: true });
          stats.migrated++;
          console.log(`✅ Migrated sick leave: ${leave._id} -> ${sickLeave._id}`);
        } else {
          stats.migrated++;
          console.log(`✅ [DRY RUN] Would migrate sick leave: ${leave._id}`);
        }

      } catch (error) {
        stats.failed++;
        stats.errors.push({
          leaveId: leave._id,
          error: error.message
        });
        console.error(`❌ Failed to migrate sick leave ${leave._id}:`, error.message);
      }
    }

    // Save migration metadata
    if (!dryRun) {
      const db = mongoose.connection.db;
      const metadataCollection = db.collection('migration_metadata');
      await metadataCollection.insertOne({
        type: 'sickleave_migration',
        sourceCollection: 'leaves',
        targetCollection: 'sickleaves',
        totalDocuments: sickLeaves.length,
        migrated: stats.migrated,
        failed: stats.failed,
        skipped: stats.skipped,
        errors: stats.errors,
        createdAt: new Date(),
        status: stats.failed > 0 ? 'completed_with_errors' : 'completed'
      });
    }

    console.log('\n📋 Migration Summary:');
    console.log(`   - Total sick leaves found: ${sickLeaves.length}`);
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
  
  migrateSickLeaves(dryRun)
    .then((stats) => {
      if (stats.failed === 0) {
        console.log('\n✅ SickLeave migration completed successfully');
        process.exit(0);
      } else {
        console.log('\n⚠️  SickLeave migration completed with errors');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ SickLeave migration failed:', error);
      process.exit(1);
    });
}

export default migrateSickLeaves;
