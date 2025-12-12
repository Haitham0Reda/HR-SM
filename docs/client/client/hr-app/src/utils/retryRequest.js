/**
 * Retry Request Utility
 * 
 * Provides retry mechanism for failed API calls
 * Implements exponential backoff strategy
 */

/**
 * Retry a failed request with exponential backoff
 * 
 * @param {Function} requestFn - The async function to retry
 * @param {Object} options - Retry configuration
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried
 * @param {Function} options.onRetry - Callback called before each retry
 * @returns {Promise} - Resolves with the successful response or rejects with the final error
 */
export const retryRequest = async (requestFn, options = {}) => {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        shouldRetry = defaultShouldRetry,
        onRetry = null
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Try the request
            const result = await requestFn();
            return result;
        } catch (error) {
            lastError = error;

            // Check if we should retry
            const isLastAttempt = attempt === maxRetries;
            const canRetry = shouldRetry(error);

            if (isLastAttempt || !canRetry) {
                // No more retries or error is not retryable
                throw error;
            }

            // Call onRetry callback if provided
            if (onRetry) {
                onRetry(attempt + 1, maxRetries, delay, error);
            }

            // Wait before retrying with exponential backoff
            await sleep(delay);

            // Increase delay for next retry (exponential backoff)
            delay = Math.min(delay * 2, maxDelay);
        }
    }

    // Should never reach here, but just in case
    throw lastError;
};

/**
 * Default function to determine if an error should be retried
 * Retries on network errors and 5xx server errors
 * Does not retry on 4xx client errors (except 408 Request Timeout and 429 Too Many Requests)
 */
const defaultShouldRetry = (error) => {
    // Network errors (no response)
    if (!error.status && error.message?.includes('Network')) {
        return true;
    }

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) {
        return true;
    }

    // Request timeout
    if (error.status === 408) {
        return true;
    }

    // Too many requests (rate limiting)
    if (error.status === 429) {
        return true;
    }

    // Don't retry client errors (4xx) or successful responses
    return false;
};

/**
 * Sleep utility for delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a retryable version of a service method
 * 
 * @param {Function} serviceFn - The service function to wrap
 * @param {Object} retryOptions - Retry configuration options
 * @returns {Function} - Wrapped function with retry logic
 */
export const withRetry = (serviceFn, retryOptions = {}) => {
    return async (...args) => {
        return retryRequest(
            () => serviceFn(...args),
            retryOptions
        );
    };
};

export default retryRequest;
