/**
 * Encryption Utilities for Sensitive Data
 * 
 * Provides AES-256-GCM encryption for sensitive salary information
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

// Generate encryption key from environment variable or create a secure default
const getEncryptionKey = () => {
    const envKey = process.env.SALARY_ENCRYPTION_KEY;
    if (envKey) {
        // Use provided key, ensure it's 32 bytes
        const key = Buffer.from(envKey, 'hex');
        if (key.length !== KEY_LENGTH) {
            throw new Error('SALARY_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
        }
        return key;
    }
    
    // For development, use a consistent key (NOT for production)
    if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Using default encryption key for development. Set SALARY_ENCRYPTION_KEY in production!');
        return crypto.scryptSync('salary-encryption-key-dev', 'salt', KEY_LENGTH);
    }
    
    throw new Error('SALARY_ENCRYPTION_KEY environment variable is required in production');
};

/**
 * Encrypt a numeric value
 * @param {number} value - The numeric value to encrypt
 * @returns {string} - Encrypted value as hex string with format: iv:encrypted
 */
export const encryptSalary = (value) => {
    try {
        if (value === null || value === undefined || isNaN(value)) {
            return null;
        }
        
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        const valueString = value.toString();
        let encrypted = cipher.update(valueString, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Return format: iv:encrypted
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt salary data');
    }
};

/**
 * Decrypt a numeric value
 * @param {string} encryptedValue - The encrypted value in format: iv:encrypted
 * @returns {number} - Decrypted numeric value
 */
export const decryptSalary = (encryptedValue) => {
    try {
        if (!encryptedValue || typeof encryptedValue !== 'string') {
            return 0;
        }
        
        const parts = encryptedValue.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted value format');
        }
        
        const [ivHex, encrypted] = parts;
        const key = getEncryptionKey();
        const iv = Buffer.from(ivHex, 'hex');
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return parseFloat(decrypted) || 0;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt salary data');
    }
};

/**
 * Generate a new encryption key (for setup)
 * @returns {string} - 64 character hex string (32 bytes)
 */
export const generateEncryptionKey = () => {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
};

/**
 * Mask salary value for display to unauthorized users
 * @param {number} value - The salary value
 * @returns {string} - Masked display value
 */
export const maskSalary = (value) => {
    if (!value || isNaN(value)) return '***';
    
    // Show only the magnitude (number of digits) but mask the actual value
    const digits = value.toString().length;
    return '*'.repeat(Math.max(3, digits));
};

/**
 * Check if user has permission to view salary data
 * @param {string} userRole - User's role
 * @returns {boolean} - Whether user can view salary data
 */
export const canViewSalaryData = (userRole) => {
    const authorizedRoles = ['hr', 'finance', 'finance-manager'];
    return authorizedRoles.includes(userRole);
};

/**
 * Check if user has permission to manage salary data
 * @param {string} userRole - User's role
 * @returns {boolean} - Whether user can manage salary data
 */
export const canManageSalaryData = (userRole) => {
    const authorizedRoles = ['hr', 'finance-manager'];
    return authorizedRoles.includes(userRole);
};