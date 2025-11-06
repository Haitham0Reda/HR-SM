import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../server/models/user.model.js';

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
  afterEach(async () => {
    await User.deleteMany({});
  });

  it('should create a user with required fields', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'employee',
      school: new mongoose.Types.ObjectId()
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser.username).toBe(userData.username);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.role).toBe(userData.role);
    expect(savedUser.school.toString()).toBe(userData.school.toString());
    expect(savedUser._id).toBeDefined();
    expect(savedUser.createdAt).toBeDefined();
    expect(savedUser.updatedAt).toBeDefined();
  });

  it('should hash the password before saving', async () => {
    const userData = {
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123',
      role: 'employee',
      school: new mongoose.Types.ObjectId()
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser.password).not.toBe(userData.password);
    const isMatch = await savedUser.matchPassword(userData.password);
    expect(isMatch).toBe(true);
  });

  it('should fail to create user without required fields', async () => {
    const userData = {
      username: 'testuser'
      // Missing email, password, school
    };

    const user = new User(userData);
    
    await expect(user.save()).rejects.toThrow();
  });
});