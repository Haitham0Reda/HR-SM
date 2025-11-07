import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../../models/user.model.js';

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

describe('User Model', () => {
    beforeEach(async () => {
        // Clear database before each test
        await User.deleteMany({});
    });

    it('should create and save a User successfully', async () => {
        // First create a school since it's required
        const School = mongoose.model('School', new mongoose.Schema({
            schoolCode: String,
            name: String,
            arabicName: String
        }));
        
        const school = await School.create({
            schoolCode: 'ENG',
            name: 'School of Engineering',
            arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
        });

        const userData = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            school: school._id
        };

        const user = new User(userData);
        const savedUser = await user.save();
        
        expect(savedUser).toBeDefined();
        expect(savedUser._id).toBeDefined();
        expect(savedUser.username).toBe(userData.username);
        expect(savedUser.email).toBe(userData.email);
        // Add more assertions based on your model fields
    });

    it('should fail to create user without required fields', async () => {
        const user = new User();
        let err;
        
        try {
            await user.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).toBeDefined();
        expect(err.name).toBe('ValidationError');
    });
});