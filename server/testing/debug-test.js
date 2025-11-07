import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MixedVacation from '../models/mixedVacation.model.js';
import User from '../models/user.model.js';
import School from '../models/school.model.js';
import { getActivePolicies } from '../controller/mixedVacation.controller.js';

let mongoServer;

// Simple mock function
function createMockResponse() {
  const res = {
    statusCalls: [],
    jsonCalls: [],
    status: function(code) {
      this.statusCalls.push(code);
      return this;
    },
    json: function(data) {
      this.jsonCalls.push(data);
      return this;
    }
  };
  return res;
}

async function runTest() {
  try {
    console.log('Starting debug test...');
    
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
    console.log('Created test user');
    
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
    
    // Test the controller function with our own mocks
    console.log('Testing getActivePolicies controller function with our mocks...');
    const req = {};
    const res = createMockResponse();
    
    console.log('About to call getActivePolicies');
    await getActivePolicies(req, res);
    console.log('Called getActivePolicies');
    
    console.log('Status calls:', res.statusCalls);
    console.log('JSON calls:', res.jsonCalls);
    
    if (res.statusCalls.length > 0) {
      console.log('Status code:', res.statusCalls[0]);
    }
    
    if (res.jsonCalls.length > 0) {
      console.log('JSON response:', res.jsonCalls[0]);
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