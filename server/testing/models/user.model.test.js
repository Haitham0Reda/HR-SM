import mongoose from 'mongoose';
import User from '../../models/user.model.js';
import bcrypt from 'bcryptjs';

describe('User Model', () => {
  it('should create and save a user successfully', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
      role: 'employee',
      school: new mongoose.Types.ObjectId(),
      profile: {
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890'
      }
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.username).toBe(userData.username);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.role).toBe(userData.role);
    expect(savedUser.profile.firstName).toBe(userData.profile.firstName);
    expect(savedUser.profile.lastName).toBe(userData.profile.lastName);
    expect(savedUser.profile.phone).toBe(userData.profile.phone);
    // Password should be hashed
    expect(savedUser.password).not.toBe(userData.password);
  });

  it('should fail to create a user without required fields', async () => {
    const userData = {
      profile: {
        firstName: 'Test'
      }
    };

    const user = new User(userData);

    let err;
    try {
      await user.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.username).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
  });

  it('should hash user password before saving', async () => {
    const userData = {
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'Password123!',
      school: new mongoose.Types.ObjectId()
    };

    const user = new User(userData);
    const savedUser = await user.save();

    // Check that password is hashed
    const isMatch = await bcrypt.compare('Password123!', savedUser.password);
    expect(isMatch).toBe(true);
    expect(savedUser.password).not.toBe(userData.password);
  });

  it('should generate employeeId for new users', async () => {
    const userData = {
      username: 'testuser3',
      email: 'test3@example.com',
      password: 'Password123!',
      school: new mongoose.Types.ObjectId()
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser.employeeId).toBeDefined();
    expect(savedUser.employeeId).toMatch(/^EMID-\d{4}$/);
  });

  it('should compare password correctly', async () => {
    const userData = {
      username: 'testuser4',
      email: 'test4@example.com',
      password: 'Password123!',
      school: new mongoose.Types.ObjectId()
    };

    const user = new User(userData);
    const savedUser = await user.save();

    const isMatch = await savedUser.matchPassword('Password123!');
    expect(isMatch).toBe(true);

    const isNotMatch = await savedUser.matchPassword('WrongPassword');
    expect(isNotMatch).toBe(false);
  });
});

describe('User Model Methods', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      username: 'methodtest',
      email: 'methodtest@example.com',
      password: 'Password123!',
      role: 'employee',
      school: new mongoose.Types.ObjectId(),
      profile: {
        firstName: 'Method',
        lastName: 'Test'
      }
    });
  });

  afterEach(async () => {
    await User.deleteOne({ _id: testUser._id });
  });

  it('should have matchPassword method', () => {
    expect(typeof testUser.matchPassword).toBe('function');
  });

  it('should have getEffectivePermissions method', () => {
    expect(typeof testUser.getEffectivePermissions).toBe('function');
  });

  it('should execute getEffectivePermissions', async () => {
    const permissions = await testUser.getEffectivePermissions();
    expect(Array.isArray(permissions)).toBe(true);
  });

  it('should have hasPermission method', () => {
    expect(typeof testUser.hasPermission).toBe('function');
  });

  it('should execute hasPermission', async () => {
    const result = await testUser.hasPermission('view-dashboard');
    expect(typeof result).toBe('boolean');
  });

  it('should have hasAnyPermission method', () => {
    expect(typeof testUser.hasAnyPermission).toBe('function');
  });

  it('should execute hasAnyPermission', async () => {
    const result = await testUser.hasAnyPermission(['view-dashboard', 'edit-profile']);
    expect(typeof result).toBe('boolean');
  });

  it('should have hasAllPermissions method', () => {
    expect(typeof testUser.hasAllPermissions).toBe('function');
  });

  it('should execute hasAllPermissions', async () => {
    const result = await testUser.hasAllPermissions(['view-dashboard']);
    expect(typeof result).toBe('boolean');
  });
});
