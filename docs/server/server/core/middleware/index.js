/**
 * Core Middleware Module
 * 
 * Central exports for middleware functions
 */

export { tenantContext, optionalTenantContext } from './tenantContext.js';
export { moduleGuard, anyModuleGuard, allModulesGuard, isModuleAvailable } from './moduleGuard.js';

export default {
    tenantContext,
    optionalTenantContext,
    moduleGuard,
    anyModuleGuard,
    allModulesGuard,
    isModuleAvailable
};
