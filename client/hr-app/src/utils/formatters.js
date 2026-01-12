/**
 * Utility functions for formatting data
 * Shared across hr-app and platform-admin
 */

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Enable custom parse format plugin
dayjs.extend(customParseFormat);

/**
 * Format date to dd/mm/yyyy format (default) or dd/mm/yy format
 * @param {Date|string} date - Date to format
 * @param {boolean} shortYear - Whether to use short year (dd/mm/yy) instead of full year
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, shortYear = false) => {
    if (!date) return '-';
    const dateObj = dayjs(date);
    if (!dateObj.isValid()) return '-';
    return shortYear ? dateObj.format('DD/MM/YY') : dateObj.format('DD/MM/YYYY');
};

/**
 * Format date and time to dd/mm/yyyy HH:mm format (default) or dd/mm/yy HH:mm format
 * @param {Date|string} date - Date to format
 * @param {boolean} shortYear - Whether to use short year
 * @returns {string} - Formatted date and time string
 */
export const formatDateTime = (date, shortYear = false) => {
    if (!date) return '-';
    const dateObj = dayjs(date);
    if (!dateObj.isValid()) return '-';
    return shortYear ? dateObj.format('DD/MM/YY HH:mm') : dateObj.format('DD/MM/YYYY HH:mm');
};

/**
 * Parse dd/mm/yy or dd/mm/yyyy format to ISO date
 * @param {string} dateString - Date string in dd/mm/yy or dd/mm/yyyy format
 * @returns {string} - ISO date string (YYYY-MM-DD)
 */
export const parseDateInput = (dateString) => {
    if (!dateString) return '';
    
    // Try different formats
    const formats = ['DD/MM/YY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
    
    for (const format of formats) {
        const parsed = dayjs(dateString, format, true);
        if (parsed.isValid()) {
            return parsed.format('YYYY-MM-DD');
        }
    }
    
    // Fallback to dayjs auto-parsing
    const fallback = dayjs(dateString);
    return fallback.isValid() ? fallback.format('YYYY-MM-DD') : '';
};

/**
 * Convert ISO date to dd/mm/yyyy format (default) or dd/mm/yy format for input fields
 * @param {string} isoDate - ISO date string (YYYY-MM-DD)
 * @param {boolean} shortYear - Whether to use short year
 * @returns {string} - Formatted date string for input
 */
export const formatDateForInput = (isoDate, shortYear = false) => {
    if (!isoDate) return '';
    const dateObj = dayjs(isoDate);
    if (!dateObj.isValid()) return '';
    return shortYear ? dateObj.format('DD/MM/YY') : dateObj.format('DD/MM/YYYY');
};

/**
 * Format time to readable string
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted time string
 */
export const formatTime = (date) => {
    if (!date) return '-';
    const dateObj = dayjs(date);
    if (!dateObj.isValid()) return '-';
    return dateObj.format('HH:mm');
};

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} - Formatted number string
 */
export const formatNumber = (num, locale = 'en-US') => {
    if (num === null || num === undefined) return '-';
    return new Intl.NumberFormat(locale).format(num);
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    }).format(amount);
};

/**
 * Format percentage
 * @param {number} value - Value to format (0-100)
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} - Formatted percentage string
 */
export const formatPercentage = (value, decimals = 0) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(decimals)}%`;
};

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size string
 */
export const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
};

/**
 * Capitalize first letter
 * @param {string} text - Text to capitalize
 * @returns {string} - Capitalized text
 */
export const capitalize = (text) => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Convert to title case
 * @param {string} text - Text to convert
 * @returns {string} - Title case text
 */
export const toTitleCase = (text) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {Date|string} date - Date to compare
 * @returns {string} - Relative time string
 */
export const getRelativeTime = (date) => {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};