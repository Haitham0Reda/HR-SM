// Attendance Controller
import Attendance from '../models/attendance.model.js';
import { getHolidayInfo } from '../utils/holidayChecker.js';
import logger from '../utils/logger.js';

export const getAllAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find()
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('device', 'deviceName deviceType')
            .sort({ date: -1 });
        res.json(attendance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createAttendance = async (req, res) => {
    try {
        const attendanceData = { ...req.body };
        
        // Get holiday information for the date
        const holidayInfo = getHolidayInfo(attendanceData.date);
        
        // Automatically set weekend or official holiday
        if (holidayInfo.isWeekend || holidayInfo.isHoliday) {
            attendanceData.status = 'absent';
            attendanceData.notes = holidayInfo.note || 'Official Holiday';
            attendanceData.isWorkingDay = false;
            // Remove check-in/check-out for holidays
            delete attendanceData.checkIn;
            delete attendanceData.checkOut;
        }
        
        const attendance = new Attendance(attendanceData);
        await attendance.save();
        await attendance.populate('employee', 'username email employeeId personalInfo');
        await attendance.populate('department', 'name code');
        await attendance.populate('position', 'title');
        res.status(201).json(attendance);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getAttendanceById = async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id)
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title');
        if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
        res.json(attendance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateAttendance = async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        // Get holiday information for the date if date is being updated
        if (updateData.date) {
            const holidayInfo = getHolidayInfo(updateData.date);
            
            // Automatically set weekend or official holiday
            if (holidayInfo.isWeekend || holidayInfo.isHoliday) {
                updateData.status = 'absent';
                updateData.notes = holidayInfo.note || 'Official Holiday';
                updateData.isWorkingDay = false;
                // Remove check-in/check-out for holidays
                delete updateData.checkIn;
                delete updateData.checkOut;
            }
        }
        
        const attendance = await Attendance.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title');
        if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
        res.json(attendance);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findByIdAndDelete(req.params.id);
        if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
        res.json({ message: 'Attendance deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get today's attendance
 */
export const getTodayAttendance = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const attendance = await Attendance.find({
            date: { $gte: today, $lt: tomorrow }
        })
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('device', 'deviceName deviceType')
            .sort({ 'checkIn.time': -1 });
        
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
            if (record.checkIn.time) {
                summary.present++;
                if (record.checkIn.isLate) {
                    summary.late++;
                } else {
                    summary.onTime++;
                }
            } else {
                summary.absent++;
            }
            
            if (record.checkOut.isEarly) {
                summary.earlyLeave++;
            }
        });
        
        res.json({
            success: true,
            date: today,
            summary,
            data: attendance
        });
    } catch (error) {
        logger.error('Error fetching today\'s attendance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get monthly attendance
 */
export const getMonthlyAttendance = async (req, res) => {
    try {
        const { year, month } = req.query;
        
        const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()), 1);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        
        const attendance = await Attendance.find({
            date: { $gte: startDate, $lte: endDate }
        })
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('device', 'deviceName deviceType')
            .sort({ date: 1, 'employee.employeeId': 1 });
        
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
            
            if (record.checkIn.time) {
                summary.presentDays++;
                if (record.checkIn.isLate) {
                    summary.lateDays++;
                }
            } else if (record.isWorkingDay) {
                summary.absentDays++;
            }
            
            if (record.checkOut.isEarly) {
                summary.earlyLeaveDays++;
            }
        });
        
        summary.uniqueDates = uniqueDates.size;
        
        res.json({
            success: true,
            period: {
                startDate,
                endDate,
                month: startDate.getMonth() + 1,
                year: startDate.getFullYear()
            },
            summary,
            data: attendance
        });
    } catch (error) {
        logger.error('Error fetching monthly attendance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Manual check-in
 */
export const manualCheckIn = async (req, res) => {
    try {
        const { employeeId, date, time, notes } = req.body;
        
        const checkInDate = date ? new Date(date) : new Date();
        checkInDate.setHours(0, 0, 0, 0);
        
        const checkInTime = time ? new Date(time) : new Date();
        
        // Find or create attendance record
        let attendance = await Attendance.findOne({
            employee: employeeId,
            date: checkInDate
        });
        
        if (!attendance) {
            const employee = await Attendance.findOne({ _id: employeeId }).populate('department position');
            
            attendance = new Attendance({
                employee: employeeId,
                department: employee?.department,
                position: employee?.position,
                date: checkInDate,
                source: 'manual'
            });
        }
        
        attendance.checkIn = {
            time: checkInTime,
            method: 'manual',
            location: 'office'
        };
        
        if (notes) {
            attendance.notes = notes;
        }
        
        attendance.approvedBy = req.user._id;
        attendance.approvedAt = new Date();
        
        await attendance.save();
        await attendance.populate('employee', 'username email employeeId personalInfo');
        await attendance.populate('department', 'name code');
        await attendance.populate('position', 'title');
        
        logger.info(`Manual check-in recorded by ${req.user.username} for employee ${employeeId}`);
        
        res.json({
            success: true,
            message: 'Manual check-in recorded successfully',
            data: attendance
        });
    } catch (error) {
        logger.error('Error recording manual check-in:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Manual check-out
 */
export const manualCheckOut = async (req, res) => {
    try {
        const { employeeId, date, time, notes } = req.body;
        
        const checkOutDate = date ? new Date(date) : new Date();
        checkOutDate.setHours(0, 0, 0, 0);
        
        const checkOutTime = time ? new Date(time) : new Date();
        
        // Find attendance record
        const attendance = await Attendance.findOne({
            employee: employeeId,
            date: checkOutDate
        });
        
        if (!attendance) {
            return res.status(404).json({
                success: false,
                error: 'Attendance record not found. Please check-in first.'
            });
        }
        
        attendance.checkOut = {
            time: checkOutTime,
            method: 'manual',
            location: 'office'
        };
        
        if (notes) {
            attendance.notes = attendance.notes ? `${attendance.notes}; ${notes}` : notes;
        }
        
        attendance.approvedBy = req.user._id;
        attendance.approvedAt = new Date();
        
        await attendance.save();
        await attendance.populate('employee', 'username email employeeId personalInfo');
        await attendance.populate('department', 'name code');
        await attendance.populate('position', 'title');
        
        logger.info(`Manual check-out recorded by ${req.user.username} for employee ${employeeId}`);
        
        res.json({
            success: true,
            message: 'Manual check-out recorded successfully',
            data: attendance
        });
    } catch (error) {
        logger.error('Error recording manual check-out:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};
