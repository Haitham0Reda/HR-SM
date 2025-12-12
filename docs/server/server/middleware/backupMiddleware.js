/**
 * Backup Middleware
 * 
 * Validation and business logic for backups
 */

/**
 * Validate backup type
 */
export const validateBackupType = (req, res, next) => {
    const { backupType } = req.body;

    if (backupType) {
        const validTypes = ['database', 'files', 'configuration', 'full', 'incremental'];

        if (!validTypes.includes(backupType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid backup type. Valid types: ${validTypes.join(', ')}`
            });
        }
    }

    next();
};

/**
 * Validate backup schedule configuration
 */
export const validateBackupSchedule = (req, res, next) => {
    const { schedule } = req.body;

    if (schedule && schedule.enabled) {
        if (!schedule.frequency) {
            return res.status(400).json({
                success: false,
                message: 'Frequency is required for scheduled backups'
            });
        }

        const validFrequencies = ['daily', 'weekly', 'monthly', 'custom'];
        if (!validFrequencies.includes(schedule.frequency)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid schedule frequency'
            });
        }

        // Validate time format
        if (schedule.time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid time format. Use HH:mm format (e.g., 02:30)'
            });
        }

        // Validate day of week for weekly backups
        if (schedule.frequency === 'weekly') {
            if (schedule.dayOfWeek === undefined || schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Day of week must be between 0 (Sunday) and 6 (Saturday) for weekly backups'
                });
            }
        }

        // Validate day of month for monthly backups
        if (schedule.frequency === 'monthly') {
            if (schedule.dayOfMonth === undefined || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
                return res.status(400).json({
                    success: false,
                    message: 'Day of month must be between 1 and 31 for monthly backups'
                });
            }
        }
    }

    next();
};

/**
 * Validate encryption settings
 */
export const validateEncryption = (req, res, next) => {
    const { settings } = req.body;

    if (settings?.encryption?.enabled) {
        const algorithm = settings.encryption.algorithm;
        const validAlgorithms = ['aes-256-cbc', 'aes-192-cbc', 'aes-128-cbc'];

        if (algorithm && !validAlgorithms.includes(algorithm)) {
            return res.status(400).json({
                success: false,
                message: `Invalid encryption algorithm. Valid algorithms: ${validAlgorithms.join(', ')}`
            });
        }
    }

    next();
};

/**
 * Validate compression settings
 */
export const validateCompression = (req, res, next) => {
    const { settings } = req.body;

    if (settings?.compression?.enabled) {
        const level = settings.compression.level;

        if (level !== undefined) {
            if (typeof level !== 'number' || level < 1 || level > 9) {
                return res.status(400).json({
                    success: false,
                    message: 'Compression level must be between 1 and 9'
                });
            }
        }
    }

    next();
};

/**
 * Validate retention settings
 */
export const validateRetention = (req, res, next) => {
    const { settings } = req.body;

    if (settings?.retention?.enabled) {
        const days = settings.retention.days;
        const maxBackups = settings.retention.maxBackups;

        if (days !== undefined) {
            if (typeof days !== 'number' || days < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Retention days must be at least 1'
                });
            }
        }

        if (maxBackups !== undefined) {
            if (typeof maxBackups !== 'number' || maxBackups < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Max backups must be at least 1'
                });
            }
        }
    }

    next();
};

/**
 * Validate notification settings
 */
export const validateNotification = (req, res, next) => {
    const { settings } = req.body;

    if (settings?.notification?.enabled) {
        const recipients = settings.notification.recipients;

        if (recipients && Array.isArray(recipients)) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            const invalidEmails = recipients.filter(email => !emailRegex.test(email));

            if (invalidEmails.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email addresses in recipients',
                    invalidEmails
                });
            }
        }
    }

    next();
};

/**
 * Validate backup sources
 */
export const validateSources = (req, res, next) => {
    const { backupType, sources } = req.body;

    if (backupType && sources) {
        switch (backupType) {
            case 'database':
                if (!sources.databases || sources.databases.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'At least one database must be specified for database backups'
                    });
                }
                break;

            case 'files':
                if (!sources.filePaths || sources.filePaths.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'At least one file path must be specified for file backups'
                    });
                }
                break;

            case 'configuration':
                if (!sources.configFiles || sources.configFiles.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'At least one config file must be specified for configuration backups'
                    });
                }
                break;
        }
    }

    next();
};

/**
 * Validate storage settings
 */
export const validateStorage = (req, res, next) => {
    const { storage } = req.body;

    if (storage) {
        if (storage.maxSize !== undefined) {
            if (typeof storage.maxSize !== 'number' || storage.maxSize < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Max storage size must be at least 1 MB'
                });
            }
        }

        if (storage.location && typeof storage.location !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Storage location must be a valid path string'
            });
        }
    }

    next();
};
