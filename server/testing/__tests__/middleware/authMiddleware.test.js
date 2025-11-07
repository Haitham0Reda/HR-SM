import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../../../models/user.model.js';
import { protect, admin, hrOrAdmin } from '../../../middleware/authMiddleware.js';

// Import Jest globals explicitly for ES modules
import { jest } from '@jest/globals';

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('AuthMiddleware Middleware', () => {
    beforeEach(async () => {
        // Clear database before each test
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    });

    it('should have protect function defined', () => {
        expect(protect).toBeDefined();
        expect(typeof protect).toBe('function');
    });

    it('should have admin function defined', () => {
        expect(admin).toBeDefined();
        expect(typeof admin).toBe('function');
    });

    it('should have hrOrAdmin function defined', () => {
        expect(hrOrAdmin).toBeDefined();
        expect(typeof hrOrAdmin).toBe('function');
    });
});