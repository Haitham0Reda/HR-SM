import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Department from '../../server/models/department.model.js';

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

describe('Department Model', () => {
    beforeEach(async () => {
        // Clear database before each test
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    });

    it('should create and save a Department successfully', async () => {
        const departmentData = {
            name: 'Engineering',
            code: 'ENG',
            school: new mongoose.Types.ObjectId()
        };

        const department = new Department(departmentData);
        const savedDepartment = await department.save();
        
        expect(savedDepartment).toBeDefined();
        expect(savedDepartment._id).toBeDefined();
        expect(savedDepartment.name).toBe(departmentData.name);
        expect(savedDepartment.code).toBe(departmentData.code);
        expect(savedDepartment.school).toEqual(departmentData.school);
        expect(savedDepartment.isActive).toBe(true); // Default value
    });

    it('should fail to create department without required fields', async () => {
        const department = new Department();
        let err;
        
        try {
            await department.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).toBeDefined();
        expect(err.name).toBe('ValidationError');
    });

    it('should require unique department code', async () => {
        const departmentData1 = {
            name: 'Engineering',
            code: 'ENG',
            school: new mongoose.Types.ObjectId()
        };
        
        const departmentData2 = {
            name: 'English',
            code: 'ENG', // Same code
            school: new mongoose.Types.ObjectId()
        };
        
        // Create first department
        await new Department(departmentData1).save();
        
        // Try to create second department with same code
        let err;
        try {
            await new Department(departmentData2).save();
        } catch (error) {
            err = error;
        }
        
        expect(err).toBeDefined();
        expect(err.name).toBe('MongoServerError');
    });
});