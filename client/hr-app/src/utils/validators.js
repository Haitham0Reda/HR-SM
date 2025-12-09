/**
 * Utility functions for validation
 */

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether email is valid
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Whether phone is valid
 */
export const isValidPhone = (phone) => {
    const phoneRegex = /^[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with strength and messages
 */
export const validatePassword = (password) => {
    const result = {
        isValid: false,
        strength: 'weak',
        messages: [],
    };

    if (!password) {
        result.messages.push('Password is required');
        return result;
    }

    if (password.length < 8) {
        result.messages.push('Password must be at least 8 characters');
    }

    if (!/[a-z]/.test(password)) {
        result.messages.push('Password must contain lowercase letters');
    }

    if (!/[A-Z]/.test(password)) {
        result.messages.push('Password must contain uppercase letters');
    }

    if (!/\d/.test(password)) {
        result.messages.push('Password must contain numbers');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        result.messages.push('Password must contain special characters');
    }

    // Calculate strength
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    const strengthScore = [hasLower, hasUpper, hasNumber, hasSpecial, isLongEnough].filter(
        Boolean
    ).length;

    if (strengthScore === 5) {
        result.strength = 'strong';
        result.isValid = true;
    } else if (strengthScore >= 3) {
        result.strength = 'medium';
        result.isValid = true;
    } else {
        result.strength = 'weak';
    }

    return result;
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether URL is valid
 */
export const isValidURL = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @returns {boolean} - Whether value is not empty
 */
export const isRequired = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
};

/**
 * Validate minimum length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length
 * @returns {boolean} - Whether value meets minimum length
 */
export const hasMinLength = (value, minLength) => {
    if (!value) return false;
    return value.length >= minLength;
};

/**
 * Validate maximum length
 * @param {string} value - Value to validate
 * @param {number} maxLength - Maximum length
 * @returns {boolean} - Whether value is within maximum length
 */
export const hasMaxLength = (value, maxLength) => {
    if (!value) return true;
    return value.length <= maxLength;
};

/**
 * Validate number range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} - Whether value is within range
 */
export const isInRange = (value, min, max) => {
    const num = Number(value);
    if (isNaN(num)) return false;
    return num >= min && num <= max;
};

/**
 * Validate date is in the future
 * @param {Date|string} date - Date to validate
 * @returns {boolean} - Whether date is in the future
 */
export const isFutureDate = (date) => {
    if (!date) return false;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj > new Date();
};

/**
 * Validate date is in the past
 * @param {Date|string} date - Date to validate
 * @returns {boolean} - Whether date is in the past
 */
export const isPastDate = (date) => {
    if (!date) return false;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj < new Date();
};

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {boolean} - Whether file type is allowed
 */
export const isValidFileType = (file, allowedTypes) => {
    if (!file) return false;
    return allowedTypes.includes(file.type);
};

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSizeInMB - Maximum file size in MB
 * @returns {boolean} - Whether file size is within limit
 */
export const isValidFileSize = (file, maxSizeInMB) => {
    if (!file) return false;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
};
