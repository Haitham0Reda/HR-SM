// Attendance Controller
import AttendanceService from '../services/AttendanceService.js';
import logger from '../../../../utils/logger.js';

const attendanceService = new AttendanceService();

export const getAllAttendance = async (req, res) => {
    try {
        const attendance = await attendanceService.getAllAttendance(req.tenantId);
        res.json(attendance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createAttendance = async (req, res) => {
    try {
        const attendance = await attendanceService.createAttendance(req.body, req.tenantId);
        res.status(201).json(attendance);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getAttendanceById = async (req, res) => {
    try {
        const attendance = await attendanceService.getAttendanceById(req.params.id, req.tenantId);
        res.json(attendance);
    } catch (err) {
        const statusCode = err.message === 'Attendance not found' ? 404 : 500;
        res.status(statusCode).json({ error: err.message });
    }
};

export const updateAttendance = async (req, res) => {
    try {
        const attendance = await attendanceService.updateAttendance(req.params.id, req.body, req.tenantId);
        res.json(attendance);
    } catch (err) {
        const statusCode = err.message === 'Attendance not found' ? 404 : 400;
        res.status(statusCode).json({ error: err.message });
    }
};

export const deleteAttendance = async (req, res) => {
    try {
        const result = await attendanceService.deleteAttendance(req.params.id, req.tenantId);
        res.json(result);
    } catch (err) {
        const statusCode = err.message === 'Attendance not found' ? 404 : 500;
        res.status(statusCode).json({ error: err.message });
    }
};

/**
 * Get today's attendance
 */
export const getTodayAttendance = async (req, res) => {
    try {
        const result = await attendanceService.getTodayAttendance(req.tenantId);
        
        res.json({
            success: true,
            ...result
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
        
        const result = await attendanceService.getMonthlyAttendance(year, month, req.tenantId);
        
        res.json({
            success: true,
            ...result
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
        
        const attendance = await attendanceService.manualCheckIn(
            employeeId, 
            date, 
            time, 
            notes, 
            req.user._id, 
            req.tenantId
        );
        
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
        
        const attendance = await attendanceService.manualCheckOut(
            employeeId, 
            date, 
            time, 
            notes, 
            req.user._id, 
            req.tenantId
        );
        
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
