const TaskRepository = require('../../repositories/TaskRepository');
const { Task } = require('../../models');
const { Op } = require('sequelize');

describe('TaskRepository', () => {
  let repository;
  const companyId = 1;

  beforeEach(() => {
    repository = new TaskRepository(companyId);
    jest.clearAllMocks();
  });

  describe('findByAssignee', () => {
    it('should find tasks assigned to a user', async () => {
      const userId = 5;
      const mockTasks = [
        { id: 1, assignee_id: userId, company_id: companyId },
        { id: 2, assignee_id: userId, company_id: companyId }
      ];

      jest.spyOn(Task, 'findAll').mockResolvedValue(mockTasks);

      const result = await repository.findByAssignee(userId);

      expect(Task.findAll).toHaveBeenCalledWith({
        where: {
          company_id: companyId,
          assignee_id: userId
        },
        order: [['due_date', 'ASC']]
      });
      expect(result).toEqual(mockTasks);
    });
  });

  describe('findByStatus', () => {
    it('should find tasks by status', async () => {
      const status = 'in_progress';
      const mockTasks = [{ id: 1, status, company_id: companyId }];

      jest.spyOn(Task, 'findAll').mockResolvedValue(mockTasks);

      const result = await repository.findByStatus(status);

      expect(Task.findAll).toHaveBeenCalledWith({
        where: {
          company_id: companyId,
          status
        },
        order: [['created_at', 'DESC']]
      });
      expect(result).toEqual(mockTasks);
    });
  });

  describe('findOverdue', () => {
    it('should find overdue tasks', async () => {
      const mockTasks = [{ id: 1, due_date: new Date('2020-01-01'), company_id: companyId }];

      jest.spyOn(Task, 'findAll').mockResolvedValue(mockTasks);

      const result = await repository.findOverdue();

      expect(Task.findAll).toHaveBeenCalledWith({
        where: {
          company_id: companyId,
          due_date: {
            [Op.lt]: expect.any(Date)
          },
          status: {
            [Op.notIn]: ['completed', 'cancelled']
          }
        },
        order: [['due_date', 'ASC']]
      });
      expect(result).toEqual(mockTasks);
    });
  });
});
