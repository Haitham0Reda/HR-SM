import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MixedVacation from '../models/mixedVacation.model.js';
import User from '../models/user.model.js';
import School from '../models/school.model.js';
import VacationBalance from '../models/vacationBalance.model.js';

let mongoServer;

async function runTest() {
  try {
    console.log('Starting debug model test...');
    
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Create test school
    const testSchool = new School({
      name: 'School of Business',
      schoolCode: 'BUS',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    });
    await testSchool.save();
    console.log('Created test school');
    
    // Create test user
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
      school: testSchool._id
    });
    await testUser.save();
    console.log('Created test user with ID:', testUser._id);
    
    // Create vacation balance for the test user
    const testBalance = new VacationBalance({
      employee: testUser._id,
      year: new Date().getFullYear(),
      annual: {
        allocated: 21,
        used: 0,
        pending: 0,
        available: 21,
        carriedOver: 0
      },
      casual: {
        allocated: 7,
        used: 0,
        pending: 0,
        available: 7
      },
      sick: {
        allocated: 10,
        used: 0,
        pending: 0,
        available: 10
      },
      eligibility: {
        isEligible: true,
        eligibleFrom: new Date(),
        probationEnds: new Date(),
        tenure: 1
      }
    });
    await testBalance.save();
    console.log('Created vacation balance for employee:', testBalance.employee);
    
    // Create test policy
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 10);
    
    const testPolicy = new MixedVacation({
      name: 'Test Policy',
      description: 'Test policy description',
      startDate: startDate,
      endDate: endDate,
      totalDays: 10,
      personalDaysRequired: 5,
      createdBy: testUser._id,
      status: 'active' // Make it active
    });
    await testPolicy.save();
    console.log('Created test policy with status:', testPolicy.status);
    
    // Test the applyToEmployee method directly
    console.log('Testing applyToEmployee method directly...');
    try {
      const result = await testPolicy.applyToEmployee(testUser._id, testUser._id);
      console.log('applyToEmployee succeeded:', result);
    } catch (error) {
      console.error('applyToEmployee failed with error:', error);
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Cleanup
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('Test completed');
  }
}

runTest();