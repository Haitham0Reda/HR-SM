/**
 * Testing utilities for React components
 */

/**
 * Mock user data for testing
 */
export const mockUser = {
    _id: '1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'employee',
    name: 'Test User',
    profilePicture: null,
    profile: {
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '123-456-7890',
    },
};

/**
 * Mock admin user data
 */
export const mockAdmin = {
    ...mockUser,
    _id: '2',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    name: 'Admin User',
};

/**
 * Mock HR user data
 */
export const mockHR = {
    ...mockUser,
    _id: '3',
    username: 'hr',
    email: 'hr@example.com',
    role: 'hr',
    name: 'HR User',
};

/**
 * Generate mock data array
 * @param {number} count - Number of items to generate
 * @param {Function} generator - Function to generate each item
 * @returns {Array} - Array of mock data
 */
export const generateMockData = (count, generator) => {
    return Array.from({ length: count }, (_, index) => generator(index));
};

/**
 * Mock API response
 * @param {any} data - Data to return
 * @param {number} delay - Delay in milliseconds
 * @returns {Promise} - Promise that resolves with data
 */
export const mockApiResponse = (data, delay = 100) => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(data), delay);
    });
};

/**
 * Mock API error
 * @param {string} message - Error message
 * @param {number} delay - Delay in milliseconds
 * @returns {Promise} - Promise that rejects with error
 */
export const mockApiError = (message = 'API Error', delay = 100) => {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), delay);
    });
};

/**
 * Wait for async updates in tests
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} - Promise that resolves after delay
 */
export const waitFor = (ms = 0) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
