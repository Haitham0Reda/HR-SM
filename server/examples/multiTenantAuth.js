/**
 * Multi-Tenant Authentication Example
 * 
 * Shows how to implement authentication that works with the multi-tenant system
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { tenantMiddleware, requireCompany, getCompanyModel } from '../middleware/tenantMiddleware.js';
import User from '../modules/hr-core/users/models/user.model.js';

const router = express.Router();

// Apply tenant middleware to all auth routes
router.use(tenantMiddleware);

/**
 * POST /auth/login
 * Login with company-specific credentials
 * 
 * Body: {
 *   email: "admin@techcorp.com",
 *   password: "admin123",
 *   company: "techcorp_solutions" // Optional if provided in header/query
 * }
 */
router.post('/login', requireCompany, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Get User model for the current company
        const UserModel = getCompanyModel(req, 'User', User);

        // Find user in company database
        const user = await UserModel.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (user.employment?.employmentStatus !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Account is not active'
            });
        }

        // Generate JWT token with company information
        const tokenPayload = {
            userId: user._id,
            email: user.email,
            role: user.role,
            company: req.company.sanitizedName,
            companyName: req.company.name,
            employeeId: user.employeeId
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
            expiresIn: '24h'
        });

        // Update last login
        await UserModel.findByIdAndUpdate(user._id, {
            lastLogin: new Date()
        });

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: userResponse,
                company: {
                    name: req.company.name,
                    sanitizedName: req.company.sanitizedName
                },
                expiresIn: '24h'
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

/**
 * POST /auth/verify
 * Verify JWT token and return user info
 */
router.post('/verify', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.cookies?.token || 
                     req.body.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // The company should be in the token, but we can also check middleware
        const companyName = decoded.company || req.company?.sanitizedName;

        if (!companyName) {
            return res.status(400).json({
                success: false,
                message: 'Company information missing'
            });
        }

        // Get company connection
        const connection = await multiTenantDB.getCompanyConnection(companyName);
        const UserModel = connection.model('User', User.schema);

        // Find user in company database
        const user = await UserModel.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is still active
        if (user.employment?.employmentStatus !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Account is not active'
            });
        }

        res.json({
            success: true,
            data: {
                user: user,
                company: {
                    name: decoded.companyName,
                    sanitizedName: decoded.company
                },
                tokenValid: true
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Token verification failed'
        });
    }
});

/**
 * POST /auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', (req, res) => {
    // In a stateless JWT system, logout is typically handled client-side
    // You could implement token blacklisting here if needed
    
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

/**
 * GET /auth/profile
 * Get current user profile
 */
router.get('/profile', requireCompany, async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const UserModel = getCompanyModel(req, 'User', User);

        const user = await UserModel.findById(decoded.userId)
            .populate('department')
            .populate('position');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user,
                company: {
                    name: req.company.name,
                    sanitizedName: req.company.sanitizedName
                }
            }
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

/**
 * PUT /auth/profile
 * Update user profile
 */
router.put('/profile', requireCompany, async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const UserModel = getCompanyModel(req, 'User', User);

        // Only allow updating certain fields
        const allowedUpdates = [
            'personalInfo.phone',
            'personalInfo.address',
            'personalInfo.emergencyContact'
        ];

        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        const user = await UserModel.findByIdAndUpdate(
            decoded.userId,
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).populate('department').populate('position');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

/**
 * POST /auth/change-password
 * Change user password
 */
router.post('/change-password', requireCompany, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        const token = req.header('Authorization')?.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const UserModel = getCompanyModel(req, 'User', User);

        const user = await UserModel.findById(decoded.userId).select('+password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await UserModel.findByIdAndUpdate(user._id, {
            password: hashedNewPassword,
            updatedAt: new Date()
        });

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

export default router;

/*
Usage Examples:

1. Login to a specific company:
   POST /auth/login
   Headers: { "x-company-id": "techcorp_solutions" }
   Body: { "email": "admin@techcorp.com", "password": "admin123" }

2. Login with company in body:
   POST /auth/login
   Body: { 
     "email": "admin@techcorp.com", 
     "password": "admin123",
     "company": "techcorp_solutions"
   }

3. Verify token:
   POST /auth/verify
   Headers: { "Authorization": "Bearer your_jwt_token" }

4. Get profile:
   GET /auth/profile
   Headers: { 
     "Authorization": "Bearer your_jwt_token",
     "x-company-id": "techcorp_solutions"
   }

5. Change password:
   POST /auth/change-password
   Headers: { 
     "Authorization": "Bearer your_jwt_token",
     "x-company-id": "techcorp_solutions"
   }
   Body: {
     "currentPassword": "admin123",
     "newPassword": "newpassword123"
   }

Integration in main app:
import multiTenantAuth from './examples/multiTenantAuth.js';
app.use('/api/auth', multiTenantAuth);
*/