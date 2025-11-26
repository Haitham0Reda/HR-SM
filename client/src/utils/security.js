/**
 * Security utilities for frontend
 * Uses crypto-js, dompurify, bad-words, and secure-ls
 */
import CryptoJS from 'crypto-js';
import DOMPurify from 'dompurify';
import Filter from 'bad-words';
import SecureLS from 'secure-ls';

// Initialize secure local storage
const ls = new SecureLS({
    encodingType: 'aes',
    isCompression: true,
    encryptionSecret: process.env.REACT_APP_STORAGE_SECRET || 'hr-system-secret-key'
});

// Initialize profanity filter
const profanityFilter = new Filter();

/**
 * Encrypt sensitive data before sending to server
 */
export const encryptData = (data, secret = process.env.REACT_APP_ENCRYPTION_KEY) => {
    try {
        return CryptoJS.AES.encrypt(JSON.stringify(data), secret).toString();
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
};

/**
 * Decrypt data received from server
 */
export const decryptData = (encryptedData, secret = process.env.REACT_APP_ENCRYPTION_KEY) => {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, secret);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
};

/**
 * Hash data (one-way encryption)
 */
export const hashData = (data) => {
    return CryptoJS.SHA256(data).toString();
};

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHTML = (dirty) => {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'target']
    });
};

/**
 * Check if text contains profanity
 */
export const containsProfanity = (text) => {
    return profanityFilter.isProfane(text);
};

/**
 * Clean profanity from text
 */
export const cleanProfanity = (text) => {
    return profanityFilter.clean(text);
};

/**
 * Secure local storage operations
 */
export const secureStorage = {
    set: (key, value) => {
        try {
            ls.set(key, value);
            return true;
        } catch (error) {
            console.error('Secure storage set error:', error);
            return false;
        }
    },
    
    get: (key) => {
        try {
            return ls.get(key);
        } catch (error) {
            console.error('Secure storage get error:', error);
            return null;
        }
    },
    
    remove: (key) => {
        try {
            ls.remove(key);
            return true;
        } catch (error) {
            console.error('Secure storage remove error:', error);
            return false;
        }
    },
    
    clear: () => {
        try {
            ls.removeAll();
            return true;
        } catch (error) {
            console.error('Secure storage clear error:', error);
            return false;
        }
    }
};

/**
 * Validate and sanitize user input
 */
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    
    // Remove HTML tags
    let sanitized = sanitizeHTML(input);
    
    // Clean profanity
    if (containsProfanity(sanitized)) {
        sanitized = cleanProfanity(sanitized);
    }
    
    return sanitized.trim();
};

/**
 * Generate secure random token
 */
export const generateSecureToken = (length = 32) => {
    return CryptoJS.lib.WordArray.random(length).toString();
};

export default {
    encryptData,
    decryptData,
    hashData,
    sanitizeHTML,
    containsProfanity,
    cleanProfanity,
    secureStorage,
    sanitizeInput,
    generateSecureToken
};
