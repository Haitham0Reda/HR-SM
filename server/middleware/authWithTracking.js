/**
 * Authentication with User Activity Tracking Middleware
 * Combines authentication with user activity tracking
 */

import { protect } from './authMiddleware.js';
import { trackUserActivity } from './companyLogging.js';

/**
 * Middleware that combines authentication with user activity tracking
 * This ensures that user activity is only tracked for authenticated users
 */
export const protectWithTracking = async (req, res, next) => {
    // First apply authentication
    protect(req, res, (err) => {
        if (err) {
            return next(err);
        }
        
        // If authentication succeeded, apply user activity tracking
        trackUserActivity(req, res, next);
    });
};

/**
 * Middleware factory to create protected routes with user activity tracking
 * @param {...Function} additionalMiddleware - Additional middleware to apply after auth and tracking
 * @returns {Function[]} Array of middleware functions
 */
export const createProtectedRoute = (...additionalMiddleware) => {
    return [protectWithTracking, ...additionalMiddleware];
};

export default {
    protectWithTracking,
    createProtectedRoute
};