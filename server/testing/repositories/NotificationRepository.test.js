const NotificationRepository = require('../../repositories/NotificationRepository');
const { Notification } = require('../../models');

describe('NotificationRepository', () => {
  let repository;
  const companyId = 1;

  beforeEach(() => {
    repository = new NotificationRepository(companyId);
    jest.clearAllMocks();
  });

  describe('findUnread', () => {
    it('should find unread notifications for a user', async () => {
      const userId = 5;
      const mockNotifications = [
        { id: 1, user_id: userId, is_read: false, company_id: companyId },
        { id: 2, user_id: userId, is_read: false, company_id: companyId }
      ];

      jest.spyOn(Notification, 'findAll').mockResolvedValue(mockNotifications);

      const result = await repository.findUnread(userId);

      expect(Notification.findAll).toHaveBeenCalledWith({
        where: {
          company_id: companyId,
          user_id: userId,
          is_read: false
        },
        order: [['created_at', 'DESC']]
      });
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('markAsRead', () => {
    it('should mark notifications as read with transaction', async () => {
      const ids = [1, 2, 3];
      const mockTransaction = { id: 'mock-transaction' };

      jest.spyOn(Notification, 'update').mockResolvedValue([3]);

      const result = await repository.markAsRead(ids, mockTransaction);

      expect(Notification.update).toHaveBeenCalledWith(
        {
          is_read: true,
          read_at: expect.any(Date)
        },
        {
          where: {
            company_id: companyId,
            id: ids
          },
          transaction: mockTransaction
        }
      );
      expect(result).toBe(3);
    });

    it('should throw error if transaction is not provided', async () => {
      await expect(
        repository.markAsRead([1, 2], null)
      ).rejects.toThrow('Transaction is required for marking notifications as read');
    });
  });

  describe('bulkCreate', () => {
    it('should bulk create notifications with transaction', async () => {
      const notifications = [
        { user_id: 1, message: 'Test 1' },
        { user_id: 2, message: 'Test 2' }
      ];
      const mockTransaction = { id: 'mock-transaction' };
      const mockCreated = notifications.map((n, i) => ({ id: i + 1, ...n, company_id: companyId }));

      jest.spyOn(Notification, 'bulkCreate').mockResolvedValue(mockCreated);

      const result = await repository.bulkCreate(notifications, mockTransaction);

      expect(Notification.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ company_id: companyId })
        ]),
        { transaction: mockTransaction }
      );
      expect(result).toEqual(mockCreated);
    });

    it('should throw error if transaction is not provided', async () => {
      await expect(
        repository.bulkCreate([{ user_id: 1 }], null)
      ).rejects.toThrow('Transaction is required for bulk creating notifications');
    });
  });
});
