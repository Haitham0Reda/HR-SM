import express from 'express';
import {
    getSecuritySettings,
    updateSecuritySettings,
    update2FASettings,
    updatePasswordPolicy,
    updateLockoutSettings,
    addIPToWhitelist,
    removeIPFromWhitelist,
    toggleIPWhitelist,
    updateSessionSettings,
    enableDevelopmentMode,
    disableDevelopmentMode,
    updateAuditSettings,
    testPassword
} from '../controllers/securitySettings.controller.js';
import {
    protect,
    admin,
    canManageSettings,
    validateSecuritySettings,
    validateIPAddress
} from '../../../middleware/index.js';

const router = express.Router();

// Get security settings - Admin only
router.get('/',
    protect,
    admin,
    getSecuritySettings
);

// Update security settings - Admin only with validation
router.put('/',
    protect,
    admin,
    canManageSettings,
    validateSecuritySettings,
    updateSecuritySettings
);

// Update 2FA settings - Admin only
router.put('/2fa',
    protect,
    admin,
    canManageSettings,
    update2FASettings
);

// Update password policy - Admin only
router.put('/password-policy',
    protect,
    admin,
    canManageSettings,
    validateSecuritySettings,
    updatePasswordPolicy
);

// Update account lockout settings - Admin only
router.put('/lockout',
    protect,
    admin,
    canManageSettings,
    validateSecuritySettings,
    updateLockoutSettings
);

// Add IP to whitelist - Admin only
router.post('/ip-whitelist',
    protect,
    admin,
    canManageSettings,
    validateIPAddress,
    addIPToWhitelist
);

// Remove IP from whitelist - Admin only
router.delete('/ip-whitelist/:ipId',
    protect,
    admin,
    canManageSettings,
    removeIPFromWhitelist
);

// Toggle IP whitelist - Admin only
router.put('/ip-whitelist/toggle',
    protect,
    admin,
    canManageSettings,
    toggleIPWhitelist
);

// Update session settings - Admin only
router.put('/session',
    protect,
    admin,
    canManageSettings,
    validateSecuritySettings,
    updateSessionSettings
);

// Enable development mode - Admin only
router.post('/development-mode/enable',
    protect,
    admin,
    canManageSettings,
    enableDevelopmentMode
);

// Disable development mode - Admin only
router.post('/development-mode/disable',
    protect,
    admin,
    canManageSettings,
    disableDevelopmentMode
);

// Update audit settings - Admin only
router.put('/audit',
    protect,
    admin,
    canManageSettings,
    updateAuditSettings
);

// Test password against policy - Protected route
router.post('/test-password',
    protect,
    testPassword
);

export default router;
