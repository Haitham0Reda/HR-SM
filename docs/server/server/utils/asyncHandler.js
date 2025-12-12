/**
 * Async Handler Utility
 * 
 * Wraps async route handlers to catch errors automatically
 * Eliminates the need for try-catch blocks in every controller
 * 
 * Usage:
 * export const getUsers = asyncHandler(async (req, res) => {
 *     const users = await User.find();
 *     sendSuccess(res, users);
 * });
 */

/**
 * Wraps an async function to catch errors
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default asyncHandler;
