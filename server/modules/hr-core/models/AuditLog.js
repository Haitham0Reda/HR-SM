import mongoose from 'mongoose';
import crypto from 'crypto';
import os from 'os';
import { baseSchemaPlugin } from '../../../shared/models/BaseModel.js';

const auditLogSchema = new mongoose.Schema({
    // Existing fields
    action: {
        type: String,
        required: true,
        enum: [
            'create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import',
            // New license-related actions
            'license_create', 'license_validate', 'license_renew', 'license_revoke',
            'license_activate', 'license_check', 'license_expire',
            // New system actions
            'system_alert', 'system_health_check', 'backup_create', 'backup_restore',
            'module_enable', 'module_disable', 'tenant_create', 'tenant_suspend',
            'tenant_reactivate', 'security_event', 'performance_alert'
        ]
    },
    resource: {
        type: String,
        required: true
    },
    resourceId: mongoose.Schema.Types.ObjectId,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Some system actions may not have a user
    },
    
    // Enhanced change tracking
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed,
        fields: [String] // List of changed fields
    },
    
    // Enhanced request information
    ipAddress: String,
    userAgent: String,
    requestId: String, // For correlation across services
    sessionId: String,
    
    // Enhanced categorization
    module: String,
    category: {
        type: String,
        enum: [
            'authentication', 'authorization', 'data_modification', 'system_operation',
            'license_management', 'tenant_management', 'security', 'performance',
            'backup_recovery', 'module_management', 'audit', 'compliance'
        ],
        default: 'data_modification'
    },
    
    // Enhanced status and error handling
    status: {
        type: String,
        enum: ['success', 'failure', 'warning', 'info'],
        default: 'success'
    },
    errorMessage: String,
    errorCode: String,
    
    // New fields for enhanced audit logging
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    
    // License-specific fields
    licenseInfo: {
        licenseNumber: String,
        tenantId: String,
        licenseType: String,
        expiresAt: Date,
        machineId: String,
        validationResult: String
    },
    
    // System context
    systemInfo: {
        hostname: String,
        service: String, // 'hr-sm-backend' or 'license-server'
        version: String,
        environment: String
    },
    
    // Performance metrics
    performance: {
        duration: Number, // milliseconds
        memoryUsage: Number, // bytes
        cpuUsage: Number // percentage
    },
    
    // Compliance and retention
    retentionPolicy: {
        type: String,
        enum: ['standard', 'extended', 'permanent'],
        default: 'standard'
    },
    complianceFlags: {
        gdpr: { type: Boolean, default: false },
        sox: { type: Boolean, default: false },
        hipaa: { type: Boolean, default: false }
    },
    
    // Additional metadata
    tags: [String],
    correlationId: String, // For tracking related events
    parentEventId: mongoose.Schema.Types.ObjectId,
    
    // Immutability protection
    hash: String, // SHA-256 hash of the log entry for integrity verification
    signature: String // Digital signature for non-repudiation
});

// Enhanced indexes for better query performance
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, severity: 1 });
auditLogSchema.index({ 'licenseInfo.licenseNumber': 1 }, { sparse: true });
auditLogSchema.index({ 'licenseInfo.tenantId': 1 }, { sparse: true });
auditLogSchema.index({ correlationId: 1 }, { sparse: true });
auditLogSchema.index({ requestId: 1 }, { sparse: true });
auditLogSchema.index({ status: 1, severity: 1 });
auditLogSchema.index({ tags: 1 });

// Virtual for determining if this is a license-related event
auditLogSchema.virtual('isLicenseEvent').get(function() {
    return this.action && this.action.startsWith('license_');
});

// Virtual for determining if this is a system event
auditLogSchema.virtual('isSystemEvent').get(function() {
    return this.category === 'system_operation' || this.category === 'performance';
});

// Pre-save middleware for generating hash and ensuring data integrity
auditLogSchema.pre('save', function(next) {
    if (this.isNew) {
        // Generate correlation ID if not provided
        if (!this.correlationId) {
            this.correlationId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Set system info if not provided
        if (!this.systemInfo.hostname) {
            this.systemInfo.hostname = os.hostname();
        }
        if (!this.systemInfo.service) {
            this.systemInfo.service = 'hr-sm-backend';
        }
        if (!this.systemInfo.environment) {
            this.systemInfo.environment = process.env.NODE_ENV || 'development';
        }
        
        // Generate hash for integrity verification
        const dataToHash = JSON.stringify({
            action: this.action,
            resource: this.resource,
            resourceId: this.resourceId,
            userId: this.userId,
            changes: this.changes,
            timestamp: this.createdAt || new Date()
        });
        this.hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    }
    next();
});

// Static method for creating audit logs with validation
auditLogSchema.statics.createAuditLog = async function(logData) {
    const auditLog = new this({
        action: logData.action,
        resource: logData.resource,
        resourceId: logData.resourceId,
        userId: logData.userId,
        tenantId: logData.tenantId, // Add tenantId field for baseSchemaPlugin
        changes: logData.changes,
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
        licenseInfo: logData.licenseInfo,
        systemInfo: logData.systemInfo || {},
        performance: logData.performance,
        retentionPolicy: logData.retentionPolicy || 'standard',
        complianceFlags: logData.complianceFlags || {},
        tags: logData.tags || [],
        correlationId: logData.correlationId,
        parentEventId: logData.parentEventId
    });
    
    return await auditLog.save();
};

// Static method for querying audit logs with common filters
auditLogSchema.statics.queryAuditLogs = function(filters = {}) {
    const query = {};
    
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    if (filters.category) query.category = filters.category;
    if (filters.severity) query.severity = filters.severity;
    if (filters.status) query.status = filters.status;
    if (filters.licenseNumber) query['licenseInfo.licenseNumber'] = filters.licenseNumber;
    if (filters.tenantId) query['licenseInfo.tenantId'] = filters.tenantId;
    if (filters.correlationId) query.correlationId = filters.correlationId;
    
    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100)
        .skip(filters.skip || 0);
};

auditLogSchema.plugin(baseSchemaPlugin);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
