/**
 * Attendance Middleware
 * 
 * Validates and processes attendance-related requests.
 */
import mongoose from 'mongoose';

/**
 * Validate attendance check-in middleware
 * Ensures check-in time is valid
 */
export const validateCheckIn = (req, res, next) => {
    if (req.body.checkIn?.time) {
        const checkInTime = new Date(req.body.checkIn.time);
        const now = new Date();

        // Check-in cannot be more than 24 hours in the past
        const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
        if (checkInTime < twentyFourHoursAgo) {
            return res.status(400).json({
                success: false,
                message: 'Check-in time cannot be more than 24 hours in the past'
            });
        }

        // Check-in cannot be in the future
        if (checkInTime > now) {
            return res.status(400).json({
                success: false,
                message: 'Check-in time cannot be in the future'
            });
        }
    }
    next();
};

/**
 * Validate attendance check-out middleware
 * Ensures check-out is after check-in
 */
export const validateCheckOut = (req, res, next) => {
    if (req.body.checkOut?.time && req.body.checkIn?.time) {
        const checkIn = new Date(req.body.checkIn.time);
        const checkOut = new Date(req.body.checkOut.time);

        if (checkOut <= checkIn) {
            return res.status(400).json({
                success: false,
                message: 'Check-out time must be after check-in time'
            });
        }

        // Maximum work duration check (e.g., 24 hours)
        const diffHours = (checkOut - checkIn) / (1000 * 60 * 60);
        if (diffHours > 24) {
            return res.status(400).json({
                success: false,
                message: 'Work duration cannot exceed 24 hours'
            });
        }
    }
    next();
};

/**
 * Calculate attendance hours middleware
 * Calculates actual hours worked
 */
export const calculateAttendanceHours = (req, res, next) => {
    if (req.body.checkIn?.time && req.body.checkOut?.time) {
        const checkIn = new Date(req.body.checkIn.time);
        const checkOut = new Date(req.body.checkOut.time);

        const diffMs = checkOut - checkIn;
        const actualHours = Math.max(0, diffMs / (1000 * 60 * 60));

        if (!req.body.hours) req.body.hours = {};
        req.body.hours.actual = parseFloat(actualHours.toFixed(2));

        // Calculate overtime if expected hours provided
        if (req.body.hours.expected) {
            req.body.hours.overtime = Math.max(0, actualHours - req.body.hours.expected);
        }
    }
    next();
};

/**
 * Validate work from home request middleware
 */
export const validateWFHRequest = (req, res, next) => {
    if (req.body.workFromHome?.isWFH === true) {
        if (!req.body.workFromHome.reason) {
            return res.status(400).json({
                success: false,
                message: 'Reason is required for work from home requests'
            });
        }
    }
    next();
};

/**
 * Check duplicate attendance middleware
 * Prevents duplicate attendance records for same employee/date
 */
export const checkDuplicateAttendance = async (req, res, next) => {
    try {
        if (req.body.employee && req.body.date) {
            const Attendance = mongoose.model('Attendance');

            const existingAttendance = await Attendance.findOne({
                employee: req.body.employee,
                date: {
                    $gte: new Date(req.body.date).setHours(0, 0, 0, 0),
                    $lte: new Date(req.body.date).setHours(23, 59, 59, 999)
                }
            });

            if (existingAttendance) {
                return res.status(400).json({
                    success: false,
                    message: 'Attendance record already exists for this date',
                    existingRecord: existingAttendance._id
                });
            }
        }
        next();
    } catch (error) {

        next();
    }
};

/**
 * Determine attendance status middleware
 * Auto-determines status based on time and other factors
 */
export const determineAttendanceStatus = (req, res, next) => {
    // If status not provided, determine based on data
    if (!req.body.status) {
        if (req.body.leave) {
            // Has leave approved
            req.body.status = 'vacation';
        } else if (req.body.workFromHome?.isWFH && req.body.workFromHome?.approved) {
            req.body.status = 'work-from-home';
        } else if (req.body.checkIn?.isLate) {
            req.body.status = 'late';
        } else if (req.body.checkIn?.time && req.body.checkOut?.time) {
            req.body.status = 'on-time';
        } else if (!req.body.checkIn?.time && !req.body.checkOut?.time) {
            req.body.status = 'absent';
        } else {
            req.body.status = 'present';
        }
    }
    next();
};
