const PayrollRepository = require('../../repositories/PayrollRepository');
const { Payroll, sequelize } = require('../../models');

describe('PayrollRepository', () => {
  let repository;
  const companyId = 1;

  beforeEach(() => {
    repository = new PayrollRepository(companyId);
    jest.clearAllMocks();
  });

  describe('findByMonth', () => {
    it('should find payroll records for a specific month', async () => {
      const month = 5;
      const year = 2024;
      const mockPayrolls = [
        { id: 1, month, year, company_id: companyId },
        { id: 2, month, year, company_id: companyId }
      ];

      jest.spyOn(Payroll, 'findAll').mockResolvedValue(mockPayrolls);

      const result = await repository.findByMonth(month, year);

      expect(Payroll.findAll).toHaveBeenCalledWith({
        where: {
          company_id: companyId,
          month,
          year
        },
        order: [['employee_id', 'ASC']]
      });
      expect(result).toEqual(mockPayrolls);
    });
  });

  describe('findByEmployee', () => {
    it('should find payroll records for an employee', async () => {
      const employeeId = 10;
      const mockPayrolls = [
        { id: 1, employee_id: employeeId, company_id: companyId },
        { id: 2, employee_id: employeeId, company_id: companyId }
      ];

      jest.spyOn(Payroll, 'findAll').mockResolvedValue(mockPayrolls);

      const result = await repository.findByEmployee(employeeId);

      expect(Payroll.findAll).toHaveBeenCalledWith({
        where: {
          company_id: companyId,
          employee_id: employeeId
        },
        order: [['year', 'DESC'], ['month', 'DESC']]
      });
      expect(result).toEqual(mockPayrolls);
    });
  });

  describe('processPayroll', () => {
    it('should process payroll for multiple employees with transaction', async () => {
      const employeeIds = [1, 2, 3];
      const month = 5;
      const year = 2024;
      const mockTransaction = { id: 'mock-transaction' };
      const mockPayrolls = employeeIds.map(id => ({ id, employee_id: id }));

      jest.spyOn(Payroll, 'bulkCreate').mockResolvedValue(mockPayrolls);

      const result = await repository.processPayroll(employeeIds, month, year, mockTransaction);

      expect(Payroll.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            company_id: companyId,
            employee_id: 1,
            month,
            year,
            status: 'processed',
            processed_at: expect.any(Date)
          })
        ]),
        { transaction: mockTransaction }
      );
      expect(result).toEqual(mockPayrolls);
    });

    it('should throw error if transaction is not provided', async () => {
      await expect(
        repository.processPayroll([1, 2], 5, 2024, null)
      ).rejects.toThrow('Transaction is required for payroll processing');
    });
  });

  describe('lockPeriod', () => {
    it('should lock payroll period with transaction', async () => {
      const month = 5;
      const year = 2024;
      const mockTransaction = { id: 'mock-transaction' };

      jest.spyOn(Payroll, 'update').mockResolvedValue([3]);

      const result = await repository.lockPeriod(month, year, mockTransaction);

      expect(Payroll.update).toHaveBeenCalledWith(
        {
          is_locked: true,
          locked_at: expect.any(Date)
        },
        {
          where: {
            company_id: companyId,
            month,
            year,
            is_locked: false
          },
          transaction: mockTransaction
        }
      );
      expect(result).toBe(3);
    });

    it('should throw error if transaction is not provided', async () => {
      await expect(
        repository.lockPeriod(5, 2024, null)
      ).rejects.toThrow('Transaction is required for locking payroll period');
    });
  });
});
