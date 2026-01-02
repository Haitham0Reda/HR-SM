/**
 * Array Helper Utilities
 * 
 * Helper functions to safely handle array operations and prevent common errors
 */

/**
 * Ensures the input is always an array, handling various API response formats
 * @param {any} data - The data that should be an array
 * @param {string} dataProperty - Optional property name if data is nested (default: 'data')
 * @returns {Array} Always returns an array
 */
export const ensureArray = (data, dataProperty = 'data') => {
    // If it's already an array, return it
    if (Array.isArray(data)) {
        return data;
    }
    
    // If it's an object with a data property, try to use that
    if (data && typeof data === 'object' && Array.isArray(data[dataProperty])) {
        return data[dataProperty];
    }
    
    // If it's an object with any array property, use the first one found
    if (data && typeof data === 'object') {
        const arrayProperty = Object.values(data).find(value => Array.isArray(value));
        if (arrayProperty) {
            return arrayProperty;
        }
    }
    
    // Fallback to empty array
    return [];
};

/**
 * Safely maps over data that might not be an array
 * @param {any} data - The data to map over
 * @param {Function} mapFunction - The mapping function
 * @param {string} dataProperty - Optional property name if data is nested
 * @returns {Array} Mapped array or empty array if data is invalid
 */
export const safeMap = (data, mapFunction, dataProperty = 'data') => {
    const arrayData = ensureArray(data, dataProperty);
    return arrayData.map(mapFunction);
};

/**
 * Common pattern for handling API responses that might return arrays or objects
 * @param {any} response - API response
 * @returns {Array} Extracted array from response
 */
export const extractArrayFromResponse = (response) => {
    return ensureArray(response, 'data');
};

/**
 * Example usage:
 * 
 * // Instead of:
 * const data = await userService.getAll();
 * setUsers(data); // Might fail if data is not an array
 * 
 * // Use:
 * const data = await userService.getAll();
 * setUsers(ensureArray(data));
 * 
 * // Or in JSX:
 * {safeMap(users, (user) => (
 *   <MenuItem key={user._id} value={user._id}>
 *     {user.name}
 *   </MenuItem>
 * ))}
 */