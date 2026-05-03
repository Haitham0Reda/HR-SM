const LeaveRepository = require('../../repositories/LeaveRepository');
const { Leave, sequelize } = require('../../models');

describe('LeaveRepository', () => {
  let repository;
  const companyId = 1;

  beforeEach(() => {
    repository = new LeaveRepository(companyId);
    jest.clearAllMocks();
  });

  describe('findPendingByManager', () => {
    it('should find pending leave requests for a manager', async () => {
      const managerId = 5;
      const mockLeaves = [
        { id: 1, manager_id: managerId, status: 'pending', company_id: companyId },
        { id: 2, manager_id: managerId, status: 'pending', company_id: companyId }
      ];

      jest.spyOn(Leave, 'findAll').mockResolvedValue(mockLeaves);

      const result = await repository.findPendingByManager(managerId);

      expect(Leave.findAll).toHaveBeenCalledWith({
        where: {
          company_id: companyId,
          manager_id: managerId,
          status: 'pending'
        },
        order: [['created_at', 'ASC']]
      });
      expect(result).toEqual(mockLeaves);
    });
  });

  describe('findByEmployee', () => {
    it('should find all leave requests for an employee', async () => {
      const employeeId = 10;
      const mockLeaves = [
        { id: 1, employee_id: employeeId, company_id: companyId },
        { id: 2, employee_id: employeeId, company_id: companyId }
      ];

      jest.spyOn(Leave, 'findAll').mockResolvedValue(mockLeaves);

      const result = await repository.findByEmployee(employeeId);

      expect(Leave.findAll).toHaveBeenCalledWith({
        where: {
          company_id: companyId,
          employee_id: employeeId
        },
        order: [['start_date', 'DESC']]
      });
      expect(result).toEqual(mockLeaves);
    });
  });

  describe('findByStatus', () => {
    it('should find leave requests by status', async () => {
      const status = 'approved';
      const mockLeaves = [
        { id: 1, status: 'approved', company_id: companyId },
        { id: 2, status: 'approved', company_id: companyId }
      ];

      jest.spyOn(Leave, 'findAll').mockResolvedValue(mockLeaves);

      const result = await repository.findByStatus(status);

      expect(Leave.findAll).toHaveBeenCalledWith({
        where: {
          company_id: companyId,
          status
        },
        order: [['created_at', 'DESC']]
      });
      expect(result).toEqual(mockLeaves);
    });
  });

  describe('updateStatus', () => {
    it('should update leave status with transaction', async () => {
      const leaveId = 1;
      const status = 'approved';
      const approverId = 5;
      const mockTransaction = { id: 'mock-transaction' };
      
      const mockLeave = {
        id: leaveId,
        company_id: companyId,
        status: 'pending',
        update: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(Leave, 'findOne').mockResolvedValue(mockLeave);

      const result = await repository.updateStatus(leaveId, status, approverId, mockTransaction);

      expect(Leave.findOne).toHaveBeenCalledWith({
        where: {
          id: leaveId,
          company_id: companyId
        },
        transaction: mockTransaction
      });
      expect(mockLeave.update).toHaveBeenCalledWith(
        {
          status,
          approved_by: approverId,
          approved_at: expect.any(Date)
        },
        { transaction: mockTransaction }
      );
      expect(result).toBe(mockLeave);
    });

    it('should throw error if leave not found', async () => {
      const leaveId = 999;
      const mockTransaction = { id: 'mock-transaction' };

      jest.spyOn(Leave, 'findOne').mockResolvedValue(null);

      await expect(
        repository.updateStatus(leaveId, 'approved', 5, mockTransaction)
      ).rejects.toThrow('Leave request not found');
    });
  });
});
