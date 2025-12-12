/**
 * Usage Tracking Middleware
 * 
 * Automatically tracks API calls for each tenant
 */

import usageTrackingService from '../../platform/system/services/usageTrackingService.js';
import { logger } from '../logging/logger.js';

/**
 * Middleware to track API calls per tenant
 */
export const trackApiUsage = (req, res, next) => {
    // Only track if tenant context is available
    if (!req.tenant) {
        return next();
    }
    
    const tenantId = req.tenant.id || req.tenant.tenantId;
    const startTime = Date.now();
    
    // Track on response finish
    res.on('finish', async () => {
        try {
            const duration = Date.now() - startTime;
            
            await usageTrackingService.trackApiCall(tenantId, {
                endpoint: req.path,
                method: req.method,
                duration
            });
            
            // Track active user if authenticated
            if (req.user) {
                const userId = req.user.id || req.user._id;
                await usageTrackingService.trackActiveUser(tenantId, userId.toString());
            }
            
        } catch (error) {
            // Don't fail the request if tracking fails
            logger.error('Failed to track API usage', {
                context: { tenantId },
                error: error.message
            });
        }
    });
    
    next();
};

export default trackApiUsage;
