/**
 * Utility functions for formatting data
 */

// Format currency
export const formatCurrency = (amount, currency = 'EGP') => {
    if (amount === null || amount === undefined) return 'N/A';
    
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    return formatter.format(amount);
};

// Format date
export const formatDate = (date, options = {}) => {
    if (!date) return 'N/A';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };
    
    return new Date(date).toLocaleDateString('en-US', defaultOptions);
};

// Format date and time
export const formatDateTime = (date, options = {}) => {
    if (!date) return 'N/A';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };
    
    return new Date(date).toLocaleDateString('en-US', defaultOptions);
};

// Format phone number
export const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    
    // Simple formatting for Egyptian numbers
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('20')) {
        // International format
        return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8)}`;
    } else if (cleaned.startsWith('01')) {
        // Local mobile format
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    
    return phone;
};

// Format percentage
export const formatPercentage = (value, decimals = 1) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(decimals)}%`;
};

// Format file size
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Capitalize first letter
export const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

// Format name
export const formatName = (firstName, lastName) => {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.join(' ') || 'N/A';
};

// Truncate text
export const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};