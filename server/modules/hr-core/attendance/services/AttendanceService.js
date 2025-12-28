import AttendanceRepository from '../../../../repositories/modules/AttendanceRepository.js';
import { getHolidayInfo } from '../../holidays/utils/holidayChecker.js';
import logger from '../../../../utils/logger.js';

/**
 * Attendance Service - Business logic layer for attendance operations
 * Uses AttendanceRepository for data access
 */
class AttendanceService {
  constructor() {
    this.attendanceRepository = new AttendanceRepository();
  }

  /**
   * Get all attendance records
   */
  async getAllAttendance(tenantId, options = {}) {
    const filter = { tenantId };
    const queryOptions = {
      populate: [
        { path: 'employee', select: 'username email employeeId personalInfo' },
        { path: 'department', select: 'name code' },
        { path: 'position', select: 'title' },
        { path: 'device', select: 'deviceName deviceType' }
      ],
      sort: { date: -1 },
      ...options
    };

    return await this.attendanceRepository.find(filter, queryOptions);
  }

  /**
   * Create attendance record
   */
  async createAttendance(attendanceData, tenantId) {
    const dataToCreate = { 
      ...attendanceData, 
      tenantId 
    };
    
    // Get holiday information for the date
    const holidayInfo = getHolidayInfo(dataToCreate.date);
    
    // Automatically set weekend or official holiday
    if (holidayInfo.isWeekend || holidayInfo.isHoliday) {
      dataToCreate.status = 'absent';
      dataToCreate.notes = holidayInfo.note || 'Official Holiday';
      dataToCreate.isWorkingDay = false;
      // Remove check-in/check-out for holidays
      delete dataToCreate.checkIn;
      delete dataToCreate.checkOut;
    }
    
    const attendance = await this.attendanceRepository.create(dataToCreate);
    
    // Return populated attendance
    return await this.attendanceRepository.findById(attendance._id, {
      populate: [
        { path: 'employee', select: 'username email employeeId personalInfo' },
        { path: 'department', select: 'name code' },
        { path: 'position', select: 'title' }
      ]
    });
  }

  /**
   * Get attendance by ID
   */
  async getAttendanceById(id, tenantId) {
    const attendance = await this.attendanceRepository.findOne(
      { _id: id, tenantId },
      {
        populate: [
          { path: 'employee', select: 'username email employeeId personalInfo' },
          { path: 'department', select: 'name code' },
          { path: 'position', select: 'title' }
        ]
      }
    );

    if (!attendance) {
      throw new Error('Attendance not found');
    }

    return attendance;
  }

  /**
   * Update attendance record
   */
  async updateAttendance(id, updateData, tenantId) {
    const dataToUpdate = { ...updateData };
    
    // Get holiday information for the date if date is being updated
    if (dataToUpdate.date) {
      const holidayInfo = getHolidayInfo(dataToUpdate.date);
      
      // Automatically set weekend or official holiday
      if (holidayInfo.isWeekend || holidayInfo.isHoliday) {
        dataToUpdate.status = 'absent';
        dataToUpdate.notes = holidayInfo.note || 'Official Holiday';
        dataToUpdate.isWorkingDay = false;
        // Remove check-in/check-out for holidays
        delete dataToUpdate.checkIn;
        delete dataToUpdate.checkOut;
      }
    }
    
    const attendance = await this.attendanceRepository.update(id, dataToUpdate);
    
    if (!attendance) {
      throw new Error('Attendance not found');
    }

    // Return populated attendance
    return await this.attendanceRepository.findById(id, {
      populate: [
        { path: 'employee', select: 'username email employeeId personalInfo' },
        { path: 'department', select: 'name code' },
        { path: 'position', select: 'title' }
      ]
    });
  }

  /**
   * Delete attendance record
   */
  async deleteAttendance(id, tenantId) {
    const attendance = await this.attendanceRepository.findOne({ _id: id, tenantId });
    
    if (!attendance) {
      throw new Error('Attendance not found');
    }

    await this.attendanceRepository.delete(id);
    return { message: 'Attendance deleted' };
  }

  /**
   * Get today's attendance
   */
  async getTodayAttendance(tenantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await this.attendanceRepository.findByDateRange(
      today,
      tomorrow,
      tenantId,
      {
        populate: [
          { path: 'employee', select: 'username email employeeId personalInfo' },
          { path: 'department', select: 'name code' },
          { path: 'position', select: 'title' },
          { path: 'device', select: 'deviceName deviceType' }
        ],
        sort: { 'checkIn.time': -1 }
      }
    );
    
    // Calculate summary
    const summary = {
      total: attendance.length,
      present: 0,
      absent: 0,
      late: 0,
      earlyLeave: 0,
      onTime: 0
    };
    
    attendance.forEach(record => {
      if (record.checkIn && record.checkIn.time) {
        summary.present++;
        if (record.checkIn.isLate) {
          summary.late++;
        } else {
          summary.onTime++;
        }
      } else {
        summary.absent++;
      }
      
      if (record.checkOut && record.checkOut.isEarly) {
        summary.earlyLeave++;
      }
    });
    
    return {
      date: today,
      summary,
      data: attendance
    };
  }

  /**
   * Get monthly attendance
   */
  async getMonthlyAttendance(year, month, tenantId) {
    const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()), 1);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const attendance = await this.attendanceRepository.findByDateRange(
      startDate,
      endDate,
      tenantId,
      {
        populate: [
          { path: 'employee', select: 'username email employeeId personalInfo' },
          { path: 'department', select: 'name code' },
          { path: 'position', select: 'title' },
          { path: 'device', select: 'deviceName deviceType' }
        ],
        sort: { date: 1, 'employee.employeeId': 1 }
      }
    );
    
    // Calculate monthly summary
    const summary = {
      totalRecords: attendance.length,
      workingDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      earlyLeaveDays: 0
    };
    
    const uniqueDates = new Set();
    
    attendance.forEach(record => {
      uniqueDates.add(record.date.toISOString().split('T')[0]);
      
      if (record.isWorkingDay) {
        summary.workingDays++;
      }
      
      if (record.checkIn && record.checkIn.time) {
        summary.presentDays++;
        if (record.checkIn.isLate) {
          summary.lateDays++;
        }
      } else if (record.isWorkingDay) {
        summary.absentDays++;
      }
      
      if (record.checkOut && record.checkOut.isEarly) {
        summary.earlyLeaveDays++;
      }
    });
    
    summary.uniqueDates = uniqueDates.size;
    
    return {
      period: {
        startDate,
        endDate,
        month: startDate.getMonth() + 1,
        year: startDate.getFullYear()
      },
      summary,
      data: attendance
    };
  }

  /**
   * Manual check-in
   */
  async manualCheckIn(employeeId, date, time, notes, approvedBy, tenantId) {
    const checkInDate = date ? new Date(date) : new Date();
    checkInDate.setHours(0, 0, 0, 0);
    
    const checkInTime = time ? new Date(time) : new Date();
    
    // Find or create attendance record
    let attendance = await this.attendanceRepository.findOne({
      employee: employeeId,
      date: checkInDate,
      tenantId
    });
    
    if (!attendance) {
      // Get employee info for department and position
      const employee = await this.attendanceRepository.findOne({ _id: employeeId });
      
      const attendanceData = {
        employee: employeeId,
        department: employee?.department,
        position: employee?.position,
        date: checkInDate,
        source: 'manual',
        tenantId
      };
      
      attendance = await this.attendanceRepository.create(attendanceData);
    }
    
    const updateData = {
      checkIn: {
        time: checkInTime,
        method: 'manual',
        location: 'office'
      },
      approvedBy,
      approvedAt: new Date()
    };
    
    if (notes) {
      updateData.notes = notes;
    }
    
    await this.attendanceRepository.update(attendance._id, updateData);
    
    logger.info(`Manual check-in recorded by ${approvedBy} for employee ${employeeId}`);
    
    // Return populated attendance
    return await this.attendanceRepository.findById(attendance._id, {
      populate: [
        { path: 'employee', select: 'username email employeeId personalInfo' },
        { path: 'department', select: 'name code' },
        { path: 'position', select: 'title' }
      ]
    });
  }

  /**
   * Manual check-out
   */
  async manualCheckOut(employeeId, date, time, notes, approvedBy, tenantId) {
    const checkOutDate = date ? new Date(date) : new Date();
    checkOutDate.setHours(0, 0, 0, 0);
    
    const checkOutTime = time ? new Date(time) : new Date();
    
    // Find attendance record
    const attendance = await this.attendanceRepository.findOne({
      employee: employeeId,
      date: checkOutDate,
      tenantId
    });
    
    if (!attendance) {
      throw new Error('Attendance record not found. Please check-in first.');
    }
    
    const updateData = {
      checkOut: {
        time: checkOutTime,
        method: 'manual',
        location: 'office'
      },
      approvedBy,
      approvedAt: new Date()
    };
    
    if (notes) {
      updateData.notes = attendance.notes ? `${attendance.notes}; ${notes}` : notes;
    }
    
    await this.attendanceRepository.update(attendance._id, updateData);
    
    logger.info(`Manual check-out recorded by ${approvedBy} for employee ${employeeId}`);
    
    // Return populated attendance
    return await this.attendanceRepository.findById(attendance._id, {
      populate: [
        { path: 'employee', select: 'username email employeeId personalInfo' },
        { path: 'department', select: 'name code' },
        { path: 'position', select: 'title' }
      ]
    });
  }

  /**
   * Get attendance by employee
   */
  async getAttendanceByEmployee(employeeId, tenantId, options = {}) {
    return await this.attendanceRepository.findByEmployee(employeeId, tenantId, options);
  }

  /**
   * Get attendance by department
   */
  async getAttendanceByDepartment(departmentId, tenantId, options = {}) {
    return await this.attendanceRepository.findByDepartment(departmentId, tenantId, options);
  }
}

export default AttendanceService;