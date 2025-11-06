// jest.setup.js
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

// Mock MongoDB connection for tests
process.env.MONGO_URI = 'mongodb://localhost:27017/hrsm_test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.PORT = '5001';