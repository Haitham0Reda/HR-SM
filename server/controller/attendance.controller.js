// Attendance Controller
import Attendance from '../models/attendance.model.js';
import { getHolidayInfo } from '../utils/holidayChecker.js';

export const getAllAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find()
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title')
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
