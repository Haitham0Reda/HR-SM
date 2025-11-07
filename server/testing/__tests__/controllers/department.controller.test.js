import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Department from '../../../models/department.model.js';
import { getAllDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment } from '../../../controller/department.controller.js';

// Import Jest globals explicitly for ES modules
import { jest } from '@jest/globals';

let mongoServer;
const app = express();
app.use(express.json());

// Mock routes for testing
app.get('/api/departments', getAllDepartments);
app.get('/api/departments/:id', getDepartmentById);
app.post('/api/departments', createDepartment);
app.put('/api/departments/:id', updateDepartment);
app.delete('/api/departments/:id', deleteDepartment);

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
        const res = await request(app).get('/api/departments');
        expect(res.status).toBe(200);
    });

    it('should handle errors appropriately', async () => {
        // Add your error handling test
    });
});