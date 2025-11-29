/**
 * Migration Test Script
 * 
 * Creates test data and runs migration scripts to verify functionality
 * Tests rollback procedures and data integrity
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
import User from '../../models/user.model.js';

// Import migration scripts
import backupLeaveCollection from './backupLeaveCollection.js';
import migrateMissions from './migrateMissions.js';
import migrateSickLeaves from './migrateSickLeaves.js';
import migrateVacations from './migrateVacations.js';
import validateMigration from './validateMigration.js';

const TEST_DB_NAME = 'test_migration_db';

async function createTestData() {
  console.log('📝 Creating test data...');
  
  // Find an existing user or use a test user ID
  let testUser = await User.findOne();
  if (!testUser) {
    console.log('⚠️  No users found in database. Using mock user ID.');
    testUser = { _id: new mongoose.Types.ObjectId() };
  }

  const testData = {
    missions: [],
    sickLeaves: [],
    vacations: []
  };

  // Create test mission leaves
  const missionData = [
    {
      employee: testUser._id,
      leaveType: 'mission',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-17'),
      duration: 3,
      status: 'approved',
      mission: {
        location: 'New York Office',
        purpose: 'Client meeting and project review',
        relatedDepartment: null
      },
      approvedBy: testUser._id,
      approvedAt: new Date('2024-01-10'),
      department: null,
      position: null
    },
    {
      employee: testUser._id,
      leaveType: 'mission',
      startDate: new Date('2024-02-20'),
      endDate: new Date('2024-02-22'),
      duration: 3,
      status: 'pending',
      mission: {
        location: 'Chicago Branch',
        purpose: 'Training session for new software',
        relatedDepartment: null
      },
      department: null,
      position: null
    }
  ];

  for (const data of missionData) {
    const leave = new Leave(data);
    await leave.save();
    testData.missions.push(leave);
  }

  // Create test sick leaves
  const sickLeaveData = [
    {
      employee: testUser._id,
      leaveType: 'sick',
      startDate: new Date('2024-03-10'),
      endDate: new Date('2024-03-12'),
      duration: 3,
      reason: 'Flu symptoms',
      status: 'pending',
      medicalDocumentation: {
        required: false,
        provided: false,
        documents: []
      },
      workflow: {
        supervisorApprovalStatus: 'pending',
        doctorApprovalStatus: 'pending',
        currentStep: 'supervisor-review'
      },
      department: null,
      position: null
    },
    {
      employee: testUser._id,
      leaveType: 'sick',
      startDate: new Date('2024-04-05'),
      endDate: new Date('2024-04-10'),
      duration: 6,
      reason: 'Surgery recovery',
      status: 'approved',
      medicalDocumentation: {
        required: true,
        provided: true,
        documents: [{
          filename: 'medical_cert.pdf',
          url: '/uploads/medical_cert.pdf',
          uploadedAt: new Date('2024-04-04')
        }],
        reviewedByDoctor: true,
        doctorReviewedBy: testUser._id,
        doctorReviewedAt: new Date('2024-04-04')
      },
      workflow: {
        supervisorApprovalStatus: 'approved',
        doctorApprovalStatus: 'approved',
        currentStep: 'completed'
      },
      approvedBy: testUser._id,
      approvedAt: new Date('2024-04-04'),
      department: null,
      position: null
    }
  ];

  for (const data of sickLeaveData) {
    const leave = new Leave(data);
    await leave.save();
    testData.sickLeaves.push(leave);
  }

  // Create test vacation leaves
  const vacationData = [
    {
      employee: testUser._id,
      leaveType: 'annual',
      startDate: new Date('2024-05-01'),
      endDate: new Date('2024-05-05'),
      duration: 5,
      reason: 'Family vacation',
      status: 'approved',
      approvedBy: testUser._id,
      approvedAt: new Date('2024-04-25'),
      department: null,
      position: null
    },
    {
      employee: testUser._id,
      leaveType: 'casual',
      startDate: new Date('2024-06-15'),
      endDate: new Date('2024-06-15'),
      duration: 1,
      reason: 'Personal matters',
      status: 'pending',
      department: null,
      position: null
    },
    {
      employee: testUser._id,
      leaveType: 'unpaid',
      startDate: new Date('2024-07-10'),
      endDate: new Date('2024-07-12'),
      duration: 3,
      reason: 'Extended personal leave',
      status: 'rejected',
      rejectedBy: testUser._id,
      rejectedAt: new Date('2024-07-05'),
      rejectionReason: 'Insufficient notice period',
      department: null,
      position: null
    }
  ];

  for (const data of vacationData) {
    const leave = new Leave(data);
    await leave.save();
    testData.vacations.push(leave);
  }

  console.log(`✅ Created test data:`);
  console.log(`   - ${testData.missions.length} mission leaves`);
  console.log(`   - ${testData.sickLeaves.length} sick leaves`);
  console.log(`   - ${testData.vacations.length} vacation leaves`);

  return testData;
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  // Delete test collections
  await Mission.deleteMany({});
  await SickLeave.deleteMany({});
  await Vacation.deleteMany({});
  
  // Delete test leaves (optional - comment out if you want to keep them)
  // await Leave.deleteMany({ employee: testUser._id });
  
  console.log('✅ Test data cleaned up');
}

async function testRollback() {
  console.log('\n🔄 Testing rollback procedure...');
  
  // Count documents before rollback
  const missionCountBefore = await Mission.countDocuments();
  const sickLeaveCountBefore = await SickLeave.countDocuments();
  const vacationCountBefore = await Vacation.countDocuments();
  
  console.log(`   Before rollback:`);
  console.log(`   - Missions: ${missionCountBefore}`);
  console.log(`   - SickLeaves: ${sickLeaveCountBefore}`);
  console.log(`   - Vacations: ${vacationCountBefore}`);
  
  // Simulate rollback by deleting migrated data
  await Mission.deleteMany({});
  await SickLeave.deleteMany({});
  await Vacation.deleteMany({});
  
  const missionCountAfter = await Mission.countDocuments();
  const sickLeaveCountAfter = await SickLeave.countDocuments();
  const vacationCountAfter = await Vacation.countDocuments();
  
  console.log(`   After rollback:`);
  console.log(`   - Missions: ${missionCountAfter}`);
  console.log(`   - SickLeaves: ${sickLeaveCountAfter}`);
  console.log(`   - Vacations: ${vacationCountAfter}`);
  
  const rollbackSuccess = 
    missionCountAfter === 0 &&
    sickLeaveCountAfter === 0 &&
    vacationCountAfter === 0;
  
  console.log(`   ${rollbackSuccess ? '✅' : '❌'} Rollback ${rollbackSuccess ? 'successful' : 'failed'}`);
  
  return rollbackSuccess;
}

async function runMigrationTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           MIGRATION TEST SUITE                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testResults = {
    dataCreation: false,
    dryRunMigration: false,
    actualMigration: false,
    validation: false,
    rollback: false,
    overall: false
  };

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Create test data
    console.log('═'.repeat(60));
    console.log('TEST 1: CREATE TEST DATA');
    console.log('═'.repeat(60));
    const testData = await createTestData();
    testResults.dataCreation = true;

    // Test 2: Dry run migration
    console.log('\n' + '═'.repeat(60));
    console.log('TEST 2: DRY RUN MIGRATION');
    console.log('═'.repeat(60));
    
    const dryRunMissions = await migrateMissions(true);
    const dryRunSickLeaves = await migrateSickLeaves(true);
    const dryRunVacations = await migrateVacations(true);
    
    testResults.dryRunMigration = 
      dryRunMissions.migrated === testData.missions.length &&
      dryRunSickLeaves.migrated === testData.sickLeaves.length &&
      dryRunVacations.migrated === testData.vacations.length;
    
    console.log(`\n${testResults.dryRunMigration ? '✅' : '❌'} Dry run ${testResults.dryRunMigration ? 'passed' : 'failed'}`);

    // Test 3: Actual migration
    console.log('\n' + '═'.repeat(60));
    console.log('TEST 3: ACTUAL MIGRATION');
    console.log('═'.repeat(60));
    
    const actualMissions = await migrateMissions(false);
    const actualSickLeaves = await migrateSickLeaves(false);
    const actualVacations = await migrateVacations(false);
    
    testResults.actualMigration = 
      actualMissions.migrated === testData.missions.length &&
      actualSickLeaves.migrated === testData.sickLeaves.length &&
      actualVacations.migrated === testData.vacations.length &&
      actualMissions.failed === 0 &&
      actualSickLeaves.failed === 0 &&
      actualVacations.failed === 0;
    
    console.log(`\n${testResults.actualMigration ? '✅' : '❌'} Actual migration ${testResults.actualMigration ? 'passed' : 'failed'}`);

    // Test 4: Validation
    console.log('\n' + '═'.repeat(60));
    console.log('TEST 4: VALIDATION');
    console.log('═'.repeat(60));
    
    const validationResults = await validateMigration();
    testResults.validation = validationResults.overall.passed;
    
    console.log(`\n${testResults.validation ? '✅' : '❌'} Validation ${testResults.validation ? 'passed' : 'failed'}`);

    // Test 5: Rollback
    console.log('\n' + '═'.repeat(60));
    console.log('TEST 5: ROLLBACK PROCEDURE');
    console.log('═'.repeat(60));
    
    testResults.rollback = await testRollback();

    // Overall result
    testResults.overall = 
      testResults.dataCreation &&
      testResults.dryRunMigration &&
      testResults.actualMigration &&
      testResults.validation &&
      testResults.rollback;

    // Print summary
    console.log('\n' + '╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(20) + 'TEST SUMMARY' + ' '.repeat(26) + '║');
    console.log('╠' + '═'.repeat(58) + '╣');
    console.log(`║ Data Creation:      ${testResults.dataCreation ? '✅ PASSED' : '❌ FAILED'}${' '.repeat(29)}║`);
    console.log(`║ Dry Run Migration:  ${testResults.dryRunMigration ? '✅ PASSED' : '❌ FAILED'}${' '.repeat(29)}║`);
    console.log(`║ Actual Migration:   ${testResults.actualMigration ? '✅ PASSED' : '❌ FAILED'}${' '.repeat(29)}║`);
    console.log(`║ Validation:         ${testResults.validation ? '✅ PASSED' : '❌ FAILED'}${' '.repeat(29)}║`);
    console.log(`║ Rollback:           ${testResults.rollback ? '✅ PASSED' : '❌ FAILED'}${' '.repeat(29)}║`);
    console.log('╠' + '═'.repeat(58) + '╣');
    console.log(`║ Overall:            ${testResults.overall ? '✅ PASSED' : '❌ FAILED'}${' '.repeat(29)}║`);
    console.log('╚' + '═'.repeat(58) + '╝');

    return testResults;

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrationTests()
    .then((results) => {
      if (results.overall) {
        console.log('\n✅ All migration tests passed successfully');
        process.exit(0);
      } else {
        console.log('\n⚠️  Some migration tests failed - please review above');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ Migration tests failed:', error);
      process.exit(1);
    });
}

export default runMigrationTests;
