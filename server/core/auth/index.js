/**
 * Core Authentication Module
 * 
 * Central exports for authentication utilities
 */

import { 
    generatePlatformToken, 
    verifyPlatformToken, 
    setPlatformTokenCookie, 
    clearPlatformTokenCookie 
} from './platformAuth.js';

import { 
    generateTenantToken, 
    verifyTenantToken, 
    setTenantTokenCookie, 
    clearTenantTokenCookie 
} from './tenantAuth.js';

export { 
    generatePlatformToken, 
    verifyPlatformToken, 
    setPlatformTokenCookie, 
    clearPlatformTokenCookie,
    generateTenantToken, 
    verifyTenantToken, 
    setTenantTokenCookie, 
    clearTenantTokenCookie 
};

export default {
    generatePlatformToken,
    verifyPlatformToken,
    setPlatformTokenCookie,
    clearPlatformTokenCookie,
    generateTenantToken,
    verifyTenantToken,
    setTenantTokenCookie,
    clearTenantTokenCookie
};
