import mongoose from 'mongoose';
import Attendance from '../../modules/hr-core/attendance/models/attendance.model.js';

describe('Attendance Model', () => {
  it('should create and save an attendance record successfully', async () => {
    const attendanceData = {
      tenantId: 'test_tenant_123',
      employee: new mongoose.Types.ObjectId(),
      date: new Date(),
      status: 'present',
      schedule: {
        startTime: '09:00',
        endTime: '17:00',
        expectedHours: 8
      },
      hours: {
        actual: 8,
        expected: 8,
        overtime: 0,
        workFromHome: 0,
        totalHours: 8
      }
    };

    const attendance = new Attendance(attendanceData);
    const savedAttendance = await attendance.save();

    expect(savedAttendance._id).toBeDefined();
    expect(savedAttendance.employee.toString()).toBe(attendanceData.employee.toString());
    expect(savedAttendance.status).toBe(attendanceData.status);
    expect(savedAttendance.schedule.startTime).toBe(attendanceData.schedule.startTime);
    expect(savedAttendance.hours.totalHours).toBe(attendanceData.hours.totalHours);
  });

  it('should calculate total working hours correctly', async () => {
    const attendanceData = {
      tenantId: 'test_tenant_123',
      employee: new mongoose.Types.ObjectId(),
      date: new Date(),
      status: 'present',
      schedule: {
        startTime: '09:00',
        endTime: '17:00',
        expectedHours: 8
      },
      hours: {
        actual: 7,
        expected: 8,
        overtime: 0,
        workFromHome: 1,
        totalHours: 8
      }
    };

    const attendance = new Attendance(attendanceData);
    const savedAttendance = await attendance.save();

    expect(savedAttendance.totalWorkingHours).toBe(8);
  });
});
