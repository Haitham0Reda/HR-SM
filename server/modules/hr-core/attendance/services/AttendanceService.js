import AttendanceRepository from '../../../../repositories/modules/AttendanceRepository.js';
import { getHolidayInfo } from '../../holidays/utils/holidayChecker.js';
import logger from '../../../../utils/logger.js';
import { Op } from 'sequelize';

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
  async getAllAttendance(tenantId, filters = {}) {
    const filter = { tenantId };

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      filter.date = {};
      if (filters.startDate) {
        filter.date[Op.gte] = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // Set to end of day for endDate
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter.date[Op.lte] = endDate;
      }
    }

    // Apply employee filter
    if (filters.employee) {
      filter.employee = filters.employee;
    }

    // Apply status filter
    if (filters.status) {
      filter.status = filters.status;
    }

    // Apply department filter
    if (filters.department) {
      filter.department = filters.department;
    }

    const queryOptions = {
      include: [
        { association: 'employee', attributes: ['username', 'email', 'employeeId', 'personalInfo', 'department'] },
        { association: 'department', attributes: ['name', 'code'] },
        { association: 'position', attributes: ['title'] },
        { association: 'device', attributes: ['deviceName', 'deviceType'] }
      ],
      order: [['date', 'DESC']]
    };

    return await this.attendanceRepository.findAll(filter, queryOptions);
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
    return await this.attendanceRepository.findById(attendance.id, {
      include: [
        { association: 'employee', attributes: ['username', 'email', 'employeeId', 'personalInfo'] },
        { association: 'department', attributes: ['name', 'code'] },
        { association: 'position', attributes: ['title'] }
      ]
    });
  }

  /**
   * Get attendance by ID
   */
  async getAttendanceById(id, tenantId) {
    const attendance = await this.attendanceRepository.findOne(
      { id, tenantId },
      {
        include: [
          { association: 'employee', attributes: ['username', 'email', 'employeeId', 'personalInfo'] },
          { association: 'department', attributes: ['name', 'code'] },
          { association: 'position', attributes: ['title'] }
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
      include: [
        { association: 'employee', attributes: ['username', 'email', 'employeeId', 'personalInfo'] },
        { association: 'department', attributes: ['name', 'code'] },
        { association: 'position', attributes: ['title'] }
      ]
    });
  }

  /**
   * Delete attendance record
   */
  async deleteAttendance(id, tenantId) {
    const attendance = await this.attendanceRepository.findOne({ id, tenantId });

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
        include: [
          { association: 'employee', attributes: ['username', 'email', 'employeeId', 'personalInfo'] },
          { association: 'department', attributes: ['name', 'code'] },
          { association: 'position', attributes: ['title'] },
          { association: 'device', attributes: ['deviceName', 'deviceType'] }
        ],
        order: [[{ model: require('../../../../modules/hr-core/attendance/models/attendance.model.js').default.sequelize.literal('"checkIn->time"'), 'DESC' }]]
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
        include: [
          { association: 'employee', attributes: ['username', 'email', 'employeeId', 'personalInfo'] },
          { association: 'department', attributes: ['name', 'code'] },
          { association: 'position', attributes: ['title'] },
          { association: 'device', attributes: ['deviceName', 'deviceType'] }
        ],
        order: [['date', 'ASC'], [{ association: 'employee' }, 'employeeId', 'ASC']]
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
      const employee = await this.attendanceRepository.findOne({ id: employeeId });

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

    await this.attendanceRepository.update(attendance.id, updateData);

    logger.info(`Manual check-in recorded by ${approvedBy} for employee ${employeeId}`);

    // Return populated attendance
    return await this.attendanceRepository.findById(attendance.id, {
      include: [
        { association: 'employee', attributes: ['username', 'email', 'employeeId', 'personalInfo'] },
        { association: 'department', attributes: ['name', 'code'] },
        { association: 'position', attributes: ['title'] }
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

    await this.attendanceRepository.update(attendance.id, updateData);

    logger.info(`Manual check-out recorded by ${approvedBy} for employee ${employeeId}`);

    // Return populated attendance
    return await this.attendanceRepository.findById(attendance.id, {
      include: [
        { association: 'employee', attributes: ['username', 'email', 'employeeId', 'personalInfo'] },
        { association: 'department', attributes: ['name', 'code'] },
        { association: 'position', attributes: ['title'] }
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