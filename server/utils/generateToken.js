/**
 * JWT Token Generation Utility
 * 
 * Generates and sets JWT tokens in HTTP-only cookies
 * Provides secure authentication token management
 */

import jwt from 'jsonwebtoken';

/**
 * Generate JWT token and set it in HTTP-only cookie
 * 
 * @param {Object} res - Express response object
 * @param {string} userId - User ID to encode in token
 * @returns {string} Generated JWT token
 * 
 * Token Configuration:
 * - Expires in 2 days
 * - HTTP-only cookie (prevents XSS attacks)
 * - Secure flag in production
 * - SameSite strict (prevents CSRF attacks)
 */
const generateToken = (res, userId) => {
    // Generate JWT token with user ID
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '2d',
    });
    
    // Set token in HTTP-only cookie for security
    res.cookie('token', token, {
        httpOnly: true, // Prevents JavaScript access (XSS protection)
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // CSRF protection
        maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days in milliseconds
    });
    
    return token;
};

export default generateToken;
