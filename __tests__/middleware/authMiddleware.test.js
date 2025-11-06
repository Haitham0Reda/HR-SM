import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as authMiddleware from '../../server/middleware/authMiddleware.js';

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
        expect(authMiddleware.protect).toBeDefined();
        expect(typeof authMiddleware.protect).toBe('function');
    });

    it('should have admin function defined', () => {
        expect(authMiddleware.admin).toBeDefined();
        expect(typeof authMiddleware.admin).toBe('function');
    });

    it('should have hrOrAdmin function defined', () => {
        expect(authMiddleware.hrOrAdmin).toBeDefined();
        expect(typeof authMiddleware.hrOrAdmin).toBe('function');
    });
});