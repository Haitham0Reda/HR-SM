/**
 * General utility helper functions
 */

/**
 * Generate unique ID
 * @returns {string} - Unique ID
 */
export const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Deep clone object
 * @param {object} obj - Object to clone
 * @returns {object} - Cloned object
 */
export const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait = 300) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export const throttle = (func, limit = 300) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

/**
 * Sort array of objects by key
 * @param {Array} array - Array to sort
 * @param {string} key - Key to sort by
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} - Sorted array
 */
export const sortByKey = (array, key, order = 'asc') => {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];

        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
    });
};

/**
 * Group array of objects by key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {object} - Grouped object
 */
export const groupBy = (array, key) => {
    return array.reduce((result, item) => {
        const groupKey = item[key];
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
};

/**
 * Remove duplicates from array
 * @param {Array} array - Array with duplicates
 * @param {string} key - Key to check for duplicates (optional)
 * @returns {Array} - Array without duplicates
 */
export const removeDuplicates = (array, key = null) => {
    if (!key) {
        return [...new Set(array)];
    }
    const seen = new Set();
    return array.filter((item) => {
        const value = item[key];
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
};

/**
 * Flatten nested array
 * @param {Array} array - Nested array
 * @returns {Array} - Flattened array
 */
export const flattenArray = (array) => {
    return array.reduce((flat, item) => {
        return flat.concat(Array.isArray(item) ? flattenArray(item) : item);
    }, []);
};

/**
 * Check if object is empty
 * @param {object} obj - Object to check
 * @returns {boolean} - Whether object is empty
 */
export const isEmptyObject = (obj) => {
    return Object.keys(obj).length === 0;
};

/**
 * Get nested object value safely
 * @param {object} obj - Object to get value from
 * @param {string} path - Path to value (e.g., 'user.profile.name')
 * @param {any} defaultValue - Default value if path doesn't exist
 * @returns {any} - Value at path or default value
 */
export const getNestedValue = (obj, path, defaultValue = null) => {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            return defaultValue;
        }
    }

    return result;
};

/**
 * Download file from blob
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Filename for download
 */
export const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Whether copy was successful
 */
export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
};

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after delay
 */
export const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Format bytes to human readable size
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted size string
 */
export const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Generate random color
 * @returns {string} - Random hex color
 */
export const randomColor = () => {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
};

/**
 * Check if value is numeric
 * @param {any} value - Value to check
 * @returns {boolean} - Whether value is numeric
 */
export const isNumeric = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
};
