import jwt from 'jsonwebtoken';
import User from '../users/models/user.model.js';
import TenantConfig from '../models/TenantConfig.js';
import AuditLog from '../models/AuditLog.js';
import { generateTenantToken } from '../../../core/auth/tenantAuth.js';

// Generate JWT token using tenant auth system
const generateToken = (user) => {
    return generateTenantToken(user._id.toString(), user.tenantId, user.role);
};

// Register (for initial setup or admin creating users)
export const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, role, tenantId, companyName } = req.body;

        // Check if this is first user (tenant setup)
        let tenant = await TenantConfig.findOne({ tenantId });

        if (!tenant) {
            // Create new tenant
            tenant = await TenantConfig.create({
                tenantId,
                companyName: companyName || 'New Company',
                deploymentMode: 'saas'
            });
        }

        // Validate license for on-premise
        if (tenant.deploymentMode === 'on-premise' && !tenant.validateLicense()) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired license'
            });
        }

        // Check employee limit
        const userCount = await User.countDocuments({ tenantId });
        const maxEmployees = tenant.subscription?.maxEmployees || tenant.license?.maxEmployees || 10;

        if (userCount >= maxEmployees) {
            return res.status(403).json({
                success: false,
                message: 'Employee limit reached for your plan'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email, tenantId });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        const user = await User.create({
            email,
            password,
            firstName,
            lastName,
            role: role || 'Employee',
            tenantId
        });

        const token = generateToken(user);

        // Remove password from response
        user.password = undefined;

        res.status(201).json({
            success: true,
            data: {
                user,
                token
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Login
export const login = async (req, res) => {
    try {
        const { email, password, tenantId } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Find user with password field
        const user = await User.findOne({ email, tenantId }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            // Log failed attempt
            if (user) {
                await AuditLog.create({
                    action: 'login',
                    resource: 'User',
                    resourceId: user._id,
                    userId: user._id,
                    tenantId,
                    status: 'failure',
                    errorMessage: 'Invalid credentials',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
            }

            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is not active'
            });
        }

        // Validate tenant license
        const tenant = await TenantConfig.findOne({ tenantId });
        if (tenant.deploymentMode === 'on-premise' && !tenant.validateLicense()) {
            return res.status(403).json({
                success: false,
                message: 'License expired or invalid'
            });
        }

        const token = generateToken(user);

        // Log successful login
        await AuditLog.create({
            action: 'login',
            resource: 'User',
            resourceId: user._id,
            userId: user._id,
            tenantId,
            status: 'success',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Remove password from response
        user.password = undefined;

        res.json({
            success: true,
            data: {
                user,
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get current user
export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.user.id,
            tenantId: req.tenantId
        })
            .populate('department', 'name code')
            .populate('position', 'title level');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Logout (client-side token removal, but log the action)
export const logout = async (req, res) => {
    try {
        // Only create audit log if user is properly authenticated
        if (req.user && req.user.id && req.tenantId) {
            await AuditLog.create({
                action: 'logout',
                resource: 'User',
                resourceId: req.user.id,
                userId: req.user.id,
                tenantId: req.tenantId,
                status: 'success',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        // Even if audit logging fails, logout should succeed
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
};

export default { register, login, getCurrentUser, logout };
