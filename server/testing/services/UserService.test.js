import UserService from '../../modules/hr-core/services/UserService.js';
import UserRepository from '../../repositories/core/UserRepository.js';
import AuditLog from '../../modules/hr-core/models/AuditLog.js';

// Mock the dependencies
jest.mock('../../repositories/core/UserRepository.js');
jest.mock('../../modules/hr-core/models/AuditLog.js');

describe('UserService Integration Tests', () => {
  let userService;
  let mockUserRepository;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock repository instance
    mockUserRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    };
    
    // Mock the UserRepository constructor
    UserRepository.mockImplementation(() => mockUserRepository);
    
    // Mock AuditLog.create
    AuditLog.create = jest.fn();
    
    userService = new UserService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getUsers', () => {
    it('should get users with filters and pagination', async () => {
      // Arrange
      const mockUsers = [
        { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { _id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
      ];
      const mockCount = 2;
      
      mockUserRepository.find.mockResolvedValue(mockUsers);
      mockUserRepository.count.mockResolvedValue(mockCount);

      const filters = {
        role: 'employee',
        status: 'active',
        page: 1,
        limit: 10,
        tenantId: 'tenant123'
      };

      // Act
      const result = await userService.getUsers(filters);

      // Assert
      expect(result).toEqual({
        users: mockUsers,
        pagination: {
          total: mockCount,
          page: 1,
          pages: 1
        }
      });

      expect(mockUserRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant123',
          role: 'employee',
          status: 'active'
        }),
        expect.objectContaining({
          populate: expect.any(Array),
          sort: { createdAt: -1 },
          limit: 10,
          skip: 0
        })
      );

      expect(mockUserRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant123',
          role: 'employee',
          status: 'active'
        })
      );
    });

    it('should handle search filters correctly', async () => {
      // Arrange
      mockUserRepository.find.mockResolvedValue([]);
      mockUserRepository.count.mockResolvedValue(0);

      const filters = {
        search: 'john',
        tenantId: 'tenant123'
      };

      // Act
      await userService.getUsers(filters);

      // Assert
      expect(mockUserRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant123',
          $or: expect.arrayContaining([
            { firstName: { $regex: 'john', $options: 'i' } },
            { lastName: { $regex: 'john', $options: 'i' } },
            { email: { $regex: 'john', $options: 'i' } },
            { employeeId: { $regex: 'john', $options: 'i' } }
          ])
        }),
        expect.any(Object)
      );
    });
  });

  describe('getUserById', () => {
    it('should get user by ID successfully', async () => {
      // Arrange
      const mockUser = { _id: '1', firstName: 'John', lastName: 'Doe' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserById('1', 'tenant123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith(
        { _id: '1', tenantId: 'tenant123' },
        expect.objectContaining({
          populate: expect.any(Array)
        })
      );
    });

    it('should throw error when user not found', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUserById('1', 'tenant123')).rejects.toThrow('User not found');
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      // Arrange
      const userData = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
      const createdUser = { _id: '1', ...userData };
      const populatedUser = { ...createdUser, department: { name: 'IT' } };

      mockUserRepository.create.mockResolvedValue(createdUser);
      mockUserRepository.findById.mockResolvedValue(populatedUser);
      AuditLog.create.mockResolvedValue({});

      // Act
      const result = await userService.createUser(userData, 'creator123', 'tenant123');

      // Assert
      expect(result).toEqual(populatedUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...userData,
        tenantId: 'tenant123',
        createdBy: 'creator123'
      });
      expect(AuditLog.create).toHaveBeenCalledWith({
        action: 'create',
        resource: 'User',
        resourceId: '1',
        userId: 'creator123',
        tenantId: 'tenant123',
        module: 'hr-core'
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      // Arrange
      const existingUser = { _id: '1', firstName: 'John', lastName: 'Doe' };
      const updateData = { firstName: 'Jane' };
      const updatedUser = { ...existingUser, ...updateData };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);
      mockUserRepository.findById.mockResolvedValue(updatedUser);
      AuditLog.create.mockResolvedValue({});

      // Act
      const result = await userService.updateUser('1', updateData, 'updater123', 'tenant123');

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ _id: '1', tenantId: 'tenant123' });
      expect(mockUserRepository.update).toHaveBeenCalledWith('1', {
        firstName: 'Jane',
        updatedBy: 'updater123'
      });
      expect(AuditLog.create).toHaveBeenCalled();
    });

    it('should throw error when user not found for update', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.updateUser('1', {}, 'updater123', 'tenant123')).rejects.toThrow('User not found');
    });

    it('should filter allowed updates only', async () => {
      // Arrange
      const existingUser = { _id: '1', firstName: 'John' };
      const updateData = { 
        firstName: 'Jane', 
        invalidField: 'should be filtered',
        lastName: 'Smith'
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(existingUser);
      mockUserRepository.findById.mockResolvedValue(existingUser);
      AuditLog.create.mockResolvedValue({});

      // Act
      await userService.updateUser('1', updateData, 'updater123', 'tenant123');

      // Assert
      expect(mockUserRepository.update).toHaveBeenCalledWith('1', {
        firstName: 'Jane',
        lastName: 'Smith',
        updatedBy: 'updater123'
      });
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user successfully', async () => {
      // Arrange
      const existingUser = { _id: '1', firstName: 'John', status: 'active' };
      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({});
      AuditLog.create.mockResolvedValue({});

      // Act
      const result = await userService.deleteUser('1', 'deleter123', 'tenant123');

      // Assert
      expect(result).toEqual({ message: 'User deactivated successfully' });
      expect(mockUserRepository.update).toHaveBeenCalledWith('1', {
        status: 'inactive',
        updatedBy: 'deleter123'
      });
      expect(AuditLog.create).toHaveBeenCalledWith({
        action: 'delete',
        resource: 'User',
        resourceId: '1',
        userId: 'deleter123',
        tenantId: 'tenant123',
        module: 'hr-core'
      });
    });

    it('should throw error when user not found for deletion', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.deleteUser('1', 'deleter123', 'tenant123')).rejects.toThrow('User not found');
    });
  });

  describe('getSubordinates', () => {
    it('should get subordinates successfully', async () => {
      // Arrange
      const mockSubordinates = [
        { _id: '2', firstName: 'Jane', manager: '1' },
        { _id: '3', firstName: 'Bob', manager: '1' }
      ];
      mockUserRepository.find.mockResolvedValue(mockSubordinates);

      // Act
      const result = await userService.getSubordinates('1', 'tenant123');

      // Assert
      expect(result).toEqual(mockSubordinates);
      expect(mockUserRepository.find).toHaveBeenCalledWith(
        {
          manager: '1',
          tenantId: 'tenant123',
          status: 'active'
        },
        expect.objectContaining({
          populate: expect.any(Array)
        })
      );
    });
  });
});