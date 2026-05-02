import AttendanceDevice from '../models/attendanceDevice.model.js';
import attendanceDeviceService from '../services/attendanceDevice.service.js';
import logger from '../../../../utils/logger.js';
import xlsx from 'xlsx';
import Department from '../../users/models/department.model.js';
import User from '../../users/models/user.model.js';

/**
 * Get all attendance devices (tenant-aware)
 */
export const getAllDevices = async (req, res) => {
    try {
        // Use tenantId directly as string
        if (!req.tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }
        
        const devices = await AttendanceDevice.findAll({
            where: { tenantId: req.tenantId },
            include: [
                {
                    model: Department,
                    as: 'departmentList',
                    attributes: ['name', 'code'],
                    through: { attributes: [] }
                },
                {
                    model: User,
                    as: 'createdBy',
                    attributes: ['username', 'employeeId']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        
        res.json({
            success: true,
            count: devices.length,
            data: devices
        });
    } catch (error) {
        logger.error('Error fetching devices:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get device by ID (tenant-aware)
 */
export const getDeviceById = async (req, res) => {
    try {
        const device = await AttendanceDevice.findOne({
            where: {
                id: req.params.id,
                tenantId: req.tenantId
            },
            include: [
                {
                    model: Department,
                    as: 'departmentList',
                    attributes: ['name', 'code'],
                    through: { attributes: [] }
                },
                {
                    model: User,
                    as: 'createdBy',
                    attributes: ['username', 'employeeId']
                }
            ]
        });
        
        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }
        
        res.json({
            success: true,
            data: device
        });
    } catch (error) {
        logger.error('Error fetching device:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Register new attendance device (tenant-aware)
 */
export const registerDevice = async (req, res) => {
    try {
        const deviceData = {
            ...req.body,
            tenantId: req.tenantId,
            createdById: req.user.id
        };
        
        const device = await AttendanceDevice.create(deviceData);
        
        // Reload with associations
        const deviceWithAssociations = await AttendanceDevice.findByPk(device.id, {
            include: [
                {
                    model: Department,
                    as: 'departmentList',
                    attributes: ['name', 'code'],
                    through: { attributes: [] }
                },
                {
                    model: User,
                    as: 'createdBy',
                    attributes: ['username', 'employeeId']
                }
            ]
        });
        
        logger.info(`New device registered: ${device.deviceName} by user ${req.user.username} for tenant ${req.tenantId}`);
        
        res.status(201).json({
            success: true,
            message: 'Device registered successfully',
            data: deviceWithAssociations
        });
    } catch (error) {
        logger.error('Error registering device:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Update device (tenant-aware)
 */
export const updateDevice = async (req, res) => {
    try {
        const [affectedCount] = await AttendanceDevice.update(
            req.body,
            {
                where: {
                    id: req.params.id,
                    tenantId: req.tenantId
                }
            }
        );
        
        if (affectedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }
        
        // Fetch updated device with associations
        const device = await AttendanceDevice.findOne({
            where: {
                id: req.params.id,
                tenantId: req.tenantId
            },
            include: [
                {
                    model: Department,
                    as: 'departmentList',
                    attributes: ['name', 'code'],
                    through: { attributes: [] }
                },
                {
                    model: User,
                    as: 'createdBy',
                    attributes: ['username', 'employeeId']
                }
            ]
        });
        
        logger.info(`Device updated: ${device.deviceName} by user ${req.user.username} for tenant ${req.tenantId}`);
        
        res.json({
            success: true,
            message: 'Device updated successfully',
            data: device
        });
    } catch (error) {
        logger.error('Error updating device:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Delete device (tenant-aware)
 */
export const deleteDevice = async (req, res) => {
    try {
        // First fetch the device to get its name for logging
        const device = await AttendanceDevice.findOne({
            where: {
                id: req.params.id,
                tenantId: req.tenantId
            }
        });
        
        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }
        
        await AttendanceDevice.destroy({
            where: {
                id: req.params.id,
                tenantId: req.tenantId
            }
        });
        
        logger.info(`Device deleted: ${device.deviceName} by user ${req.user.username} for tenant ${req.tenantId}`);
        
        res.json({
            success: true,
            message: 'Device deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting device:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Test device connection
 */
export const testConnection = async (req, res) => {
    try {
        const result = await attendanceDeviceService.testConnection(req.params.id, req.tenantId);
        
        res.json({
            success: result.success,
            message: result.message,
            data: result
        });
    } catch (error) {
        logger.error('Error testing device connection:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Sync device logs
 */
export const syncDevice = async (req, res) => {
    try {
        const result = await attendanceDeviceService.syncDevice(req.params.id, req.tenantId);
        
        logger.info(`Device sync completed: ${result.device}, processed: ${result.processed}, errors: ${result.errors}`);
        
        res.json({
            success: true,
            message: 'Device sync completed',
            data: result
        });
    } catch (error) {
        logger.error('Error syncing device:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Sync all active devices (tenant-aware)
 */
export const syncAllDevices = async (req, res) => {
    try {
        const devices = await AttendanceDevice.getDevicesForSync(req.tenantId);
        
        const results = [];
        
        for (const device of devices) {
            try {
                const result = await attendanceDeviceService.syncDevice(device.id, req.tenantId);
                results.push(result);
            } catch (error) {
                logger.error(`Error syncing device ${device.deviceName}:`, error);
                results.push({
                    success: false,
                    device: device.deviceName,
                    error: error.message
                });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        const totalProcessed = results.reduce((sum, r) => sum + (r.processed || 0), 0);
        
        res.json({
            success: true,
            message: `Synced ${successCount} of ${devices.length} devices`,
            totalProcessed,
            data: results
        });
    } catch (error) {
        logger.error('Error syncing all devices:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get device statistics (tenant-aware)
 */
export const getDeviceStats = async (req, res) => {
    try {
        const stats = await AttendanceDevice.getDeviceStats(req.tenantId);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error fetching device stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Receive pushed logs from biometric device
 * Note: This endpoint is public but validates device ownership
 */
export const receivePushedLogs = async (req, res) => {
    try {
        const { deviceId, logs, tenantId } = req.body;
        
        if (!deviceId || !logs || !Array.isArray(logs)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request: deviceId and logs array required'
            });
        }
        
        // Find device with tenant validation
        const where = { id: deviceId };
        if (tenantId) {
            where.tenantId = tenantId;
        }
        
        const device = await AttendanceDevice.findOne({ where });
        
        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }
        
        const result = await attendanceDeviceService.pushBiometricLogs(device, logs);
        
        // Update device sync status
        await device.updateSyncStatus(
            result.errors === 0,
            result.processed,
            result.errors > 0 ? `${result.errors} errors occurred` : null
        );
        
        logger.info(`Received ${logs.length} pushed logs from device ${device.deviceName} for tenant ${device.tenantId}`);
        
        res.json({
            success: true,
            message: 'Logs processed successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error processing pushed logs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Import attendance from CSV
 */
export const importCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        
        // Parse CSV/Excel file
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const csvData = xlsx.utils.sheet_to_json(worksheet);
        
        if (csvData.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'CSV file is empty'
            });
        }
        
        const deviceId = req.body.deviceId || null;
        const result = await attendanceDeviceService.importFromCSV(csvData, deviceId);
        
        logger.info(`CSV import completed: ${result.processed} records processed, ${result.errors} errors`);
        
        res.json({
            success: true,
            message: 'CSV import completed',
            data: result
        });
    } catch (error) {
        logger.error('Error importing CSV:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
