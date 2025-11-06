/**
 * User Middleware
 * 
 * Validates user creation and updates.
 */
import mongoose from 'mongoose';

/**
 * Validate email uniqueness middleware
 * Prevents duplicate email addresses
 */
export const checkEmailUnique = async (req, res, next) => {
    try {
        if (req.body.email) {
            const User = mongoose.model('User');
            const userId = req.params.id;

            const query = { email: req.body.email };
            if (userId) {
                query._id = { $ne: userId };
            }

            const existingUser = await User.findOne(query);

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email address already in use'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error checking email uniqueness:', error);
        next();
    }
};

/**
 * Validate username uniqueness middleware
 * Prevents duplicate usernames
 */
export const checkUsernameUnique = async (req, res, next) => {
    try {
        if (req.body.username) {
            const User = mongoose.model('User');
            const userId = req.params.id;

            const query = { username: req.body.username };
            if (userId) {
                query._id = { $ne: userId };
            }

            const existingUser = await User.findOne(query);

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already taken'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error checking username uniqueness:', error);
        next();
    }
};

/**
 * Validate hire date middleware
 * Ensures hire date is valid
 */
export const validateHireDate = (req, res, next) => {
    if (req.body.employment?.hireDate) {
        const hireDate = new Date(req.body.employment.hireDate);
        const now = new Date();

        // Hire date cannot be more than 50 years in the past
        const fiftyYearsAgo = new Date(now.getFullYear() - 50, now.getMonth(), now.getDate());
        if (hireDate < fiftyYearsAgo) {
            return res.status(400).json({
                success: false,
                message: 'Hire date seems incorrect (more than 50 years ago)'
            });
        }

        // Hire date can be up to 1 year in the future (for planned hires)
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        if (hireDate > oneYearFromNow) {
            return res.status(400).json({
                success: false,
                message: 'Hire date cannot be more than 1 year in the future'
            });
        }
    }
    next();
};

/**
 * Validate date of birth middleware
 * Ensures DOB is valid
 */
export const validateDateOfBirth = (req, res, next) => {
    if (req.body.profile?.dateOfBirth) {
        const dob = new Date(req.body.profile.dateOfBirth);
        const now = new Date();

        // Must be at least 16 years old
        const sixteenYearsAgo = new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());
        if (dob > sixteenYearsAgo) {
            return res.status(400).json({
                success: false,
                message: 'Employee must be at least 16 years old'
            });
        }

        // Cannot be more than 100 years old
        const oneHundredYearsAgo = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
        if (dob < oneHundredYearsAgo) {
            return res.status(400).json({
                success: false,
                message: 'Date of birth seems incorrect'
            });
        }
    }
    next();
};

/**
 * Validate phone number middleware
 * Ensures phone number format is valid
 */
export const validatePhoneNumber = (req, res, next) => {
    if (req.body.profile?.phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(req.body.profile.phone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format'
            });
        }
    }
    next();
};

/**
 * Validate national ID middleware
 * Ensures national ID is numeric
 */
export const validateNationalID = (req, res, next) => {
    if (req.body.profile?.nationalId) {
        const nationalIdRegex = /^\d+$/;
        if (!nationalIdRegex.test(req.body.profile.nationalId)) {
            return res.status(400).json({
                success: false,
                message: 'National ID must contain only numbers'
            });
        }
    }
    next();
};

/**
 * Validate password middleware
 * Validates password strength requirements
 */
export const validatePassword = async (req, res, next) => {
    if (req.body.password) {
        // Minimum length check
        if (req.body.password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Optional: Add more password strength requirements
        // e.g., must contain uppercase, lowercase, numbers, special characters
    }
    next();
};
