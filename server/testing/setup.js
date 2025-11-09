import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

// Connect to a MongoDB memory server before running tests
beforeAll(async () => {
  // Increase timeout for MongoDB Memory Server creation
  jest.setTimeout(30000);

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
    serverSelectionTimeoutMS: 3000,
    socketTimeoutMS: 10000,
  });
}, 30000);

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