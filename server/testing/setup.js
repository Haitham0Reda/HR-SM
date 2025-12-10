import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

// Set up environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-min-32-characters-long';
process.env.TENANT_JWT_SECRET = 'test-tenant-jwt-secret-for-testing-only-min-32-characters-long';
process.env.PLATFORM_JWT_SECRET = 'test-platform-jwt-secret-for-testing-only-min-32-characters-long';
process.env.NODE_ENV = 'test';

// Connect to a MongoDB memory server before running tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      storageEngine: 'ephemeralForTest',
    },
    binary: {
      version: '6.0.0',
    },
  });
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
  });
}, 60000);

// Clear all test data after each test (optimized)
afterEach(async () => {
  // Only clear if there are collections
  if (mongoose.connection.readyState === 1) {
    const collections = Object.keys(mongoose.connection.collections);
    await Promise.all(
      collections.map(key =>
        mongoose.connection.collections[key].deleteMany({})
      )
    );
  }
});

// Disconnect from the MongoDB memory server after all tests are done
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close(true);
  }
  if (mongoServer) {
    await mongoServer.stop({ doCleanup: false });
  }
}, 10000);

// Export mongoServer for use in individual test files if needed
export { mongoServer };