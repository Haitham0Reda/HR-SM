import express from 'express';
import {
    getAllAuditLogs,
    getAuditLogById,
    getUserActivity,
    getSuspiciousActivities,
    getFailedLogins,
    getSecurityStats,
    getLoginHistory,
    get2FAActivity,
    getPasswordActivity,
    getAccountEvents,
    getPermissionChanges,
    getDataAccessLogs,
    getSystemEvents,
    getIPActivity,
    exportAuditLogs,
    cleanupOldLogs
} from '../controller/securityAudit.controller.js';
import {
    protect,
    admin,
    hrOrAdmin,
    canViewAudit
} from '../middleware/index.js';

const router = express.Router();

// Get all audit logs - Admin only
router.get('/',
    protect,
    admin,
    canViewAudit,
    getAllAuditLogs
);

// Get audit log by ID - Admin only
router.get('/:id',
    protect,
    admin,
    canViewAudit,
    getAuditLogById
);

// Get user activity - Admin or HR
router.get('/user/:userId/activity',
    protect,
    hrOrAdmin,
    canViewAudit,
    getUserActivity
);

// Get suspicious activities - Admin only
router.get('/security/suspicious',
    protect,
    admin,
    canViewAudit,
    getSuspiciousActivities
);

// Get failed login attempts - Admin only
router.get('/security/failed-logins',
    protect,
    admin,
    canViewAudit,
    getFailedLogins
);

// Get security statistics - Admin only
router.get('/security/stats',
    protect,
    admin,
    canViewAudit,
    getSecurityStats
);

// Get login history for user - Admin or HR
router.get('/user/:userId/login-history',
    protect,
    hrOrAdmin,
    canViewAudit,
    getLoginHistory
);

// Get 2FA activity for user - Admin or HR
router.get('/user/:userId/2fa-activity',
    protect,
    hrOrAdmin,
    canViewAudit,
    get2FAActivity
);

// Get password activity for user - Admin or HR
router.get('/user/:userId/password-activity',
    protect,
    hrOrAdmin,
    canViewAudit,
    getPasswordActivity
);

// Get account events for user - Admin or HR
router.get('/user/:userId/account-events',
    protect,
    hrOrAdmin,
    canViewAudit,
    getAccountEvents
);

// Get permission changes for user - Admin only
router.get('/user/:userId/permission-changes',
    protect,
    admin,
    canViewAudit,
    getPermissionChanges
);

// Get data access logs - Admin only
router.get('/data/access-logs',
    protect,
    admin,
    canViewAudit,
    getDataAccessLogs
);

// Get system events - Admin only
router.get('/system/events',
    protect,
    admin,
    canViewAudit,
    getSystemEvents
);

// Get IP activity - Admin only
router.get('/ip/:ipAddress/activity',
    protect,
    admin,
    canViewAudit,
    getIPActivity
);

// Export audit logs - Admin only
router.get('/export/logs',
    protect,
    admin,
    canViewAudit,
    exportAuditLogs
);

// Cleanup old logs - Admin only
router.post('/cleanup',
    protect,
    admin,
    cleanupOldLogs
);

export default router;
