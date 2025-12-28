import AttendanceService from '../../modules/hr-core/attendance/services/AttendanceService.js';
import AttendanceRepository from '../../repositories/modules/AttendanceRepository.js';

// Mock the dependencies
jest.mock('../../repositories/modules/AttendanceRepository.js');
jest.mock('../../modules/hr-core/holidays/utils/holidayChecker.js', () => ({
  getHolidayInfo: jest.fn(() => ({ isWeekend: false, isHoliday: false }))
}));

describe('AttendanceService Integration Tests', () => {
  let attendanceService;
  let mockAttendanceRepository;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock repository instance
    mockAttendanceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByDateRange: jest.fn(),
      findByEmployee: jest.fn(),
      findByDepartment: jest.fn()
    };
    
    // Mock the AttendanceRepository constructor
    AttendanceRepository.mockImplementation(() => mockAttendanceRepository);
    
    attendanceService = new AttendanceService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAllAttendance', () => {
    it('should get all attendance records with tenant filter', async () => {
      // Arrange
      const mockAttendance = [
        { _id: '1', employee: 'emp1', date: new Date(), status: 'present' },
        { _id: '2', employee: 'emp2', date: new Date(), status: 'absent' }
      ];
      
      mockAttendanceRepository.find.mockResolvedValue(mockAttendance);

      // Act
      const result = await attendanceService.getAllAttendance('tenant123');

      // Assert
      expect(result).toEqual(mockAttendance);
      expect(mockAttendanceRepository.find).toHaveBeenCalledWith(
        { tenantId: 'tenant123' },
        expect.objectContaining({
          populate: expect.arrayContaining([
            { path: 'employee', select: 'username email employeeId personalInfo' },
            { path: 'department', select: 'name code' },
            { path: 'position', select: 'title' },
            { path: 'device', select: 'deviceName deviceType' }
          ]),
          sort: { date: -1 }
        })
      );
    });
  });

  describe('createAttendance', () => {
    it('should create attendance record successfully', async () => {
      // Arrange
      const attendanceData = {
        employee: 'emp1',
        date: new Date(),
        checkIn: { time: new Date() }
      };
      const createdAttendance = { _id: '1', ...attendanceData };
      const populatedAttendance = { ...createdAttendance, employee: { name: 'John Doe' } };

      mockAttendanceRepository.create.mockResolvedValue(createdAttendance);
      mockAttendanceRepository.findById.mockResolvedValue(populatedAttendance);

      // Act
      const result = await attendanceService.createAttendance(attendanceData, 'tenant123');

      // Assert
      expect(result).toEqual(populatedAttendance);
      expect(mockAttendanceRepository.create).toHaveBeenCalledWith({
        ...attendanceData,
        tenantId: 'tenant123'
      });
      expect(mockAttendanceRepository.findById).toHaveBeenCalledWith('1', expect.any(Object));
    });
  });

  describe('getAttendanceById', () => {
    it('should get attendance by ID successfully', async () => {
      // Arrange
      const mockAttendance = { _id: '1', employee: 'emp1', date: new Date() };
      mockAttendanceRepository.findOne.mockResolvedValue(mockAttendance);

      // Act
      const result = await attendanceService.getAttendanceById('1', 'tenant123');

      // Assert
      expect(result).toEqual(mockAttendance);
      expect(mockAttendanceRepository.findOne).toHaveBeenCalledWith(
        { _id: '1', tenantId: 'tenant123' },
        expect.objectContaining({
          populate: expect.any(Array)
        })
      );
    });

    it('should throw error when attendance not found', async () => {
      // Arrange
      mockAttendanceRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(attendanceService.getAttendanceById('1', 'tenant123')).rejects.toThrow('Attendance not found');
    });
  });

  describe('updateAttendance', () => {
    it('should update attendance record successfully', async () => {
      // Arrange
      const updateData = { status: 'present' };
      const updatedAttendance = { _id: '1', status: 'present' };

      mockAttendanceRepository.update.mockResolvedValue(updatedAttendance);
      mockAttendanceRepository.findById.mockResolvedValue(updatedAttendance);

      // Act
      const result = await attendanceService.updateAttendance('1', updateData, 'tenant123');

      // Assert
      expect(result).toEqual(updatedAttendance);
      expect(mockAttendanceRepository.update).toHaveBeenCalledWith('1', updateData);
      expect(mockAttendanceRepository.findById).toHaveBeenCalledWith('1', expect.any(Object));
    });

    it('should throw error when attendance not found for update', async () => {
      // Arrange
      mockAttendanceRepository.update.mockResolvedValue(null);

      // Act & Assert
      await expect(attendanceService.updateAttendance('1', {}, 'tenant123')).rejects.toThrow('Attendance not found');
    });
  });

  describe('deleteAttendance', () => {
    it('should delete attendance record successfully', async () => {
      // Arrange
      const existingAttendance = { _id: '1', employee: 'emp1' };
      mockAttendanceRepository.findOne.mockResolvedValue(existingAttendance);
      mockAttendanceRepository.delete.mockResolvedValue(true);

      // Act
      const result = await attendanceService.deleteAttendance('1', 'tenant123');

      // Assert
      expect(result).toEqual({ message: 'Attendance deleted' });
      expect(mockAttendanceRepository.findOne).toHaveBeenCalledWith({ _id: '1', tenantId: 'tenant123' });
      expect(mockAttendanceRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw error when attendance not found for deletion', async () => {
      // Arrange
      mockAttendanceRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(attendanceService.deleteAttendance('1', 'tenant123')).rejects.toThrow('Attendance not found');
    });
  });

  describe('getTodayAttendance', () => {
    it('should get today\'s attendance with summary', async () => {
      // Arrange
      const mockAttendance = [
        { 
          _id: '1', 
          employee: 'emp1', 
          checkIn: { time: new Date(), isLate: false },
          checkOut: { isEarly: false }
        },
        { 
          _id: '2', 
          employee: 'emp2', 
          checkIn: { time: new Date(), isLate: true },
          checkOut: { isEarly: true }
        },
        { 
          _id: '3', 
          employee: 'emp3', 
          checkIn: null,
          checkOut: null
        }
      ];

      mockAttendanceRepository.findByDateRange.mockResolvedValue(mockAttendance);

      // Act
      const result = await attendanceService.getTodayAttendance('tenant123');

      // Assert
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('data', mockAttendance);
      
      expect(result.summary).toEqual({
        total: 3,
        present: 2,
        absent: 1,
        late: 1,
        earlyLeave: 1,
        onTime: 1
      });

      expect(mockAttendanceRepository.findByDateRange).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        'tenant123',
        expect.any(Object)
      );
    });
  });

  describe('manualCheckIn', () => {
    it('should record manual check-in successfully', async () => {
      // Arrange
      const existingAttendance = null;
      const createdAttendance = { _id: '1', employee: 'emp1' };
      const populatedAttendance = { ...createdAttendance, employee: { name: 'John' } };

      mockAttendanceRepository.findOne.mockResolvedValue(existingAttendance);
      mockAttendanceRepository.create.mockResolvedValue(createdAttendance);
      mockAttendanceRepository.update.mockResolvedValue({});
      mockAttendanceRepository.findById.mockResolvedValue(populatedAttendance);

      // Act
      const result = await attendanceService.manualCheckIn(
        'emp1', 
        new Date(), 
        new Date(), 
        'Manual entry', 
        'approver1', 
        'tenant123'
      );

      // Assert
      expect(result).toEqual(populatedAttendance);
      expect(mockAttendanceRepository.create).toHaveBeenCalled();
      expect(mockAttendanceRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          checkIn: expect.objectContaining({
            method: 'manual',
            location: 'office'
          }),
          approvedBy: 'approver1',
          notes: 'Manual entry'
        })
      );
    });
  });

  describe('manualCheckOut', () => {
    it('should record manual check-out successfully', async () => {
      // Arrange
      const existingAttendance = { _id: '1', employee: 'emp1', notes: 'Existing note' };
      const populatedAttendance = { ...existingAttendance, employee: { name: 'John' } };

      mockAttendanceRepository.findOne.mockResolvedValue(existingAttendance);
      mockAttendanceRepository.update.mockResolvedValue({});
      mockAttendanceRepository.findById.mockResolvedValue(populatedAttendance);

      // Act
      const result = await attendanceService.manualCheckOut(
        'emp1', 
        new Date(), 
        new Date(), 
        'Manual checkout', 
        'approver1', 
        'tenant123'
      );

      // Assert
      expect(result).toEqual(populatedAttendance);
      expect(mockAttendanceRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          checkOut: expect.objectContaining({
            method: 'manual',
            location: 'office'
          }),
          approvedBy: 'approver1',
          notes: 'Existing note; Manual checkout'
        })
      );
    });

    it('should throw error when attendance record not found for check-out', async () => {
      // Arrange
      mockAttendanceRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        attendanceService.manualCheckOut('emp1', new Date(), new Date(), 'notes', 'approver1', 'tenant123')
      ).rejects.toThrow('Attendance record not found. Please check-in first.');
    });
  });
});