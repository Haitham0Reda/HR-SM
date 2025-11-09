/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import User from '../../models/user.model.js';
import School from '../../models/school.model.js';
import Department from '../../models/department.model.js';
import Position from '../../models/position.model.js';
import * as userController from '../../controller/user.controller.js';

describe('User Controller - All 7 Functions', () => {
  let mockReq, mockRes, testSchool, testDepartment, testPosition, testUser;

  beforeEach(async () => {
    testSchool = await School.create({
      schoolCode: 'BUS',
      name: 'School of Business',
      arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
    });

    testDepartment = await Department.create({
      name: 'IT Department',
      arabicName: 'قسم تكنولوجيا المعلومات',
      code: 'IT001',
      school: testSchool._id
    });

    testPosition = await Position.create({
      title: 'Developer',
      arabicTitle: 'مطور',
      code: 'DEV001',
      department: testDepartment._id
    });

    testUser = await User.create({
      username: 'testuser',
      email: 'test@test.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id,
      department: testDepartment._id,
      position: testPosition._id,
      profile: {
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '1234567890',
        nationalID: '12345678901234',
        dateOfBirth: new Date('1990-01-01'),
        hireDate: new Date()
      }
    });

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: testUser._id }
    };

    mockRes = {
      statusCode: 200,
      responseData: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.responseData = data;
        return this;
      }
    };
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Position.deleteMany({});
    await Department.deleteMany({});
    await School.deleteMany({});
  });

  describe('1. getAllUsers', () => {
    it('should get all users successfully', async () => {
      await userController.getAllUsers(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(Array.isArray(mockRes.responseData)).toBe(true);
      expect(mockRes.responseData.length).toBeGreaterThan(0);
      expect(mockRes.responseData[0].password).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const originalFind = User.find;
      User.find = () => {
        throw new Error('Database error');
      };

      await userController.getAllUsers(mockReq, mockRes);
      expect(mockRes.statusCode).toBe(500);

      User.find = originalFind;
    });
  });

  describe('2. getUserById', () => {
    it('should get user by ID successfully', async () => {
      mockReq.params.id = testUser._id.toString();

      await userController.getUserById(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.responseData.username).toBe('testuser');
      expect(mockRes.responseData.password).toBeUndefined();
    });

    it('should return 404 for non-existent user', async () => {
      mockReq.params.id = new mongoose.Types.ObjectId().toString();

      await userController.getUserById(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(404);
      expect(mockRes.responseData.error).toBe('User not found');
    });

    it('should handle invalid ID format', async () => {
      mockReq.params.id = 'invalid-id';

      await userController.getUserById(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(500);
    });
  });

  describe('3. createUser', () => {
    it('should create a new user successfully', async () => {
      mockReq.body = {
        username: 'newuser',
        email: 'new@test.com',
        password: 'password123',
        role: 'employee',
        school: testSchool._id,
        department: testDepartment._id,
        position: testPosition._id,
        profile: {
          firstName: 'New',
          lastName: 'User',
          phoneNumber: '9876543210',
          nationalID: '98765432109876',
          dateOfBirth: new Date('1995-01-01'),
          hireDate: new Date()
        }
      };

      await userController.createUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(201);
      expect(mockRes.responseData.username).toBe('newuser');
      expect(mockRes.responseData.password).toBeUndefined();
    });

    it('should reject missing username', async () => {
      mockReq.body = {
        email: 'new@test.com',
        password: 'password123',
        school: testSchool._id
      };

      await userController.createUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.responseData.error).toContain('Username is required');
    });

    it('should reject missing email', async () => {
      mockReq.body = {
        username: 'newuser',
        password: 'password123',
        school: testSchool._id
      };

      await userController.createUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.responseData.error).toContain('Email is required');
    });

    it('should reject missing password', async () => {
      mockReq.body = {
        username: 'newuser',
        email: 'new@test.com',
        school: testSchool._id
      };

      await userController.createUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.responseData.error).toContain('Password is required');
    });

    it('should reject duplicate email', async () => {
      mockReq.body = {
        username: 'differentuser',
        email: 'test@test.com', // Already exists
        password: 'password123',
        school: testSchool._id
      };

      await userController.createUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(409);
      expect(mockRes.responseData.error).toContain('already exists');
    });

    it('should reject duplicate username', async () => {
      mockReq.body = {
        username: 'testuser', // Already exists
        email: 'different@test.com',
        password: 'password123',
        school: testSchool._id
      };

      await userController.createUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(409);
      expect(mockRes.responseData.error).toContain('already exists');
    });

    it('should reject invalid role', async () => {
      mockReq.body = {
        username: 'newuser',
        email: 'new@test.com',
        password: 'password123',
        role: 'invalid-role',
        school: testSchool._id
      };

      await userController.createUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.responseData.error).toContain('Invalid role');
    });
  });

  describe('4. updateUser', () => {
    it('should update user successfully', async () => {
      mockReq.params.id = testUser._id.toString();
      mockReq.body = {
        profile: {
          firstName: 'Updated',
          lastName: 'Name'
        }
      };

      await userController.updateUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.responseData.profile.firstName).toBe('Updated');
    });

    it('should return 404 for non-existent user', async () => {
      mockReq.params.id = new mongoose.Types.ObjectId().toString();
      mockReq.body = { profile: { firstName: 'Test' } };

      await userController.updateUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(404);
    });

    it('should reject duplicate email on update', async () => {
      const anotherUser = await User.create({
        username: 'another',
        email: 'another@test.com',
        password: 'password123',
        school: testSchool._id,
        role: 'employee'
      });

      mockReq.params.id = testUser._id.toString();
      mockReq.body = { email: 'another@test.com' };

      await userController.updateUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(409);

      await User.findByIdAndDelete(anotherUser._id);
    });

    it('should reject invalid role on update', async () => {
      mockReq.params.id = testUser._id.toString();
      mockReq.body = { role: 'invalid-role' };

      await userController.updateUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(400);
    });
  });

  describe('5. deleteUser', () => {
    it('should delete user successfully', async () => {
      mockReq.params.id = testUser._id.toString();

      await userController.deleteUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.responseData.message).toBe('User deleted');

      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      mockReq.params.id = new mongoose.Types.ObjectId().toString();

      await userController.deleteUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(404);
    });

    it('should handle database errors', async () => {
      mockReq.params.id = 'invalid-id';

      await userController.deleteUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(500);
    });
  });

  describe('6. loginUser', () => {
    it('should login successfully with valid credentials', async () => {
      mockReq.body = {
        email: 'test@test.com',
        password: 'password123',
        role: 'employee'
      };

      await userController.loginUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.responseData.token).toBeDefined();
      expect(mockRes.responseData.user.password).toBeUndefined();
    });

    it('should reject missing email', async () => {
      mockReq.body = {
        password: 'password123',
        role: 'employee'
      };

      await userController.loginUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.responseData.error).toContain('required');
    });

    it('should reject missing password', async () => {
      mockReq.body = {
        email: 'test@test.com',
        role: 'employee'
      };

      await userController.loginUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(400);
    });

    it('should reject missing role', async () => {
      mockReq.body = {
        email: 'test@test.com',
        password: 'password123'
      };

      await userController.loginUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(400);
    });

    it('should reject invalid email', async () => {
      mockReq.body = {
        email: 'wrong@test.com',
        password: 'password123',
        role: 'employee'
      };

      await userController.loginUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(401);
    });

    it('should reject invalid password', async () => {
      mockReq.body = {
        email: 'test@test.com',
        password: 'wrongpassword',
        role: 'employee'
      };

      await userController.loginUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(401);
    });

    it('should reject role mismatch', async () => {
      mockReq.body = {
        email: 'test@test.com',
        password: 'password123',
        role: 'admin' // User is employee
      };

      await userController.loginUser(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(403);
    });
  });

  describe('7. getUserProfile', () => {
    it('should get current user profile successfully', async () => {
      await userController.getUserProfile(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.responseData.username).toBe('testuser');
      expect(mockRes.responseData.password).toBeUndefined();
    });

    it('should return 404 if user not found', async () => {
      mockReq.user.id = new mongoose.Types.ObjectId();

      await userController.getUserProfile(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(404);
    });

    it('should handle database errors', async () => {
      mockReq.user.id = 'invalid-id';

      await userController.getUserProfile(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(500);
    });
  });
});