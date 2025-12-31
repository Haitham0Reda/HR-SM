/**
 * Error Throttling Utility
 * 
 * Prevents excessive logging of similar errors to reduce console noise
 */

class ErrorThrottle {
    constructor() {
        this.errorCounts = new Map();
        this.lastErrorTime = new Map();
        this.throttleWindow = 5000; // 5 seconds
        this.maxErrorsPerWindow = 3;
    }

    /**
     * Check if an error should be logged or throttled
     * @param {string} errorKey - Unique key for the error type
     * @param {string} message - Error message
     * @returns {boolean} - Whether to log the error
     */
    shouldLog(errorKey, message) {
        const now = Date.now();
        const lastTime = this.lastErrorTime.get(errorKey) || 0;
        const count = this.errorCounts.get(errorKey) || 0;

        // Reset count if outside throttle window
        if (now - lastTime > this.throttleWindow) {
            this.errorCounts.set(errorKey, 1);
            this.lastErrorTime.set(errorKey, now);
            return true;
        }

        // Increment count
        this.errorCounts.set(errorKey, count + 1);
        this.lastErrorTime.set(errorKey, now);

        // Allow logging if under threshold
        if (count < this.maxErrorsPerWindow) {
            return true;
        }

        // Log throttle message once
        if (count === this.maxErrorsPerWindow) {
            console.warn(`🔇 Error throttled: "${message}" (will suppress similar errors for ${this.throttleWindow/1000}s)`);
        }

        return false;
    }

    /**
     * Create error key for network errors
     * @param {string} url - Request URL
     * @param {string} method - HTTP method
     * @returns {string} - Error key
     */
    createNetworkErrorKey(url, method = 'GET') {
        // Extract base path to group similar requests
        const basePath = url.replace(/\/\d+/g, '/:id').split('?')[0];
        return `network_${method}_${basePath}`;
    }

    /**
     * Create error key for API circuit breaker
     * @returns {string} - Error key
     */
    createCircuitBreakerKey() {
        return 'circuit_breaker_active';
    }

    /**
     * Reset all throttles (useful for testing or manual reset)
     */
    reset() {
        this.errorCounts.clear();
        this.lastErrorTime.clear();
    }
}

// Singleton instance
const errorThrottle = new ErrorThrottle();

export default errorThrottle;