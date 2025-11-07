import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../../models/user.model.js';
import School from '../../../models/school.model.js';
import { 
  loginUser, 
  getUserProfile,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../../../controller/user.controller.js';

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

describe('User Controller', () => {
  let testUser;
  let testSchool;

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await School.deleteMany({});

    // Create test school with valid enum values according to School model
    // Check if school already exists to avoid duplicate key errors
    testSchool = await School.findOne({ schoolCode: 'BUS' });
    if (!testSchool) {
      testSchool = new School({
        name: 'School of Business',
        schoolCode: 'BUS',
        arabicName: 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر'
      });
      await testSchool.save();
    }

    // Create test user with required school field
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'employee',
      school: testSchool._id
    };

    testUser = new User(userData);
    await testUser.save();
  });

  describe('loginUser', () => {
    it('should login user with valid credentials', async () => {
      // Create a mock user object with the matchPassword method
      const mockUser = {
        ...testUser.toObject(),
        matchPassword: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(testUser),
        save: jest.fn().mockResolvedValue()
      };

      // Mock the User.findOne.populate chain to avoid Schema errors
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockResolvedValue(mockUser)
        };
      });

      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
          role: 'employee'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await loginUser(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.token).toBeDefined();
      expect(response.user).toBeDefined();
      expect(response.user.username).toBe('testuser');
      expect(response.user.password).toBeUndefined();

      // Restore the original implementation
      User.findOne = originalFindOne;
    });

    it('should reject login with invalid credentials', async () => {
      // Create a mock user object with the matchPassword method
      const mockUser = {
        ...testUser.toObject(),
        matchPassword: jest.fn().mockResolvedValue(false), // Return false for invalid password
        populate: jest.fn().mockResolvedValue(testUser),
        save: jest.fn().mockResolvedValue()
      };

      // Mock the User.findOne.populate chain to avoid Schema errors
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockResolvedValue(mockUser)
        };
      });

      const req = {
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
          role: 'employee'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();

      // Restore the original implementation
      User.findOne = originalFindOne;
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile when authenticated', async () => {
      // Mock the User.findById.populate chain to avoid Schema errors
      const originalFindById = User.findById;
      User.findById = jest.fn().mockImplementation(() => {
        return {
          populate: jest.fn().mockResolvedValue(testUser)
        };
      });

      const req = {
        user: {
          id: testUser._id
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getUserProfile(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Status is not explicitly called
      const response = res.json.mock.calls[0][0];
      expect(response.username).toBe('testuser');
      expect(response.email).toBe('test@example.com');
      expect(response.password).toBeUndefined();

      // Restore the original implementation
      User.findById = originalFindById;
    });
  });

  describe('getAllUsers', () => {
    it('should get all users', async () => {
      // Create a mock query object that simulates the Mongoose query chain
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([testUser])
      };

      // Mock User.find to return the mock query object
      const originalFind = User.find;
      User.find = jest.fn().mockReturnValue(mockQuery);

      const req = {};
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllUsers(req, res);

      // Controller uses res.json() directly for success, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(500); // Should not be an error
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
      expect(response).toHaveLength(1);
      expect(response[0].username).toBe('testuser');

      // Restore the original implementation
      User.find = originalFind;
    });
  });

  describe('getUserById', () => {
    it('should get user by ID', async () => {
      // Create a mock query object that simulates the Mongoose query chain
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(testUser)
      };

      // Mock User.findById to return the mock query object
      const originalFindById = User.findById;
      User.findById = jest.fn().mockReturnValue(mockQuery);

      const req = {
        params: {
          id: testUser._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getUserById(req, res);

      // Controller uses res.json() directly for success, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(500); // Should not be an error
      const response = res.json.mock.calls[0][0];
      expect(response.username).toBe('testuser');
      expect(response.email).toBe('test@example.com');
      expect(response.password).toBeUndefined();

      // Restore the original implementation
      User.findById = originalFindById;
    });

    it('should return 404 when user not found', async () => {
      // Create a mock query object that simulates the Mongoose query chain
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      };

      // Mock User.findById to return the mock query object
      const originalFindById = User.findById;
      User.findById = jest.fn().mockReturnValue(mockQuery);

      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('User not found');

      // Restore the original implementation
      User.findById = originalFindById;
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      // Mock User.findOne to return null (no existing user)
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockResolvedValue(null);

      // Mock new User.save to return the user
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'employee',
        school: testSchool._id
      };

      const newUser = new User(userData);
      newUser._id = new mongoose.Types.ObjectId();
      newUser.save = jest.fn().mockResolvedValue(newUser);

      // Mock the User constructor to return our mock user
      const originalUser = User;
      User.mockImplementation = jest.fn().mockImplementation(() => newUser);

      const req = {
        body: userData
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.username).toBe('newuser');
      expect(response.email).toBe('newuser@example.com');
      expect(response.password).toBeUndefined();

      // Restore the original implementation
      User.findOne = originalFindOne;
      User.mockImplementation = originalUser.mockImplementation;
    });

    it('should reject creation with invalid data', async () => {
      const req = {
        body: {
          // Missing required fields
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBeDefined();
    });

    it('should reject creation with duplicate username or email', async () => {
      // Mock User.findOne to return existing user
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockResolvedValue(testUser);

      const req = {
        body: {
          username: 'testuser', // Same as existing user
          email: 'test@example.com', // Same as existing user
          password: 'password123',
          role: 'employee',
          school: testSchool._id
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Username or email already exists');

      // Restore the original implementation
      User.findOne = originalFindOne;
    });
  });

  describe('updateUser', () => {
    it('should update an existing user', async () => {
      // Create a mock query object that simulates the Mongoose query chain
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...testUser.toObject(),
          username: 'updateduser',
          email: 'updated@example.com'
        })
      };

      // Mock User.findByIdAndUpdate to return the mock query object
      const originalFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = jest.fn().mockReturnValue(mockQuery);

      const req = {
        params: {
          id: testUser._id.toString()
        },
        body: {
          username: 'updateduser',
          email: 'updated@example.com'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateUser(req, res);

      // Controller uses res.json() directly for success, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(500); // Should not be an error
      const response = res.json.mock.calls[0][0];
      expect(response.username).toBe('updateduser');
      expect(response.email).toBe('updated@example.com');
      expect(response.password).toBeUndefined();

      // Restore the original implementation
      User.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should return 404 when updating non-existent user', async () => {
      // Create a mock query object that simulates the Mongoose query chain
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      };

      // Mock User.findByIdAndUpdate to return the mock query object
      const originalFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = jest.fn().mockReturnValue(mockQuery);

      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        },
        body: {
          username: 'updateduser'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('User not found');

      // Restore the original implementation
      User.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('should reject update with invalid data', async () => {
      const req = {
        params: {
          id: testUser._id.toString()
        },
        body: {
          role: 'invalid-role' // Invalid role
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBeDefined();
    });

    it('should reject update with duplicate username or email', async () => {
      // Create another user
      const anotherUser = new User({
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'password123',
        role: 'employee',
        school: testSchool._id
      });
      await anotherUser.save();

      // Mock User.findOne to return existing user (conflict)
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockResolvedValue(anotherUser);

      const req = {
        params: {
          id: testUser._id.toString()
        },
        body: {
          username: 'anotheruser', // Same as another user
          email: 'another@example.com' // Same as another user
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Username or email already exists');

      // Restore the original implementation
      User.findOne = originalFindOne;
    });
  });

  describe('deleteUser', () => {
    it('should delete an existing user', async () => {
      // Mock User.findByIdAndDelete to return the user
      const originalFindByIdAndDelete = User.findByIdAndDelete;
      User.findByIdAndDelete = jest.fn().mockResolvedValue(testUser);

      const req = {
        params: {
          id: testUser._id.toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteUser(req, res);

      // Controller uses res.json() directly, not res.status(200).json()
      expect(res.json).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(500); // Should not be an error
      const response = res.json.mock.calls[0][0];
      expect(response.message).toBe('User deleted');

      // Restore the original implementation
      User.findByIdAndDelete = originalFindByIdAndDelete;
    });

    it('should return 404 when deleting non-existent user', async () => {
      // Mock User.findByIdAndDelete to return null
      const originalFindByIdAndDelete = User.findByIdAndDelete;
      User.findByIdAndDelete = jest.fn().mockResolvedValue(null);

      const req = {
        params: {
          id: new mongoose.Types.ObjectId().toString()
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('User not found');

      // Restore the original implementation
      User.findByIdAndDelete = originalFindByIdAndDelete;
    });
  });
});