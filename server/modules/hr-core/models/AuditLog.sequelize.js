import { DataTypes } from 'sequelize';
import crypto from 'crypto';
import os from 'os';
import { mainAppDb } from '../../../config/database.js';

const AuditLog = mainAppDb.define('AuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'tenant_id'
    },
    action: {
        type: DataTypes.ENUM(
            'create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import',
            'license_create', 'license_validate', 'license_renew', 'license_revoke',
            'license_activate', 'license_check', 'license_expire', 'license_update',
            'system_alert', 'system_health_check', 'backup_create', 'backup_restore',
            'module_enable', 'module_disable', 'tenant_create', 'tenant_suspend',
            'tenant_reactivate', 'security_event', 'performance_alert'
        ),
        allowNull: false
    },
    resource: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    resourceId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'resource_id'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    changes: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'Contains before, after, and fields array'
    },
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        field: 'ip_address'
    },
    userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'user_agent'
    },
    requestId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'request_id'
    },
    sessionId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'session_id'
    },
    module: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    category: {
        type: DataTypes.ENUM(
            'authentication', 'authorization', 'data_modification', 'system_operation',
            'license_management', 'tenant_management', 'security', 'performance',
            'backup_recovery', 'module_management', 'audit', 'compliance'
        ),
        defaultValue: 'data_modification'
    },
    status: {
        type: DataTypes.ENUM('success', 'failure', 'warning', 'info'),
        defaultValue: 'success'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'error_message'
    },
    errorCode: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'error_code'
    },
    severity: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium'
    },
    licenseInfo: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'license_info',
        comment: 'Contains licenseNumber, tenantId, licenseType, expiresAt, machineId, validationResult'
    },
    systemInfo: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'system_info',
        comment: 'Contains hostname, service, version, environment'
    },
    performance: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'Contains duration, memoryUsage, cpuUsage'
    },
    retentionPolicy: {
        type: DataTypes.ENUM('standard', 'extended', 'permanent'),
        defaultValue: 'standard',
        field: 'retention_policy'
    },
    complianceFlags: {
        type: DataTypes.JSONB,
        defaultValue: {},
        field: 'compliance_flags',
        comment: 'Contains gdpr, sox, hipaa flags'
    },
    tags: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    correlationId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'correlation_id'
    },
    parentEventId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'parent_event_id',
        references: {
            model: 'audit_logs',
            key: 'id'
        }
    },
    hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'SHA-256 hash for integrity verification'
    },
    signature: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Digital signature for non-repudiation'
    }
}, {
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['tenant_id', 'created_at'] },
        { fields: ['user_id', 'created_at'] },
        { fields: ['resource', 'resource_id'] },
        { fields: ['action', 'created_at'] },
        { fields: ['category', 'severity'] },
        { fields: ['tenant_id', 'action', 'created_at'] },
        { fields: ['status', 'severity'] },
        { fields: ['correlation_id'], where: { correlation_id: { [DataTypes.Op.ne]: null } } },
        { fields: ['request_id'], where: { request_id: { [DataTypes.Op.ne]: null } } },
        { 
            name: 'idx_audit_logs_license_number',
            fields: [{ attribute: 'license_info', operator: '->', path: ['licenseNumber'] }],
            using: 'gin'
        },
        { 
            name: 'idx_audit_logs_license_tenant',
            fields: [{ attribute: 'license_info', operator: '->', path: ['tenantId'] }],
            using: 'gin'
        },
        {
            name: 'idx_audit_logs_tags',
            fields: ['tags'],
            using: 'gin'
        }
    ],
    hooks: {
        beforeCreate: (auditLog) => {
            // Generate correlation ID if not provided
            if (!auditLog.correlationId) {
                auditLog.correlationId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            // Set system info if not provided
            if (!auditLog.systemInfo || Object.keys(auditLog.systemInfo).length === 0) {
                auditLog.systemInfo = {};
            }
            if (!auditLog.systemInfo.hostname) {
                auditLog.systemInfo.hostname = os.hostname();
            }
            if (!auditLog.systemInfo.service) {
                auditLog.systemInfo.service = 'hr-sm-backend';
            }
            if (!auditLog.systemInfo.environment) {
                auditLog.systemInfo.environment = process.env.NODE_ENV || 'development';
            }

            // Generate hash for integrity verification
            const dataToHash = JSON.stringify({
                action: auditLog.action,
                resource: auditLog.resource,
                resourceId: auditLog.resourceId,
                userId: auditLog.userId,
                changes: auditLog.changes,
                timestamp: auditLog.createdAt || new Date()
            });
            auditLog.hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
        }
    }
});

// Instance method: Check if this is a license-related event
AuditLog.prototype.isLicenseEvent = function() {
    return this.action && this.action.startsWith('license_');
};

// Instance method: Check if this is a system event
AuditLog.prototype.isSystemEvent = function() {
    return this.category === 'system_operation' || this.category === 'performance';
};

// Static method: Create audit log with validation
AuditLog.createAuditLog = async function(logData) {
    // Ensure tenantId is always provided, use 'system' for system-level operations
    const tenantId = logData.tenantId || logData.licenseInfo?.tenantId || 'system';
    
    return await this.create({
        action: logData.action,
        resource: logData.resource,
        resourceId: logData.resourceId,
        userId: logData.userId,
        tenantId: tenantId,
        changes: logData.changes || {},
        ipAddress: logData.ipAddress,
        userAgent: logData.userAgent,
        requestId: logData.requestId,
        sessionId: logData.sessionId,
        module: logData.module,
        category: logData.category,
        status: logData.status || 'success',
        errorMessage: logData.errorMessage,
        errorCode: logData.errorCode,
        severity: logData.severity || 'medium',
        licenseInfo: logData.licenseInfo || {},
        systemInfo: logData.systemInfo || {},
        performance: logData.performance || {},
        retentionPolicy: logData.retentionPolicy || 'standard',
        complianceFlags: logData.complianceFlags || {},
        tags: logData.tags || [],
        correlationId: logData.correlationId,
        parentEventId: logData.parentEventId
    });
};

// Static method: Query audit logs with common filters
AuditLog.queryAuditLogs = function(filters = {}) {
    const where = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.category) where.category = filters.category;
    if (filters.severity) where.severity = filters.severity;
    if (filters.status) where.status = filters.status;
    if (filters.correlationId) where.correlationId = filters.correlationId;

    // JSONB queries for license info
    if (filters.licenseNumber) {
        where['licenseInfo.licenseNumber'] = filters.licenseNumber;
    }
    if (filters.tenantId) {
        where['licenseInfo.tenantId'] = filters.tenantId;
    }

    // Date range filtering
    if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt[DataTypes.Op.gte] = new Date(filters.startDate);
        if (filters.endDate) where.createdAt[DataTypes.Op.lte] = new Date(filters.endDate);
    }

    return this.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: filters.limit || 100,
        offset: filters.skip || 0
    });
};

// Define associations
AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
    
    AuditLog.belongsTo(models.AuditLog, {
        foreignKey: 'parent_event_id',
        as: 'parentEvent'
    });
    
    AuditLog.hasMany(models.AuditLog, {
        foreignKey: 'parent_event_id',
        as: 'childEvents'
    });
};

export default AuditLog;
