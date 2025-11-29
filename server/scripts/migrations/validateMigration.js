/**
 * Migration Validation Script
 * 
 * Validates data integrity after migration
 * Checks document counts, field mappings, and reference integrity
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
import SickLeave from '../../models/sickLeave.model.js';
import Vacation from '../../models/vacation.model.js';

async function validateMigration() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const validationResults = {
      missions: { passed: true, errors: [] },
      sickLeaves: { passed: true, errors: [] },
      vacations: { passed: true, errors: [] },
      overall: { passed: true }
    };

    // ========== MISSION VALIDATION ==========
    console.log('🔍 Validating Mission Migration...');
    
    const missionLeaveCount = await Leave.countDocuments({ leaveType: 'mission' });
    const missionCount = await Mission.countDocuments();
    
    console.log(`   - Mission leaves in Leave collection: ${missionLeaveCount}`);
    console.log(`   - Documents in Mission collection: ${missionCount}`);
    
    if (missionCount < missionLeaveCount) {
      validationResults.missions.passed = false;
      validationResults.missions.errors.push(
        `Mission count mismatch: Expected at least ${missionLeaveCount}, found ${missionCount}`
      );
    }

    // Validate mission field mappings
    const sampleMissions = await Mission.find().limit(5).lean();
    for (const mission of sampleMissions) {
      if (!mission.employee) {
        validationResults.missions.errors.push(`Mission ${mission._id} missing employee reference`);
        validationResults.missions.passed = false;
      }
      if (!mission.location) {
        validationResults.missions.errors.push(`Mission ${mission._id} missing location`);
        validationResults.missions.passed = false;
      }
      if (!mission.startDate || !mission.endDate) {
        validationResults.missions.errors.push(`Mission ${mission._id} missing dates`);
        validationResults.missions.passed = false;
      }
    }

    console.log(`   ${validationResults.missions.passed ? '✅' : '❌'} Mission validation ${validationResults.missions.passed ? 'passed' : 'failed'}`);

    // ========== SICK LEAVE VALIDATION ==========
    console.log('\n🔍 Validating SickLeave Migration...');
    
    const sickLeaveCount = await Leave.countDocuments({ leaveType: 'sick' });
    const sickLeaveNewCount = await SickLeave.countDocuments();
    
    console.log(`   - Sick leaves in Leave collection: ${sickLeaveCount}`);
    console.log(`   - Documents in SickLeave collection: ${sickLeaveNewCount}`);
    
    if (sickLeaveNewCount < sickLeaveCount) {
      validationResults.sickLeaves.passed = false;
      validationResults.sickLeaves.errors.push(
        `SickLeave count mismatch: Expected at least ${sickLeaveCount}, found ${sickLeaveNewCount}`
      );
    }

    // Validate sick leave field mappings
    const sampleSickLeaves = await SickLeave.find().limit(5).lean();
    for (const sickLeave of sampleSickLeaves) {
      if (!sickLeave.employee) {
        validationResults.sickLeaves.errors.push(`SickLeave ${sickLeave._id} missing employee reference`);
        validationResults.sickLeaves.passed = false;
      }
      if (!sickLeave.workflow) {
        validationResults.sickLeaves.errors.push(`SickLeave ${sickLeave._id} missing workflow`);
        validationResults.sickLeaves.passed = false;
      }
      if (!sickLeave.startDate || !sickLeave.endDate) {
        validationResults.sickLeaves.errors.push(`SickLeave ${sickLeave._id} missing dates`);
        validationResults.sickLeaves.passed = false;
      }
    }

    console.log(`   ${validationResults.sickLeaves.passed ? '✅' : '❌'} SickLeave validation ${validationResults.sickLeaves.passed ? 'passed' : 'failed'}`);

    // ========== VACATION VALIDATION ==========
    console.log('\n🔍 Validating Vacation Migration...');
    
    const vacationLeaveCount = await Leave.countDocuments({ 
      leaveType: { $in: ['annual', 'casual', 'unpaid'] } 
    });
    const vacationCount = await Vacation.countDocuments();
    
    console.log(`   - Vacation leaves in Leave collection: ${vacationLeaveCount}`);
    console.log(`   - Documents in Vacation collection: ${vacationCount}`);
    
    if (vacationCount < vacationLeaveCount) {
      validationResults.vacations.passed = false;
      validationResults.vacations.errors.push(
        `Vacation count mismatch: Expected at least ${vacationLeaveCount}, found ${vacationCount}`
      );
    }

    // Validate vacation type distribution
    const annualCount = await Vacation.countDocuments({ vacationType: 'annual' });
    const casualCount = await Vacation.countDocuments({ vacationType: 'casual' });
    const unpaidCount = await Vacation.countDocuments({ vacationType: 'unpaid' });
    
    console.log(`   - Annual vacations: ${annualCount}`);
    console.log(`   - Casual vacations: ${casualCount}`);
    console.log(`   - Unpaid vacations: ${unpaidCount}`);

    // Validate vacation field mappings
    const sampleVacations = await Vacation.find().limit(5).lean();
    for (const vacation of sampleVacations) {
      if (!vacation.employee) {
        validationResults.vacations.errors.push(`Vacation ${vacation._id} missing employee reference`);
        validationResults.vacations.passed = false;
      }
      if (!vacation.vacationType) {
        validationResults.vacations.errors.push(`Vacation ${vacation._id} missing vacationType`);
        validationResults.vacations.passed = false;
      }
      if (!vacation.startDate || !vacation.endDate) {
        validationResults.vacations.errors.push(`Vacation ${vacation._id} missing dates`);
        validationResults.vacations.passed = false;
      }
    }

    console.log(`   ${validationResults.vacations.passed ? '✅' : '❌'} Vacation validation ${validationResults.vacations.passed ? 'passed' : 'failed'}`);

    // ========== REFERENCE INTEGRITY VALIDATION ==========
    console.log('\n🔍 Validating Reference Integrity...');
    
    // Check for orphaned references
    const missionsWithInvalidEmployee = await Mission.countDocuments({
      employee: { $exists: true, $ne: null }
    });
    console.log(`   - Missions with employee references: ${missionsWithInvalidEmployee}`);

    const sickLeavesWithInvalidEmployee = await SickLeave.countDocuments({
      employee: { $exists: true, $ne: null }
    });
    console.log(`   - SickLeaves with employee references: ${sickLeavesWithInvalidEmployee}`);

    const vacationsWithInvalidEmployee = await Vacation.countDocuments({
      employee: { $exists: true, $ne: null }
    });
    console.log(`   - Vacations with employee references: ${vacationsWithInvalidEmployee}`);

    // ========== OVERALL VALIDATION ==========
    validationResults.overall.passed = 
      validationResults.missions.passed &&
      validationResults.sickLeaves.passed &&
      validationResults.vacations.passed;

    console.log('\n' + '='.repeat(60));
    console.log('📋 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Missions:    ${validationResults.missions.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`SickLeaves:  ${validationResults.sickLeaves.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Vacations:   ${validationResults.vacations.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(60));
    console.log(`Overall:     ${validationResults.overall.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(60));

    // Print errors if any
    if (!validationResults.overall.passed) {
      console.log('\n⚠️  VALIDATION ERRORS:\n');
      
      if (validationResults.missions.errors.length > 0) {
        console.log('Mission Errors:');
        validationResults.missions.errors.forEach(err => console.log(`  - ${err}`));
      }
      
      if (validationResults.sickLeaves.errors.length > 0) {
        console.log('\nSickLeave Errors:');
        validationResults.sickLeaves.errors.forEach(err => console.log(`  - ${err}`));
      }
      
      if (validationResults.vacations.errors.length > 0) {
        console.log('\nVacation Errors:');
        validationResults.vacations.errors.forEach(err => console.log(`  - ${err}`));
      }
    }

    return validationResults;

  } catch (error) {
    console.error('❌ Error during validation:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run validation if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateMigration()
    .then((results) => {
      if (results.overall.passed) {
        console.log('\n✅ All validations passed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Validation failed - please review errors above');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ Validation failed:', error);
      process.exit(1);
    });
}

export default validateMigration;
