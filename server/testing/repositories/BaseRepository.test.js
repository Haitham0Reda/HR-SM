/**
 * BaseRepository Unit Tests
 * 
 * Tests for tenant scoping enforcement in BaseRepository
 */

import { jest } from '@jest/globals';
import BaseRepository from '../../repositories/BaseRepository.js';

describe('BaseRepository - Tenant Scoping', () => {
  let mockModel;
  let mockSequelize;
  let repository;
  const TENANT_ID = 'tenant-123';
  const RECORD_ID = 'record-456';

  beforeEach(() => {
    // Mock Sequelize instance
    mockSequelize = {
      transaction: jest.fn()
    };

    // Mock Sequelize model
    mockModel = {
      name: 'TestModel',
      sequelize: mockSequelize,
      create: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
      count: jest.fn()
    };

    // Create repository instance
    repository = new BaseRepository(mockModel, TENANT_ID);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Tenant Validation', () => {
    it('should require a valid Sequelize model', () => {
      expect(() => new BaseRepository(null, TENANT_ID)).toThrow('Valid Sequelize model is required');
      expect(() => new BaseRepository({}, TENANT_ID)).toThrow('Valid Sequelize model is required');
    });

    it('should throw error when tenantId is null', () => {
      expect(() => new BaseRepository(mockModel, null)).toThrow('tenantId is required for all repository operations');
    });

    it('should throw error when tenantId is undefined', () => {
      expect(() => new BaseRepository(mockModel, undefined)).toThrow('tenantId is required for all repository operations');
    });

    it('should throw error when tenantId is empty string', () => {
      expect(() => new BaseRepository(mockModel, '')).toThrow('tenantId is required for all repository operations');
    });

    it('should throw error when tenantId is whitespace only', () => {
      expect(() => new BaseRepository(mockModel, '   ')).toThrow('tenantId is required for all repository operations');
    });

    it('should accept valid tenantId', () => {
      expect(() => new BaseRepository(mockModel, TENANT_ID)).not.toThrow();
      expect(repository.tenantId).toBe(TENANT_ID);
    });

    it('should store model and modelName', () => {
      expect(repository.model).toBe(mockModel);
      expect(repository.modelName).toBe('TestModel');
    });
  });

  describe('Static Factory Method - withTenant', () => {
    it('should create repository instance with tenant', () => {
      const repo = BaseRepository.withTenant(mockModel, TENANT_ID);
      expect(repo).toBeInstanceOf(BaseRepository);
      expect(repo.tenantId).toBe(TENANT_ID);
      expect(repo.model).toBe(mockModel);
    });

    it('should throw error when tenantId is missing', () => {
      expect(() => BaseRepository.withTenant(mockModel, null)).toThrow('tenantId is required for all repository operations');
    });
  });

  describe('create() - Tenant Injection', () => {
    it('should inject company_id into data payload', async () => {
      const data = { name: 'Test', value: 123 };
      const expectedData = { name: 'Test', value: 123, company_id: TENANT_ID };
      
      mockModel.create.mockResolvedValue(expectedData);

      await repository.create(data);

      expect(mockModel.create).toHaveBeenCalledWith(
        expectedData,
        {}
      );
    });

    it('should inject company_id even if data already has it', async () => {
      const data = { name: 'Test', company_id: 'wrong-tenant' };
      const expectedData = { name: 'Test', company_id: TENANT_ID };
      
      mockModel.create.mockResolvedValue(expectedData);

      await repository.create(data);

      expect(mockModel.create).toHaveBeenCalledWith(
        expectedData,
        {}
      );
    });

    it('should include transaction in options when provided', async () => {
      const data = { name: 'Test' };
      const transaction = { id: 'tx-1' };
      
      mockModel.create.mockResolvedValue({ ...data, company_id: TENANT_ID });

      await repository.create(data, { transaction });

      expect(mockModel.create).toHaveBeenCalledWith(
        { ...data, company_id: TENANT_ID },
        { transaction }
      );
    });
  });

  describe('findById() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      mockModel.findOne.mockResolvedValue({ id: RECORD_ID, company_id: TENANT_ID });

      await repository.findById(RECORD_ID);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: {
          id: RECORD_ID,
          company_id: TENANT_ID
        }
      });
    });

    it('should include attributes when provided', async () => {
      mockModel.findOne.mockResolvedValue({ id: RECORD_ID });

      await repository.findById(RECORD_ID, { attributes: ['id', 'name'] });

      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: {
          id: RECORD_ID,
          company_id: TENANT_ID
        },
        attributes: ['id', 'name']
      });
    });

    it('should include associations when provided', async () => {
      const include = [{ model: 'RelatedModel' }];
      mockModel.findOne.mockResolvedValue({ id: RECORD_ID });

      await repository.findById(RECORD_ID, { include });

      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: {
          id: RECORD_ID,
          company_id: TENANT_ID
        },
        include
      });
    });
  });

  describe('findOne() - Tenant Filtering', () => {
    it('should merge company_id into WHERE clause', async () => {
      const filter = { status: 'active' };
      mockModel.findOne.mockResolvedValue({ status: 'active', company_id: TENANT_ID });

      await repository.findOne(filter);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: {
          status: 'active',
          company_id: TENANT_ID
        }
      });
    });

    it('should override company_id if provided in filter', async () => {
      const filter = { status: 'active', company_id: 'wrong-tenant' };
      mockModel.findOne.mockResolvedValue({ status: 'active', company_id: TENANT_ID });

      await repository.findOne(filter);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: {
          status: 'active',
          company_id: TENANT_ID
        }
      });
    });

    it('should include order when provided', async () => {
      const filter = { status: 'active' };
      const order = [['createdAt', 'DESC']];
      mockModel.findOne.mockResolvedValue({});

      await repository.findOne(filter, { order });

      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: {
          status: 'active',
          company_id: TENANT_ID
        },
        order
      });
    });
  });

  describe('findAll() - Tenant Filtering', () => {
    it('should merge company_id into WHERE clause', async () => {
      const filter = { status: 'active' };
      mockModel.findAll.mockResolvedValue([]);

      await repository.findAll(filter);

      expect(mockModel.findAll).toHaveBeenCalledWith({
        where: {
          status: 'active',
          company_id: TENANT_ID
        }
      });
    });

    it('should work with empty filter', async () => {
      mockModel.findAll.mockResolvedValue([]);

      await repository.findAll();

      expect(mockModel.findAll).toHaveBeenCalledWith({
        where: {
          company_id: TENANT_ID
        }
      });
    });

    it('should include limit and offset when provided', async () => {
      mockModel.findAll.mockResolvedValue([]);

      await repository.findAll({}, { limit: 10, offset: 20 });

      expect(mockModel.findAll).toHaveBeenCalledWith({
        where: {
          company_id: TENANT_ID
        },
        limit: 10,
        offset: 20
      });
    });

    it('should include order when provided', async () => {
      const order = [['name', 'ASC']];
      mockModel.findAll.mockResolvedValue([]);

      await repository.findAll({}, { order });

      expect(mockModel.findAll).toHaveBeenCalledWith({
        where: {
          company_id: TENANT_ID
        },
        order
      });
    });

    it('should include attributes when provided', async () => {
      mockModel.findAll.mockResolvedValue([]);

      await repository.findAll({}, { attributes: ['id', 'name'] });

      expect(mockModel.findAll).toHaveBeenCalledWith({
        where: {
          company_id: TENANT_ID
        },
        attributes: ['id', 'name']
      });
    });
  });

  describe('update() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      const data = { name: 'Updated' };
      mockModel.update.mockResolvedValue([1, [{ id: RECORD_ID, name: 'Updated' }]]);

      await repository.update(RECORD_ID, data);

      expect(mockModel.update).toHaveBeenCalledWith(
        data,
        {
          where: {
            id: RECORD_ID,
            company_id: TENANT_ID
          },
          returning: true
        }
      );
    });

    it('should include transaction when provided', async () => {
      const data = { name: 'Updated' };
      const transaction = { id: 'tx-1' };
      mockModel.update.mockResolvedValue([1, [{ id: RECORD_ID }]]);

      await repository.update(RECORD_ID, data, { transaction });

      expect(mockModel.update).toHaveBeenCalledWith(
        data,
        {
          where: {
            id: RECORD_ID,
            company_id: TENANT_ID
          },
          returning: true,
          transaction
        }
      );
    });

    it('should not override company_id in data payload', async () => {
      const data = { name: 'Updated', company_id: 'wrong-tenant' };
      mockModel.update.mockResolvedValue([1, [{ id: RECORD_ID }]]);

      await repository.update(RECORD_ID, data);

      // The WHERE clause should still use the repository's tenantId
      expect(mockModel.update).toHaveBeenCalledWith(
        data,
        {
          where: {
            id: RECORD_ID,
            company_id: TENANT_ID
          },
          returning: true
        }
      );
    });
  });

  describe('delete() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      mockModel.destroy.mockResolvedValue(1);

      await repository.delete(RECORD_ID);

      expect(mockModel.destroy).toHaveBeenCalledWith({
        where: {
          id: RECORD_ID,
          company_id: TENANT_ID
        }
      });
    });

    it('should include transaction when provided', async () => {
      const transaction = { id: 'tx-1' };
      mockModel.destroy.mockResolvedValue(1);

      await repository.delete(RECORD_ID, { transaction });

      expect(mockModel.destroy).toHaveBeenCalledWith({
        where: {
          id: RECORD_ID,
          company_id: TENANT_ID
        },
        transaction
      });
    });

    it('should return true when record is deleted', async () => {
      mockModel.destroy.mockResolvedValue(1);

      const result = await repository.delete(RECORD_ID);

      expect(result).toBe(true);
    });

    it('should return false when record is not found', async () => {
      mockModel.destroy.mockResolvedValue(0);

      const result = await repository.delete(RECORD_ID);

      expect(result).toBe(false);
    });
  });

  describe('softDelete() - Tenant Filtering', () => {
    it('should use update with company_id filtering', async () => {
      mockModel.update.mockResolvedValue([1, [{ id: RECORD_ID, deletedAt: new Date() }]]);

      await repository.softDelete(RECORD_ID);

      const callArgs = mockModel.update.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('deletedAt');
      expect(callArgs[1].where).toEqual({
        id: RECORD_ID,
        company_id: TENANT_ID
      });
    });

    it('should include deletedBy when provided', async () => {
      const deletedBy = 'user-789';
      mockModel.update.mockResolvedValue([1, [{ id: RECORD_ID }]]);

      await repository.softDelete(RECORD_ID, { deletedBy });

      const callArgs = mockModel.update.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('deletedBy', deletedBy);
    });
  });

  describe('count() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      const filter = { status: 'active' };
      mockModel.count.mockResolvedValue(5);

      await repository.count(filter);

      expect(mockModel.count).toHaveBeenCalledWith({
        where: {
          status: 'active',
          company_id: TENANT_ID
        }
      });
    });

    it('should work with empty filter', async () => {
      mockModel.count.mockResolvedValue(10);

      await repository.count();

      expect(mockModel.count).toHaveBeenCalledWith({
        where: {
          company_id: TENANT_ID
        }
      });
    });
  });

  describe('exists() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      const filter = { email: 'test@example.com' };
      mockModel.count.mockResolvedValue(1);

      await repository.exists(filter);

      expect(mockModel.count).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          company_id: TENANT_ID
        },
        limit: 1
      });
    });

    it('should return true when record exists', async () => {
      mockModel.count.mockResolvedValue(1);

      const result = await repository.exists({ id: RECORD_ID });

      expect(result).toBe(true);
    });

    it('should return false when record does not exist', async () => {
      mockModel.count.mockResolvedValue(0);

      const result = await repository.exists({ id: RECORD_ID });

      expect(result).toBe(false);
    });
  });

  describe('paginate() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      const filter = { status: 'active' };
      mockModel.findAll.mockResolvedValue([]);
      mockModel.count.mockResolvedValue(0);

      await repository.paginate(filter, { page: 1, limit: 10 });

      expect(mockModel.findAll).toHaveBeenCalledWith({
        where: {
          status: 'active',
          company_id: TENANT_ID
        },
        limit: 10,
        offset: 0
      });

      expect(mockModel.count).toHaveBeenCalledWith({
        where: {
          status: 'active',
          company_id: TENANT_ID
        }
      });
    });

    it('should calculate offset correctly', async () => {
      mockModel.findAll.mockResolvedValue([]);
      mockModel.count.mockResolvedValue(0);

      await repository.paginate({}, { page: 3, limit: 20 });

      expect(mockModel.findAll).toHaveBeenCalledWith({
        where: {
          company_id: TENANT_ID
        },
        limit: 20,
        offset: 40
      });
    });

    it('should return paginated result with metadata', async () => {
      const records = [{ id: '1' }, { id: '2' }];
      mockModel.findAll.mockResolvedValue(records);
      mockModel.count.mockResolvedValue(25);

      const result = await repository.paginate({}, { page: 2, limit: 10 });

      expect(result).toEqual({
        data: records,
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3
      });
    });
  });

  describe('Cross-Tenant Isolation', () => {
    it('should prevent access to records from different tenant', async () => {
      const tenant1Repo = new BaseRepository(mockModel, 'tenant-1');
      const tenant2Repo = new BaseRepository(mockModel, 'tenant-2');

      mockModel.findOne.mockResolvedValue(null);

      await tenant1Repo.findById(RECORD_ID);
      await tenant2Repo.findById(RECORD_ID);

      expect(mockModel.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: RECORD_ID, company_id: 'tenant-1' }
      });

      expect(mockModel.findOne).toHaveBeenNthCalledWith(2, {
        where: { id: RECORD_ID, company_id: 'tenant-2' }
      });
    });

    it('should enforce tenant isolation in all query methods', async () => {
      const tenant1Repo = new BaseRepository(mockModel, 'tenant-1');
      
      mockModel.findAll.mockResolvedValue([]);
      mockModel.count.mockResolvedValue(0);

      await tenant1Repo.findAll({ status: 'active' });
      await tenant1Repo.count({ status: 'active' });
      await tenant1Repo.exists({ email: 'test@example.com' });

      // All calls should include tenant-1
      expect(mockModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ company_id: 'tenant-1' })
        })
      );

      expect(mockModel.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ company_id: 'tenant-1' })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should wrap errors with context', async () => {
      const dbError = new Error('Database connection failed');
      mockModel.findAll.mockRejectedValue(dbError);

      await expect(repository.findAll()).rejects.toThrow(
        'Repository error in TestModel.findAll: Database connection failed'
      );
    });

    it('should preserve original error information', async () => {
      const dbError = new Error('Constraint violation');
      mockModel.create.mockRejectedValue(dbError);

      try {
        await repository.create({ name: 'Test' });
      } catch (error) {
        expect(error.originalError).toBe(dbError);
        expect(error.operation).toBe('create');
        expect(error.model).toBe('TestModel');
      }
    });
  });
});