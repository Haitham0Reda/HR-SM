/**
 * Input Sanitizer Utility
 * 
 * Provides functions to sanitize user inputs before sending to the server
 * to prevent JSON parsing errors and other issues
 */

/**
 * Sanitize a string value to prevent JSON parsing issues
 * @param {string} value - The input value to sanitize
 * @returns {string} - The sanitized value
 */
export const sanitizeString = (value) => {
    if (typeof value !== 'string') {
        return value;
    }
    
    return value
        // Remove or escape problematic characters that can break JSON
        .replace(/\\/g, '\\\\')  // Escape backslashes
        .replace(/"/g, '\\"')    // Escape double quotes
        .replace(/\n/g, '\\n')   // Escape newlines
        .replace(/\r/g, '\\r')   // Escape carriage returns
        .replace(/\t/g, '\\t')   // Escape tabs
        .trim();                 // Remove leading/trailing whitespace
};

/**
 * Sanitize an object recursively
 * @param {any} obj - The object to sanitize
 * @returns {any} - The sanitized object
 */
export const sanitizeObject = (obj) => {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
    }
    
    return obj;
};

/**
 * Sanitize form data before submission
 * @param {Object} formData - The form data to sanitize
 * @returns {Object} - The sanitized form data
 */
export const sanitizeFormData = (formData) => {
    return sanitizeObject(formData);
};

/**
 * Validate that a string doesn't contain problematic characters
 * @param {string} value - The value to validate
 * @returns {boolean} - True if the value is safe
 */
export const isValidInput = (value) => {
    if (typeof value !== 'string') {
        return true;
    }
    
    // Check for potentially problematic patterns
    const problematicPatterns = [
        /^{\\/, // Starts with malformed JSON
        /\\$/, // Ends with unescaped backslash
        /[^\x20-\x7E\u00A0-\uFFFF]/, // Contains non-printable characters
    ];
    
    return !problematicPatterns.some(pattern => pattern.test(value));
};

/**
 * Clean username for email generation
 * @param {string} username - The username to clean
 * @returns {string} - The cleaned username
 */
export const cleanUsernameForEmail = (username) => {
    if (typeof username !== 'string') {
        return '';
    }
    
    return username
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9._\-\s]/g, '') // Keep only safe characters
        .replace(/\s+/g, '.') // Replace spaces with dots
        .replace(/^[._-]+|[._-]+$/g, '') // Remove leading/trailing special chars
        .substring(0, 64); // Limit length
};

/**
 * Clean name fields (first name, last name, etc.)
 * @param {string} name - The name to clean
 * @returns {string} - The cleaned name
 */
export const cleanNameField = (name) => {
    if (typeof name !== 'string') {
        return '';
    }
    
    return name
        .trim()
        .replace(/[^a-zA-Z\s\-']/g, '') // Keep only letters, spaces, hyphens, apostrophes
        .replace(/\s+/g, ' ') // Normalize spaces
        .substring(0, 50); // Reasonable length limit
};

/**
 * Clean Arabic name field
 * @param {string} arabicName - The Arabic name to clean
 * @returns {string} - The cleaned Arabic name
 */
export const cleanArabicName = (arabicName) => {
    if (typeof arabicName !== 'string') {
        return '';
    }
    
    return arabicName
        .trim()
        .replace(/[^\u0600-\u06FF\s]/g, '') // Keep only Arabic characters and spaces
        .replace(/\s+/g, ' ') // Normalize spaces
        .substring(0, 100); // Reasonable length limit
};

/**
 * Clean phone number
 * @param {string} phone - The phone number to clean
 * @returns {string} - The cleaned phone number
 */
export const cleanPhoneNumber = (phone) => {
    if (typeof phone !== 'string') {
        return '';
    }
    
    return phone
        .replace(/[^0-9+\-\s()]/g, '') // Keep only numbers and common phone chars
        .trim()
        .substring(0, 20); // Reasonable length limit
};

/**
 * Clean national ID
 * @param {string} nationalId - The national ID to clean
 * @returns {string} - The cleaned national ID
 */
export const cleanNationalId = (nationalId) => {
    if (typeof nationalId !== 'string') {
        return '';
    }
    
    return nationalId
        .replace(/[^0-9]/g, '') // Keep only numbers
        .trim()
        .substring(0, 20); // Reasonable length limit
};

export default {
    sanitizeString,
    sanitizeObject,
    sanitizeFormData,
    isValidInput,
    cleanUsernameForEmail,
    cleanNameField,
    cleanArabicName,
    cleanPhoneNumber,
    cleanNationalId
};