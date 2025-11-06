import request from 'supertest';
import express from 'express';
import * as department from '../../server/controller/department.controller.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;
const app = express();
app.use(express.json());

// Mock routes for testing
// Add your controller routes here
// app.get('/api/test', department.getAllDepartments);

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Department Controller', () => {
    beforeEach(async () => {
        // Clear database before each test
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    });

    it('should return 200 for successful request', async () => {
        // Add your test implementation
        // const res = await request(app).get('/api/test');
        // expect(res.status).toBe(200);
    });

    it('should handle errors appropriately', async () => {
        // Add your error handling test
    });
});