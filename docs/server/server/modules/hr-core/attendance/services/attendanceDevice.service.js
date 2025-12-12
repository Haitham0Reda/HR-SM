import AttendanceDevice from '../models/attendanceDevice.model.js';
import Attendance from '../models/attendance.model.js';
import User from '../../users/models/user.model.js';
import logger from '../../../../utils/logger.js';
import axios from 'axios';

/**
 * Attendance Device Service
 * Handles integration with various attendance systems
 */

class AttendanceDeviceService {
    /**
     * Connect to ZKTeco device
     * @param {Object} device - Device configuration
     * @returns {Promise<Object>} Connection result
     */
    async connectToZKTeco(device) {
        try {
            logger.info(`Attempting to connect to ZKTeco device: ${device.deviceName}`);
            
            // Placeholder for ZKTeco SDK integration
            // In production, you would use a ZKTeco SDK or library
            // Example: zklib, node-zklib, or similar
            
            const connectionConfig = {
                ip: device.ipAddress,
                port: device.port || 4370,
                timeout: 5000
            };
            
            // TODO: Implement actual ZKTeco connection
            // const zkInstance = new ZKLib(connectionConfig);
            // await zkInstance.connect();
            
            logger.info(`Successfully connected to ZKTeco device: ${device.deviceName}`);
            
            return {
                success: true,
                message: 'Connected to ZKTeco device',
                deviceInfo: {
                    name: device.deviceName,
                    type: 'zkteco',
                    ...connectionConfig
                }
            };
        } catch (error) {
            logger.error(`Failed to connect to ZKTeco device ${device.deviceName}:`, error);
            throw new Error(`ZKTeco connection failed: ${error.message}`);
        }
    }

    /**
     * Pull attendance logs from ZKTeco device
     * @param {Object} device - Device configuration
     * @returns {Promise<Array>} Array of attendance logs
     */
    async pullZKTecoLogs(device) {
        try {
            logger.info(`Pulling logs from ZKTeco device: ${device.deviceName}`);
            
            // Placeholder for ZKTeco log retrieval
            // In production, you would:
            // 1. Connect to device
            // 2. Fetch attendance logs since last sync
            // 3. Parse and normalize the data
            
            // TODO: Implement actual ZKTeco log pulling
            // const zkInstance = new ZKLib({ ip: device.ipAddress, port: device.port });
            // await zkInstance.connect();
            // const logs = await zkInstance.getAttendance();
            // await zkInstance.disconnect();
            
            // Example placeholder data structure
            const logs = [];
            
            logger.info(`Retrieved ${logs.length} logs from ZKTeco device: ${device.deviceName}`);
            
            return logs;
        } catch (error) {
            logger.error(`Failed to pull logs from ZKTeco device ${device.deviceName}:`, error);
            throw new Error(`ZKTeco log retrieval failed: ${error.message}`);
        }
    }

    /**
     * Receive pushed biometric logs from device
     * @param {Object} device - Device configuration
     * @param {Array} logs - Raw logs from device
     * @returns {Promise<Object>} Processing result
     */
    async pushBiometricLogs(device, logs) {
        try {
            logger.info(`Processing ${logs.length} pushed logs from device: ${device.deviceName}`);
            
            const processedLogs = [];
            const errors = [];
            
            for (const rawLog of logs) {
                try {
                    const normalizedLog = await this.normalizeLogData(rawLog, device.deviceType);
                    const result = await this.saveAttendanceLog(normalizedLog, device);
                    processedLogs.push(result);
                } catch (error) {
                    logger.error(`Error processing log:`, error);
                    errors.push({
                        log: rawLog,
                        error: error.message
                    });
                }
            }
            
            return {
                success: true,
                processed: processedLogs.length,
                errors: errors.length,
                details: { processedLogs, errors }
            };
        } catch (error) {
            logger.error(`Failed to process pushed logs:`, error);
            throw new Error(`Log processing failed: ${error.message}`);
        }
    }

    /**
     * Fetch attendance logs from cloud service
     * @param {Object} device - Device configuration
     * @returns {Promise<Array>} Array of attendance logs
     */
    async fetchCloudLogs(device) {
        try {
            logger.info(`Fetching logs from cloud service: ${device.deviceName}`);
            
            if (!device.apiUrl) {
                throw new Error('API URL not configured for cloud device');
            }
            
            const headers = {};
            if (device.apiKey) {
                headers['X-API-Key'] = device.apiKey;
            }
            if (device.token) {
                headers['Authorization'] = `Bearer ${device.token}`;
            }
            
            // Calculate date range (since last sync or last 24 hours)
            const since = device.lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            const response = await axios.get(device.apiUrl, {
                headers,
                params: {
                    since: since.toISOString(),
                    limit: 1000
                },
                timeout: 30000
            });
            
            const logs = response.data.logs || response.data.data || response.data;
            
            logger.info(`Retrieved ${logs.length} logs from cloud service: ${device.deviceName}`);
            
            return Array.isArray(logs) ? logs : [];
        } catch (error) {
            logger.error(`Failed to fetch cloud logs from ${device.deviceName}:`, error);
            throw new Error(`Cloud log retrieval failed: ${error.message}`);
        }
    }

    /**
     * Normalize log data from different sources to standard format
     * @param {Object} rawLog - Raw log data from device
     * @param {String} deviceType - Type of device
     * @returns {Promise<Object>} Normalized log data
     */
    async normalizeLogData(rawLog, deviceType) {
        try {
            const normalized = {
                employeeId: null,
                timestamp: null,
                type: 'checkin', // 'checkin' or 'checkout'
                source: deviceType,
                rawData: rawLog
            };
            
            // Normalize based on device type
            switch (deviceType) {
                case 'zkteco':
                    // ZKTeco format: { userId, timestamp, type, deviceId }
                    normalized.employeeId = rawLog.userId || rawLog.userID || rawLog.user_id;
                    normalized.timestamp = new Date(rawLog.timestamp || rawLog.time || rawLog.recordTime);
                    normalized.type = this._determineCheckType(rawLog.type || rawLog.checkType);
                    break;
                    
                case 'cloud':
                    // Cloud format varies, common structure
                    normalized.employeeId = rawLog.employeeId || rawLog.employee_id || rawLog.userId;
                    normalized.timestamp = new Date(rawLog.timestamp || rawLog.datetime || rawLog.time);
                    normalized.type = this._determineCheckType(rawLog.type || rawLog.action);
                    break;
                    
                case 'mobile':
                    // Mobile app format
                    normalized.employeeId = rawLog.employeeId;
                    normalized.timestamp = new Date(rawLog.timestamp);
                    normalized.type = rawLog.type || 'checkin';
                    normalized.location = rawLog.location;
                    normalized.coordinates = rawLog.coordinates;
                    break;
                    
                case 'qr':
                    // QR code scan format
                    normalized.employeeId = rawLog.employeeId;
                    normalized.timestamp = new Date(rawLog.scanTime || rawLog.timestamp);
                    normalized.type = rawLog.type || 'checkin';
                    normalized.qrCode = rawLog.qrCode;
                    break;
                    
                case 'csv':
                    // CSV import format
                    normalized.employeeId = rawLog.employeeId || rawLog.employee_id;
                    normalized.timestamp = new Date(rawLog.date || rawLog.timestamp);
                    normalized.type = this._determineCheckType(rawLog.type || rawLog.action);
                    break;
                    
                default:
                    // Generic biometric format
                    normalized.employeeId = rawLog.employeeId || rawLog.userId;
                    normalized.timestamp = new Date(rawLog.timestamp || rawLog.time);
                    normalized.type = this._determineCheckType(rawLog.type);
            }
            
            // Validate required fields
            if (!normalized.employeeId || !normalized.timestamp) {
                throw new Error('Missing required fields: employeeId or timestamp');
            }
            
            return normalized;
        } catch (error) {
            logger.error('Failed to normalize log data:', error);
            throw new Error(`Log normalization failed: ${error.message}`);
        }
    }

    /**
     * Determine check type from various formats
     * @param {*} type - Raw type value
     * @returns {String} 'checkin' or 'checkout'
     */
    _determineCheckType(type) {
        if (!type) return 'checkin';
        
        const typeStr = String(type).toLowerCase();
        
        // Check-out indicators
        if (typeStr.includes('out') || typeStr.includes('exit') || 
            typeStr === '1' || typeStr === 'checkout') {
            return 'checkout';
        }
        
        // Default to check-in
        return 'checkin';
    }

    /**
     * Save attendance log to database
     * @param {Object} normalizedLog - Normalized log data
     * @param {Object} device - Device configuration
     * @returns {Promise<Object>} Saved attendance record
     */
    async saveAttendanceLog(normalizedLog, device) {
        try {
            // Find employee by employeeId
            const employee = await User.findOne({ employeeId: normalizedLog.employeeId });
            
            if (!employee) {
                throw new Error(`Employee not found: ${normalizedLog.employeeId}`);
            }
            
            // Get date without time
            const date = new Date(normalizedLog.timestamp);
            date.setHours(0, 0, 0, 0);
            
            // Find or create attendance record for this date
            let attendance = await Attendance.findOne({
                employee: employee._id,
                date: date
            });
            
            if (!attendance) {
                attendance = new Attendance({
                    employee: employee._id,
                    department: employee.department,
                    position: employee.position,
                    date: date,
                    source: normalizedLog.source,
                    device: device._id,
                    rawDeviceData: normalizedLog.rawData
                });
            }
            
            // Update check-in or check-out
            if (normalizedLog.type === 'checkin') {
                attendance.checkIn = {
                    time: normalizedLog.timestamp,
                    method: 'biometric',
                    location: normalizedLog.location || 'office'
                };
                attendance.source = normalizedLog.source;
            } else {
                attendance.checkOut = {
                    time: normalizedLog.timestamp,
                    method: 'biometric',
                    location: normalizedLog.location || 'office'
                };
            }
            
            // Store raw device data if not already stored
            if (!attendance.rawDeviceData) {
                attendance.rawDeviceData = normalizedLog.rawData;
            }
            
            await attendance.save();
            
            logger.info(`Saved attendance log for employee ${normalizedLog.employeeId}`);
            
            return attendance;
        } catch (error) {
            logger.error('Failed to save attendance log:', error);
            throw error;
        }
    }

    /**
     * Sync device logs
     * @param {String} deviceId - Device ID
     * @returns {Promise<Object>} Sync result
     */
    async syncDevice(deviceId) {
        const device = await AttendanceDevice.findById(deviceId);
        
        if (!device) {
            throw new Error('Device not found');
        }
        
        if (!device.isActive) {
            throw new Error('Device is not active');
        }
        
        try {
            // Update device status to syncing
            device.status = 'syncing';
            await device.save();
            
            let logs = [];
            
            // Fetch logs based on device type
            switch (device.deviceType) {
                case 'zkteco':
                    logs = await this.pullZKTecoLogs(device);
                    break;
                    
                case 'cloud':
                    logs = await this.fetchCloudLogs(device);
                    break;
                    
                default:
                    throw new Error(`Sync not supported for device type: ${device.deviceType}`);
            }
            
            // Process logs
            const processedLogs = [];
            const errors = [];
            
            for (const rawLog of logs) {
                try {
                    const normalizedLog = await this.normalizeLogData(rawLog, device.deviceType);
                    const result = await this.saveAttendanceLog(normalizedLog, device);
                    processedLogs.push(result);
                } catch (error) {
                    logger.error(`Error processing log:`, error);
                    errors.push({
                        log: rawLog,
                        error: error.message
                    });
                }
            }
            
            // Update device sync status
            await device.updateSyncStatus(
                errors.length === 0,
                processedLogs.length,
                errors.length > 0 ? `${errors.length} errors occurred` : null
            );
            
            return {
                success: true,
                device: device.deviceName,
                processed: processedLogs.length,
                errors: errors.length,
                lastSync: device.lastSync
            };
        } catch (error) {
            // Update device with error status
            await device.updateSyncStatus(false, 0, error.message);
            throw error;
        }
    }

    /**
     * Test device connection
     * @param {String} deviceId - Device ID
     * @returns {Promise<Object>} Connection test result
     */
    async testConnection(deviceId) {
        const device = await AttendanceDevice.findById(deviceId);
        
        if (!device) {
            throw new Error('Device not found');
        }
        
        try {
            let result;
            
            switch (device.deviceType) {
                case 'zkteco':
                    result = await this.connectToZKTeco(device);
                    break;
                    
                case 'cloud':
                    // Test cloud API connection
                    const logs = await this.fetchCloudLogs(device);
                    result = {
                        success: true,
                        message: 'Cloud API connection successful',
                        recordCount: logs.length
                    };
                    break;
                    
                default:
                    result = {
                        success: true,
                        message: `Device type ${device.deviceType} does not require connection test`
                    };
            }
            
            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Import attendance from CSV
     * @param {Array} csvData - Parsed CSV data
     * @param {String} deviceId - Device ID (optional)
     * @returns {Promise<Object>} Import result
     */
    async importFromCSV(csvData, deviceId = null) {
        try {
            const processedLogs = [];
            const errors = [];
            
            let device = null;
            if (deviceId) {
                device = await AttendanceDevice.findById(deviceId);
            }
            
            for (const row of csvData) {
                try {
                    const normalizedLog = await this.normalizeLogData(row, 'csv');
                    const result = await this.saveAttendanceLog(normalizedLog, device || { _id: null });
                    processedLogs.push(result);
                } catch (error) {
                    logger.error(`Error processing CSV row:`, error);
                    errors.push({
                        row,
                        error: error.message
                    });
                }
            }
            
            return {
                success: true,
                processed: processedLogs.length,
                errors: errors.length,
                details: { processedLogs, errors }
            };
        } catch (error) {
            logger.error('Failed to import CSV:', error);
            throw new Error(`CSV import failed: ${error.message}`);
        }
    }
}

export default new AttendanceDeviceService();
