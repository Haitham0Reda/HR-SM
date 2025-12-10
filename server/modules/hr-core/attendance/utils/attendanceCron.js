import cron from 'node-cron';
import attendanceDeviceService from '../services/attendanceDevice.service.js';
import AttendanceDevice from '../models/attendanceDevice.model.js';
import Attendance from '../models/attendance.model.js';
import logger from './logger.js';

/**
 * Attendance Cron Jobs
 * Handles scheduled tasks for attendance system
 */

let syncTask = null;
let dailySummaryTask = null;

/**
 * Auto-sync biometric devices every 5 minutes
 */
export const startAutoSync = () => {
    if (syncTask) {
        logger.warn('Auto-sync task is already running');
        return;
    }
    
    const syncInterval = process.env.ATTENDANCE_SYNC_INTERVAL || '*/5';
    
    syncTask = cron.schedule(`${syncInterval} * * * *`, async () => {
        try {
            logger.info('Starting scheduled attendance device sync...');
            
            const devices = await AttendanceDevice.getDevicesForSync();
            
            if (devices.length === 0) {
                logger.info('No devices configured for auto-sync');
                return;
            }
            
            let successCount = 0;
            let errorCount = 0;
            let totalProcessed = 0;
            
            for (const device of devices) {
                try {
                    const result = await attendanceDeviceService.syncDevice(device._id);
                    successCount++;
                    totalProcessed += result.processed;
                    logger.info(`Synced device ${device.deviceName}: ${result.processed} records`);
                } catch (error) {
                    errorCount++;
                    logger.error(`Failed to sync device ${device.deviceName}:`, error);
                }
            }
            
            logger.info(`Auto-sync completed: ${successCount} successful, ${errorCount} failed, ${totalProcessed} records processed`);
        } catch (error) {
            logger.error('Error in auto-sync task:', error);
        }
    });
    
    logger.info(`Auto-sync task started (runs every ${syncInterval} minutes)`);
};

/**
 * Stop auto-sync task
 */
export const stopAutoSync = () => {
    if (syncTask) {
        syncTask.stop();
        syncTask = null;
        logger.info('Auto-sync task stopped');
    }
};

/**
 * Generate daily attendance summary at end of day
 * Runs at 11:59 PM every day
 */
export const startDailySummary = () => {
    if (dailySummaryTask) {
        logger.warn('Daily summary task is already running');
        return;
    }
    
    dailySummaryTask = cron.schedule('59 23 * * *', async () => {
        try {
            logger.info('Generating daily attendance summary...');
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const attendance = await Attendance.find({
                date: { $gte: today, $lt: tomorrow }
            });
            
            const summary = {
                date: today,
                total: attendance.length,
                present: 0,
                absent: 0,
                late: 0,
                earlyLeave: 0,
                workFromHome: 0,
                onLeave: 0
            };
            
            attendance.forEach(record => {
                if (record.checkIn.time) {
                    summary.present++;
                    if (record.checkIn.isLate) {
                        summary.late++;
                    }
                } else if (record.isWorkingDay) {
                    summary.absent++;
                }
                
                if (record.checkOut.isEarly) {
                    summary.earlyLeave++;
                }
                
                if (record.workFromHome.isWFH) {
                    summary.workFromHome++;
                }
                
                if (['vacation', 'sick-leave', 'mission'].includes(record.status)) {
                    summary.onLeave++;
                }
            });
            
            logger.info('Daily attendance summary:', summary);
            
            // You can extend this to:
            // - Send email reports to HR
            // - Store summary in database
            // - Generate alerts for high absence rates
            // - Update dashboard metrics
            
        } catch (error) {
            logger.error('Error generating daily summary:', error);
        }
    });
    
    logger.info('Daily summary task started (runs at 11:59 PM)');
};

/**
 * Stop daily summary task
 */
export const stopDailySummary = () => {
    if (dailySummaryTask) {
        dailySummaryTask.stop();
        dailySummaryTask = null;
        logger.info('Daily summary task stopped');
    }
};

/**
 * Start all attendance cron jobs
 */
export const startAllAttendanceTasks = () => {
    startAutoSync();
    startDailySummary();
    logger.info('All attendance cron tasks started');
};

/**
 * Stop all attendance cron jobs
 */
export const stopAllAttendanceTasks = () => {
    stopAutoSync();
    stopDailySummary();
    logger.info('All attendance cron tasks stopped');
};

export default {
    startAutoSync,
    stopAutoSync,
    startDailySummary,
    stopDailySummary,
    startAllAttendanceTasks,
    stopAllAttendanceTasks
};
