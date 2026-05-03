const OvertimeRepository = require('../../repositories/OvertimeRepository');
const { Overtime } = require('../../models');

describe('OvertimeRepository', () => {
  let repository;
  const companyId = 1;

  beforeEach(() => {
    repository = new OvertimeRepository(companyId);
    jest.clearAllMocks();
  });

  describe('findByEmployee', () => {
    it('should find overtime records for an employee', async () => {
      const employeeId = 10;
      const mockOvertimes = [
        { id: 1, employee_id: employeeId, company_id: companyId },
        { id: 2, employee_id: employeeId, company_id: companyId }
      ];

      jest.spyOn(Overtime, 'findAll').mockResolvedValue(mockOvertimes);

      const result = await repository.findByEmployee(employeeId);

      expect(Overtime.findAll).toHaveBeenCalledWith({
        where: {
          company_id: companyId,
          employee_id: employeeId
        },
        order: [['date', 'DESC']]
      });
      expect(result).toEqual(mockOvertimes);
    });
  });

  describe('findPending', () => {
    it('should find pending overtime requests', async () => {
      const mockOvertimes = [
        { id: 1, status: 'pending', company_id: companyId },
        { id: 2, status: 'pending', company_id: companyId }
      ];

      jest.spyOn(Overtime, 'findAll').mockResolvedValue(mockOvertimes);

      const result = await repository.findPending();

      expect(Overtime.findAll).toHaveBeenCalledWith({
        where: {
          company_id: companyId,
          status: 'pending'
        },
        order: [['created_at', 'ASC']]
      });
      expect(result).toEqual(mockOvertimes);
    });
  });

  describe('approve', () => {
    it('should approve overtime request with transaction', async () => {
      const overtimeId = 1;
      const approverId = 5;
      const mockTransaction = { id: 'mock-transaction' };
      
      const mockOvertime = {
        id: overtimeId,
        company_id: companyId,
        status: 'pending',
        update: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(Overtime, 'findOne').mockResolvedValue(mockOvertime);

      const result = await repository.approve(overtimeId, approverId, mockTransaction);

      expect(Overtime.findOne).toHaveBeenCalledWith({
        where: {
          id: overtimeId,
          company_id: companyId
        },
        transaction: mockTransaction
      });
      expect(mockOvertime.update).toHaveBeenCalledWith(
        {
          status: 'approved',
          approved_by: approverId,
          approved_at: expect.any(Date)
        },
        { transaction: mockTransaction }
      );
      expect(result).toBe(mockOvertime);
    });

    it('should throw error if overtime not found', async () => {
      const mockTransaction = { id: 'mock-transaction' };
      jest.spyOn(Overtime, 'findOne').mockResolvedValue(null);

      await expect(
        repository.approve(999, 5, mockTransaction)
      ).rejects.toThrow('Overtime request not found');
    });

    it('should throw error if transaction is not provided', async () => {
      await expect(
        repository.approve(1, 5, null)
      ).rejects.toThrow('Transaction is required for approving overtime');
    });
  });
});
