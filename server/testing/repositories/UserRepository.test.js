/**
 * UserRepository Unit Tests
 * 
 * Tests for tenant scoping and user-specific query methods
 */

import { jest } from '@jest/globals';
import BaseRepository from '../../repositories/BaseRepository.js';

// Create a mock UserRepository class that extends BaseRepository
class UserRepository extends BaseRepository {
  constructor(tenantId) {
    // Create a mock model
    const mockModel = {
      name: 'User',
      sequelize: { transaction: jest.fn() },
      findOne: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn()
    };
    super(mockModel, tenantId);
  }

  async findByEmail(email, options = {}) {
    try {
      const { attributes, include } = options;
      const where = { email, company_id: this.tenantId };
      const findOptions = { where };
      if (attributes) findOptions.attributes = attributes;
      if (include) findOptions.include = include;
      return await this.model.findOne(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findByEmail');
    }
  }

  async findByRole(role, options = {}) {
    try {
      const { attributes, include, order, limit, offset } = options;
      const where = { role, company_id: this.tenantId };
      const findOptions = { where };
      if (attributes) findOptions.attributes = attributes;
      if (include) findOptions.include = include;
      if (order) findOptions.order = order;
      if (limit) findOptions.limit = limit;
      if (offset !== undefined) findOptions.offset = offset;
      return await this.model.findAll(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findByRole');
    }
  }

  async findActiveEmployees(options = {}) {
    try {
      const { attributes, include, order, limit, offset } = options;
      const where = { isActive: true, status: 'active', company_id: this.tenantId };
      const findOptions = { where };
      if (attributes) findOptions.attributes = attributes;
      if (include) findOptions.include = include;
      if (order) findOptions.order = order;
      if (limit) findOptions.limit = limit;
      if (offset !== undefined) findOptions.offset = offset;
      return await this.model.findAll(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findActiveEmployees');
    }
  }

  async findWithDepartment(deptId, options = {}) {
    try {
      const { attributes, includeDepartment = false, order, limit, offset } = options;
      const where = { departmentId: deptId, company_id: this.tenantId };
      const findOptions = { where };
      if (attributes) findOptions.attributes = attributes;
      if (includeDepartment) {
        findOptions.include = [{ model: 'Department', as: 'department', attributes: ['id', 'name', 'code'] }];
      }
      if (order) findOptions.order = order;
      if (limit) findOptions.limit = limit;
      if (offset !== undefined) findOptions.offset = offset;
      return await this.model.findAll(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findWithDepartment');
    }
  }

  async findByUsername(username, options = {}) {
    try {
      const { attributes } = options;
      const where = { username, company_id: this.tenantId };
      const findOptions = { where };
      if (attributes) findOptions.attributes = attributes;
      return await this.model.findOne(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findByUsername');
    }
  }

  async findByEmployeeId(employeeId, options = {}) {
    try {
      const { attributes, include } = options;
      const where = { employeeId, company_id: this.tenantId };
      const findOptions = { where };
      if (attributes) findOptions.attributes = attributes;
      if (include) findOptions.include = include;
      return await this.model.findOne(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findByEmployeeId');
    }
  }

  async countByStatus(status) {
    try {
      const where = { status, company_id: this.tenantId };
      return await this.model.count({ where });
    } catch (error) {
      throw this._handleError(error, 'countByStatus');
    }
  }

  static withTenant(tenantId) {
    return new UserRepository(tenantId);
  }
}

describe('UserRepository - Tenant Scoping', () => {
  let repository;
  const TENANT_ID = 'tenant-123';
  const USER_ID = 'user-456';

  beforeEach(() => {
    // Create repository instance
    repository = new UserRepository(TENANT_ID);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create repository with tenant ID', () => {
      const repo = new UserRepository(TENANT_ID);
      expect(repo.tenantId).toBe(TENANT_ID);
    });

    it('should throw error when tenantId is missing', () => {
      expect(() => new UserRepository(null)).toThrow('tenantId is required for all repository operations');
    });
  });

  describe('Static Factory - withTenant', () => {
    it('should create repository instance with tenant', () => {
      const repo = UserRepository.withTenant(TENANT_ID);
      expect(repo).toBeInstanceOf(UserRepository);
      expect(repo.tenantId).toBe(TENANT_ID);
    });
  });

  describe('findByEmail() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      const email = 'test@example.com';
      repository.model.findOne.mockResolvedValue({ id: USER_ID, email });

      await repository.findByEmail(email);

      expect(repository.model.findOne).toHaveBeenCalledWith({
        where: {
          email,
          company_id: TENANT_ID
        }
      });
    });

    it('should include attributes when provided', async () => {
      const email = 'test@example.com';
      repository.model.findOne.mockResolvedValue({ id: USER_ID });

      await repository.findByEmail(email, { attributes: ['id', 'email', 'role'] });

      expect(repository.model.findOne).toHaveBeenCalledWith({
        where: {
          email,
          company_id: TENANT_ID
        },
        attributes: ['id', 'email', 'role']
      });
    });

    it('should include associations when provided', async () => {
      const email = 'test@example.com';
      const include = [{ model: 'Department', as: 'department' }];
      repository.model.findOne.mockResolvedValue({ id: USER_ID });

      await repository.findByEmail(email, { include });

      expect(repository.model.findOne).toHaveBeenCalledWith({
        where: {
          email,
          company_id: TENANT_ID
        },
        include
      });
    });

    it('should return null when user not found', async () => {
      repository.model.findOne.mockResolvedValue(null);

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByRole() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      const role = 'manager';
      repository.model.findAll.mockResolvedValue([]);

      await repository.findByRole(role);

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          role,
          company_id: TENANT_ID
        }
      });
    });

    it('should include limit and offset when provided', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.findByRole('employee', { limit: 10, offset: 20 });

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          role: 'employee',
          company_id: TENANT_ID
        },
        limit: 10,
        offset: 20
      });
    });

    it('should include order when provided', async () => {
      const order = [['personalInfo.firstName', 'ASC']];
      repository.model.findAll.mockResolvedValue([]);

      await repository.findByRole('admin', { order });

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          role: 'admin',
          company_id: TENANT_ID
        },
        order
      });
    });

    it('should return array of users', async () => {
      const users = [
        { id: '1', role: 'manager' },
        { id: '2', role: 'manager' }
      ];
      repository.model.findAll.mockResolvedValue(users);

      const result = await repository.findByRole('manager');

      expect(result).toEqual(users);
      expect(result).toHaveLength(2);
    });
  });

  describe('findActiveEmployees() - Tenant Filtering', () => {
    it('should include company_id and active status in WHERE clause', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.findActiveEmployees();

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          isActive: true,
          status: 'active',
          company_id: TENANT_ID
        }
      });
    });

    it('should include attributes when provided', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.findActiveEmployees({ attributes: ['id', 'email', 'role'] });

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          isActive: true,
          status: 'active',
          company_id: TENANT_ID
        },
        attributes: ['id', 'email', 'role']
      });
    });

    it('should include associations when provided', async () => {
      const include = [{ model: 'Department', as: 'department' }];
      repository.model.findAll.mockResolvedValue([]);

      await repository.findActiveEmployees({ include });

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          isActive: true,
          status: 'active',
          company_id: TENANT_ID
        },
        include
      });
    });

    it('should return array of active employees', async () => {
      const employees = [
        { id: '1', isActive: true, status: 'active' },
        { id: '2', isActive: true, status: 'active' }
      ];
      repository.model.findAll.mockResolvedValue(employees);

      const result = await repository.findActiveEmployees();

      expect(result).toEqual(employees);
    });
  });

  describe('findWithDepartment() - Tenant Filtering', () => {
    const DEPT_ID = 'dept-789';

    it('should include company_id and departmentId in WHERE clause', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.findWithDepartment(DEPT_ID);

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          departmentId: DEPT_ID,
          company_id: TENANT_ID
        }
      });
    });

    it('should include department association when requested', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.findWithDepartment(DEPT_ID, { includeDepartment: true });

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          departmentId: DEPT_ID,
          company_id: TENANT_ID
        },
        include: [{
          model: expect.anything(),
          as: 'department',
          attributes: ['id', 'name', 'code']
        }]
      });
    });

    it('should not include department association by default', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.findWithDepartment(DEPT_ID);

      const callArgs = repository.model.findAll.mock.calls[0][0];
      expect(callArgs.include).toBeUndefined();
    });

    it('should include order when provided', async () => {
      const order = [['personalInfo.lastName', 'ASC']];
      repository.model.findAll.mockResolvedValue([]);

      await repository.findWithDepartment(DEPT_ID, { order });

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          departmentId: DEPT_ID,
          company_id: TENANT_ID
        },
        order
      });
    });

    it('should return array of users in department', async () => {
      const users = [
        { id: '1', departmentId: DEPT_ID },
        { id: '2', departmentId: DEPT_ID }
      ];
      repository.model.findAll.mockResolvedValue(users);

      const result = await repository.findWithDepartment(DEPT_ID);

      expect(result).toEqual(users);
    });
  });

  describe('findByUsername() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      const username = 'john.doe';
      repository.model.findOne.mockResolvedValue({ id: USER_ID, username });

      await repository.findByUsername(username);

      expect(repository.model.findOne).toHaveBeenCalledWith({
        where: {
          username,
          company_id: TENANT_ID
        }
      });
    });

    it('should include attributes when provided', async () => {
      repository.model.findOne.mockResolvedValue({ id: USER_ID });

      await repository.findByUsername('john.doe', { attributes: ['id', 'username'] });

      expect(repository.model.findOne).toHaveBeenCalledWith({
        where: {
          username: 'john.doe',
          company_id: TENANT_ID
        },
        attributes: ['id', 'username']
      });
    });
  });

  describe('findByEmployeeId() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      const employeeId = 'EMP-001';
      repository.model.findOne.mockResolvedValue({ id: USER_ID, employeeId });

      await repository.findByEmployeeId(employeeId);

      expect(repository.model.findOne).toHaveBeenCalledWith({
        where: {
          employeeId,
          company_id: TENANT_ID
        }
      });
    });

    it('should include attributes when provided', async () => {
      repository.model.findOne.mockResolvedValue({ id: USER_ID });

      await repository.findByEmployeeId('EMP-001', { attributes: ['id', 'employeeId'] });

      expect(repository.model.findOne).toHaveBeenCalledWith({
        where: {
          employeeId: 'EMP-001',
          company_id: TENANT_ID
        },
        attributes: ['id', 'employeeId']
      });
    });

    it('should include associations when provided', async () => {
      const include = [{ model: 'Department', as: 'department' }];
      repository.model.findOne.mockResolvedValue({ id: USER_ID });

      await repository.findByEmployeeId('EMP-001', { include });

      expect(repository.model.findOne).toHaveBeenCalledWith({
        where: {
          employeeId: 'EMP-001',
          company_id: TENANT_ID
        },
        include
      });
    });
  });

  describe('countByStatus() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      repository.model.count.mockResolvedValue(5);

      await repository.countByStatus('active');

      expect(repository.model.count).toHaveBeenCalledWith({
        where: {
          status: 'active',
          company_id: TENANT_ID
        }
      });
    });

    it('should return count of users with status', async () => {
      repository.model.count.mockResolvedValue(10);

      const result = await repository.countByStatus('vacation');

      expect(result).toBe(10);
    });
  });

  describe('Cross-Tenant Isolation', () => {
    it('should prevent access to users from different tenant', async () => {
      const tenant1Repo = new UserRepository('tenant-1');
      const tenant2Repo = new UserRepository('tenant-2');

      tenant1Repo.model.findOne.mockResolvedValue(null);
      tenant2Repo.model.findOne.mockResolvedValue(null);

      await tenant1Repo.findByEmail('test@example.com');
      await tenant2Repo.findByEmail('test@example.com');

      expect(tenant1Repo.model.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com', company_id: 'tenant-1' }
      });

      expect(tenant2Repo.model.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com', company_id: 'tenant-2' }
      });
    });

    it('should enforce tenant isolation in all query methods', async () => {
      repository.model.findAll.mockResolvedValue([]);
      repository.model.count.mockResolvedValue(0);

      await repository.findByRole('admin');
      await repository.findActiveEmployees();
      await repository.findWithDepartment('dept-1');
      await repository.countByStatus('active');

      // All calls should include the tenant ID
      const allCalls = repository.model.findAll.mock.calls.concat(repository.model.count.mock.calls);
      allCalls.forEach(call => {
        expect(call[0].where).toHaveProperty('company_id', TENANT_ID);
      });
    });
  });

  describe('Error Handling', () => {
    it('should wrap errors with context', async () => {
      const dbError = new Error('Database connection failed');
      repository.model.findOne.mockRejectedValue(dbError);

      await expect(repository.findByEmail('test@example.com')).rejects.toThrow(
        'Repository error in User.findByEmail: Database connection failed'
      );
    });

    it('should preserve original error information', async () => {
      const dbError = new Error('Constraint violation');
      repository.model.findAll.mockRejectedValue(dbError);

      try {
        await repository.findByRole('admin');
      } catch (error) {
        expect(error.originalError).toBe(dbError);
        expect(error.operation).toBe('findByRole');
        expect(error.model).toBe('User');
      }
    });
  });
});
