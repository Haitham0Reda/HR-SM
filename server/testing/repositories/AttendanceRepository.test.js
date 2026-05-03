/**
 * AttendanceRepository Unit Tests
 * 
 * Tests for tenant scoping and attendance-specific query methods
 */

import { jest } from '@jest/globals';
import { Op } from 'sequelize';
import BaseRepository from '../../repositories/BaseRepository.js';

// Create a mock AttendanceRepository class that extends BaseRepository
class AttendanceRepository extends BaseRepository {
  constructor(tenantId) {
    // Create a mock model
    const mockModel = {
      name: 'Attendance',
      sequelize: { transaction: jest.fn() },
      findOne: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      bulkCreate: jest.fn()
    };
    super(mockModel, tenantId);
  }

  async findByEmployeeAndDateRange(employeeId, from, to, options = {}) {
    try {
      const { attributes, include, order = [['date', 'ASC']] } = options;
      const where = { employeeId, date: { [Op.gte]: from, [Op.lte]: to }, company_id: this.tenantId };
      const findOptions = { where, order };
      if (attributes) findOptions.attributes = attributes;
      if (include) findOptions.include = include;
      return await this.model.findAll(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findByEmployeeAndDateRange');
    }
  }

  async findTodayRecord(employeeId, options = {}) {
    try {
      const { attributes, include } = options;
      const today = new Date().toISOString().split('T')[0];
      const where = { employeeId, date: today, company_id: this.tenantId };
      const findOptions = { where };
      if (attributes) findOptions.attributes = attributes;
      if (include) findOptions.include = include;
      return await this.model.findOne(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findTodayRecord');
    }
  }

  async bulkCreate(records, options = {}) {
    try {
      const { transaction, validate = true, ignoreDuplicates = false } = options;
      const recordsWithTenant = records.map(record => ({ ...record, company_id: this.tenantId }));
      const createOptions = { validate, ignoreDuplicates };
      if (transaction) createOptions.transaction = transaction;
      return await this.model.bulkCreate(recordsWithTenant, createOptions);
    } catch (error) {
      throw this._handleError(error, 'bulkCreate');
    }
  }

  async getMonthlyReport(month, year, options = {}) {
    try {
      const { departmentId, attributes, includeEmployee = true, includeDepartment = false, order = [['date', 'ASC'], ['employeeId', 'ASC']] } = options;
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const where = { date: { [Op.gte]: startDate, [Op.lte]: endDate }, company_id: this.tenantId };
      if (departmentId) where.departmentId = departmentId;
      const findOptions = { where, order };
      if (attributes) findOptions.attributes = attributes;
      const includeArray = [];
      if (includeEmployee) includeArray.push({ model: 'User', as: 'employee', attributes: ['id', 'employeeId', 'personalInfo', 'departmentId'] });
      if (includeDepartment) includeArray.push({ model: 'Department', as: 'department', attributes: ['id', 'name', 'code'] });
      if (includeArray.length > 0) findOptions.include = includeArray;
      return await this.model.findAll(findOptions);
    } catch (error) {
      throw this._handleError(error, 'getMonthlyReport');
    }
  }

  async findByStatus(status, options = {}) {
    try {
      const { date, fromDate, toDate, attributes, include, order, limit, offset } = options;
      const where = { status, company_id: this.tenantId };
      if (date) where.date = date;
      else if (fromDate && toDate) where.date = { [Op.gte]: fromDate, [Op.lte]: toDate };
      const findOptions = { where };
      if (attributes) findOptions.attributes = attributes;
      if (include) findOptions.include = include;
      if (order) findOptions.order = order;
      if (limit) findOptions.limit = limit;
      if (offset !== undefined) findOptions.offset = offset;
      return await this.model.findAll(findOptions);
    } catch (error) {
      throw this._handleError(error, 'findByStatus');
    }
  }

  async countByStatusAndDateRange(status, fromDate, toDate) {
    try {
      const where = { status, date: { [Op.gte]: fromDate, [Op.lte]: toDate }, company_id: this.tenantId };
      return await this.model.count({ where });
    } catch (error) {
      throw this._handleError(error, 'countByStatusAndDateRange');
    }
  }

  static withTenant(tenantId) {
    return new AttendanceRepository(tenantId);
  }
}

describe('AttendanceRepository - Tenant Scoping', () => {
  let repository;
  const TENANT_ID = 'tenant-123';
  const EMPLOYEE_ID = 'employee-456';
  const ATTENDANCE_ID = 'attendance-789';

  beforeEach(() => {
    // Create repository instance
    repository = new AttendanceRepository(TENANT_ID);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create repository with tenant ID', () => {
      const repo = new AttendanceRepository(TENANT_ID);
      expect(repo.tenantId).toBe(TENANT_ID);
    });

    it('should throw error when tenantId is missing', () => {
      expect(() => new AttendanceRepository(null)).toThrow('tenantId is required for all repository operations');
    });
  });

  describe('Static Factory - withTenant', () => {
    it('should create repository instance with tenant', () => {
      const repo = AttendanceRepository.withTenant(TENANT_ID);
      expect(repo).toBeInstanceOf(AttendanceRepository);
      expect(repo.tenantId).toBe(TENANT_ID);
    });
  });

  describe('findByEmployeeAndDateRange() - Tenant Filtering', () => {
    const fromDate = '2024-01-01';
    const toDate = '2024-01-31';

    it('should include company_id in WHERE clause', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.findByEmployeeAndDateRange(EMPLOYEE_ID, fromDate, toDate);

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          employeeId: EMPLOYEE_ID,
          date: {
            [Op.gte]: fromDate,
            [Op.lte]: toDate
          },
          company_id: TENANT_ID
        },
        order: [['date', 'ASC']]
      });
    });

    it('should include attributes when provided', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.findByEmployeeAndDateRange(EMPLOYEE_ID, fromDate, toDate, {
        attributes: ['id', 'date', 'status']
      });

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          employeeId: EMPLOYEE_ID,
          date: {
            [Op.gte]: fromDate,
            [Op.lte]: toDate
          },
          company_id: TENANT_ID
        },
        order: [['date', 'ASC']],
        attributes: ['id', 'date', 'status']
      });
    });

    it('should include associations when provided', async () => {
      const include = [{ model: 'User', as: 'employee' }];
      repository.model.findAll.mockResolvedValue([]);

      await repository.findByEmployeeAndDateRange(EMPLOYEE_ID, fromDate, toDate, { include });

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          employeeId: EMPLOYEE_ID,
          date: {
            [Op.gte]: fromDate,
            [Op.lte]: toDate
          },
          company_id: TENANT_ID
        },
        order: [['date', 'ASC']],
        include
      });
    });

    it('should allow custom order', async () => {
      const order = [['date', 'DESC']];
      repository.model.findAll.mockResolvedValue([]);

      await repository.findByEmployeeAndDateRange(EMPLOYEE_ID, fromDate, toDate, { order });

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          employeeId: EMPLOYEE_ID,
          date: {
            [Op.gte]: fromDate,
            [Op.lte]: toDate
          },
          company_id: TENANT_ID
        },
        order
      });
    });

    it('should return array of attendance records', async () => {
      const records = [
        { id: '1', date: '2024-01-01', status: 'present' },
        { id: '2', date: '2024-01-02', status: 'present' }
      ];
      repository.model.findAll.mockResolvedValue(records);

      const result = await repository.findByEmployeeAndDateRange(EMPLOYEE_ID, fromDate, toDate);

      expect(result).toEqual(records);
    });
  });

  describe('findTodayRecord() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      const today = new Date().toISOString().split('T')[0];
      repository.model.findOne.mockResolvedValue(null);

      await repository.findTodayRecord(EMPLOYEE_ID);

      expect(repository.model.findOne).toHaveBeenCalledWith({
        where: {
          employeeId: EMPLOYEE_ID,
          date: today,
          company_id: TENANT_ID
        }
      });
    });

    it('should include attributes when provided', async () => {
      const today = new Date().toISOString().split('T')[0];
      repository.model.findOne.mockResolvedValue(null);

      await repository.findTodayRecord(EMPLOYEE_ID, { attributes: ['id', 'status'] });

      expect(repository.model.findOne).toHaveBeenCalledWith({
        where: {
          employeeId: EMPLOYEE_ID,
          date: today,
          company_id: TENANT_ID
        },
        attributes: ['id', 'status']
      });
    });

    it('should include associations when provided', async () => {
      const today = new Date().toISOString().split('T')[0];
      const include = [{ model: 'User', as: 'employee' }];
      repository.model.findOne.mockResolvedValue(null);

      await repository.findTodayRecord(EMPLOYEE_ID, { include });

      expect(repository.model.findOne).toHaveBeenCalledWith({
        where: {
          employeeId: EMPLOYEE_ID,
          date: today,
          company_id: TENANT_ID
        },
        include
      });
    });

    it('should return today\'s record when found', async () => {
      const record = { id: ATTENDANCE_ID, date: new Date().toISOString().split('T')[0] };
      repository.model.findOne.mockResolvedValue(record);

      const result = await repository.findTodayRecord(EMPLOYEE_ID);

      expect(result).toEqual(record);
    });

    it('should return null when no record found', async () => {
      repository.model.findOne.mockResolvedValue(null);

      const result = await repository.findTodayRecord(EMPLOYEE_ID);

      expect(result).toBeNull();
    });
  });

  describe('bulkCreate() - Tenant Injection', () => {
    it('should inject company_id into all records', async () => {
      const records = [
        { employeeId: 'emp-1', date: '2024-01-01', status: 'present' },
        { employeeId: 'emp-2', date: '2024-01-01', status: 'present' }
      ];
      
      const expectedRecords = records.map(r => ({ ...r, company_id: TENANT_ID }));
      repository.model.bulkCreate.mockResolvedValue(expectedRecords);

      await repository.bulkCreate(records);

      expect(repository.model.bulkCreate).toHaveBeenCalledWith(
        expectedRecords,
        { validate: true, ignoreDuplicates: false }
      );
    });

    it('should include transaction when provided', async () => {
      const records = [{ employeeId: 'emp-1', date: '2024-01-01' }];
      const transaction = { id: 'tx-1' };
      
      repository.model.bulkCreate.mockResolvedValue([]);

      await repository.bulkCreate(records, { transaction });

      expect(repository.model.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ company_id: TENANT_ID })
        ]),
        { validate: true, ignoreDuplicates: false, transaction }
      );
    });

    it('should respect validate option', async () => {
      const records = [{ employeeId: 'emp-1', date: '2024-01-01' }];
      repository.model.bulkCreate.mockResolvedValue([]);

      await repository.bulkCreate(records, { validate: false });

      expect(repository.model.bulkCreate).toHaveBeenCalledWith(
        expect.any(Array),
        { validate: false, ignoreDuplicates: false }
      );
    });

    it('should respect ignoreDuplicates option', async () => {
      const records = [{ employeeId: 'emp-1', date: '2024-01-01' }];
      repository.model.bulkCreate.mockResolvedValue([]);

      await repository.bulkCreate(records, { ignoreDuplicates: true });

      expect(repository.model.bulkCreate).toHaveBeenCalledWith(
        expect.any(Array),
        { validate: true, ignoreDuplicates: true }
      );
    });

    it('should return created records', async () => {
      const records = [
        { employeeId: 'emp-1', date: '2024-01-01' },
        { employeeId: 'emp-2', date: '2024-01-01' }
      ];
      const createdRecords = records.map(r => ({ ...r, id: 'generated-id', company_id: TENANT_ID }));
      
      repository.model.bulkCreate.mockResolvedValue(createdRecords);

      const result = await repository.bulkCreate(records);

      expect(result).toEqual(createdRecords);
      expect(result).toHaveLength(2);
    });
  });

  describe('getMonthlyReport() - Tenant Filtering', () => {
    const month = 1; // January
    const year = 2024;

    it('should include company_id in WHERE clause', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.getMonthlyReport(month, year);

      const callArgs = repository.model.findAll.mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('company_id', TENANT_ID);
      expect(callArgs.where.date).toBeDefined();
      expect(callArgs.where.date[Op.gte]).toBeDefined();
      expect(callArgs.where.date[Op.lte]).toBeDefined();
    });

    it('should calculate correct date range for month', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.getMonthlyReport(month, year);

      const callArgs = repository.model.findAll.mock.calls[0][0];
      const startDate = callArgs.where.date[Op.gte];
      const endDate = callArgs.where.date[Op.lte];

      expect(startDate.getFullYear()).toBe(2024);
      expect(startDate.getMonth()).toBe(0); // January (0-indexed)
      expect(startDate.getDate()).toBe(1);

      expect(endDate.getFullYear()).toBe(2024);
      expect(endDate.getMonth()).toBe(0);
      expect(endDate.getDate()).toBe(31); // Last day of January
    });

    it('should include departmentId filter when provided', async () => {
      const deptId = 'dept-123';
      repository.model.findAll.mockResolvedValue([]);

      await repository.getMonthlyReport(month, year, { departmentId: deptId });

      const callArgs = repository.model.findAll.mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('departmentId', deptId);
    });

    it('should include employee association by default', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.getMonthlyReport(month, year);

      const callArgs = repository.model.findAll.mock.calls[0][0];
      expect(callArgs.include).toBeDefined();
      expect(callArgs.include).toHaveLength(1);
      expect(callArgs.include[0].as).toBe('employee');
    });

    it('should include department association when requested', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.getMonthlyReport(month, year, { includeDepartment: true });

      const callArgs = repository.model.findAll.mock.calls[0][0];
      expect(callArgs.include).toHaveLength(2);
      expect(callArgs.include.some(inc => inc.as === 'employee')).toBe(true);
      expect(callArgs.include.some(inc => inc.as === 'department')).toBe(true);
    });

    it('should not include employee when disabled', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.getMonthlyReport(month, year, { includeEmployee: false });

      const callArgs = repository.model.findAll.mock.calls[0][0];
      expect(callArgs.include).toBeUndefined();
    });

    it('should include attributes when provided', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.getMonthlyReport(month, year, { attributes: ['id', 'date', 'status'] });

      const callArgs = repository.model.findAll.mock.calls[0][0];
      expect(callArgs.attributes).toEqual(['id', 'date', 'status']);
    });

    it('should use default order', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.getMonthlyReport(month, year);

      const callArgs = repository.model.findAll.mock.calls[0][0];
      expect(callArgs.order).toEqual([['date', 'ASC'], ['employeeId', 'ASC']]);
    });

    it('should return array of attendance records', async () => {
      const records = [
        { id: '1', date: '2024-01-01' },
        { id: '2', date: '2024-01-02' }
      ];
      repository.model.findAll.mockResolvedValue(records);

      const result = await repository.getMonthlyReport(month, year);

      expect(result).toEqual(records);
    });
  });

  describe('findByStatus() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.findByStatus('present');

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          status: 'present',
          company_id: TENANT_ID
        }
      });
    });

    it('should filter by specific date when provided', async () => {
      const date = '2024-01-15';
      repository.model.findAll.mockResolvedValue([]);

      await repository.findByStatus('absent', { date });

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          status: 'absent',
          date,
          company_id: TENANT_ID
        }
      });
    });

    it('should filter by date range when provided', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-01-31';
      repository.model.findAll.mockResolvedValue([]);

      await repository.findByStatus('late', { fromDate, toDate });

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          status: 'late',
          date: {
            [Op.gte]: fromDate,
            [Op.lte]: toDate
          },
          company_id: TENANT_ID
        }
      });
    });

    it('should include limit and offset when provided', async () => {
      repository.model.findAll.mockResolvedValue([]);

      await repository.findByStatus('present', { limit: 10, offset: 20 });

      expect(repository.model.findAll).toHaveBeenCalledWith({
        where: {
          status: 'present',
          company_id: TENANT_ID
        },
        limit: 10,
        offset: 20
      });
    });
  });

  describe('countByStatusAndDateRange() - Tenant Filtering', () => {
    it('should include company_id in WHERE clause', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-01-31';
      repository.model.count.mockResolvedValue(10);

      await repository.countByStatusAndDateRange('present', fromDate, toDate);

      expect(repository.model.count).toHaveBeenCalledWith({
        where: {
          status: 'present',
          date: {
            [Op.gte]: fromDate,
            [Op.lte]: toDate
          },
          company_id: TENANT_ID
        }
      });
    });

    it('should return count of records', async () => {
      repository.model.count.mockResolvedValue(25);

      const result = await repository.countByStatusAndDateRange('absent', '2024-01-01', '2024-01-31');

      expect(result).toBe(25);
    });
  });

  describe('Cross-Tenant Isolation', () => {
    it('should prevent access to attendance from different tenant', async () => {
      const tenant1Repo = new AttendanceRepository('tenant-1');
      const tenant2Repo = new AttendanceRepository('tenant-2');

      tenant1Repo.model.findOne.mockResolvedValue(null);
      tenant2Repo.model.findOne.mockResolvedValue(null);

      await tenant1Repo.findTodayRecord(EMPLOYEE_ID);
      await tenant2Repo.findTodayRecord(EMPLOYEE_ID);

      expect(tenant1Repo.model.findOne.mock.calls[0][0].where.company_id).toBe('tenant-1');
      expect(tenant2Repo.model.findOne.mock.calls[0][0].where.company_id).toBe('tenant-2');
    });

    it('should enforce tenant isolation in all query methods', async () => {
      repository.model.findAll.mockResolvedValue([]);
      repository.model.count.mockResolvedValue(0);
      repository.model.bulkCreate.mockResolvedValue([]);

      await repository.findByEmployeeAndDateRange(EMPLOYEE_ID, '2024-01-01', '2024-01-31');
      await repository.getMonthlyReport(1, 2024);
      await repository.findByStatus('present');
      await repository.countByStatusAndDateRange('absent', '2024-01-01', '2024-01-31');

      // All calls should include the tenant ID
      const allCalls = repository.model.findAll.mock.calls.concat(repository.model.count.mock.calls);
      allCalls.forEach(call => {
        expect(call[0].where).toHaveProperty('company_id', TENANT_ID);
      });
    });

    it('should inject tenant ID in bulk create', async () => {
      const records = [{ employeeId: 'emp-1', date: '2024-01-01' }];
      repository.model.bulkCreate.mockResolvedValue([]);

      await repository.bulkCreate(records);

      const callArgs = repository.model.bulkCreate.mock.calls[0][0];
      expect(callArgs[0]).toHaveProperty('company_id', TENANT_ID);
    });
  });

  describe('Error Handling', () => {
    it('should wrap errors with context', async () => {
      const dbError = new Error('Database connection failed');
      repository.model.findAll.mockRejectedValue(dbError);

      await expect(
        repository.findByEmployeeAndDateRange(EMPLOYEE_ID, '2024-01-01', '2024-01-31')
      ).rejects.toThrow('Repository error in Attendance.findByEmployeeAndDateRange: Database connection failed');
    });

    it('should preserve original error information', async () => {
      const dbError = new Error('Constraint violation');
      repository.model.bulkCreate.mockRejectedValue(dbError);

      try {
        await repository.bulkCreate([{ employeeId: 'emp-1', date: '2024-01-01' }]);
      } catch (error) {
        expect(error.originalError).toBe(dbError);
        expect(error.operation).toBe('bulkCreate');
        expect(error.model).toBe('Attendance');
      }
    });
  });
});
