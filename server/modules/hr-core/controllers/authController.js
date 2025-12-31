import jwt from 'jsonwebtoken';
import User from '../users/models/user.model.js';
import TenantConfig from '../models/TenantConfig.js';
import AuditLog from '../models/AuditLog.js';
import { generateTenantToken } from '../../../core/auth/tenantAuth.js';
import multiTenantDB from '../../../config/multiTenant.js';

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
    console.log('🚀 AUTH CONTROLLER: Login function called');
    try {
        const { email, password, tenantId } = req.body;

        console.log('🔍 Login attempt:', { email, tenantId, hasPassword: !!password });

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide tenant ID'
            });
        }

        // Get tenant-specific database connection
        console.log('🔗 Getting tenant database connection for:', tenantId);
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Get User model for this tenant's database
        const TenantUser = tenantConnection.model('User', User.schema);

        // Find user with password field in tenant-specific database
        const user = await TenantUser.findOne({ email, tenantId }).select('+password');
        console.log('👤 User found:', !!user, user ? { email: user.email, tenantId: user.tenantId, status: user.status } : 'No user');

        // Debug: List all users to see what's in the database
        if (!user) {
            const allUsers = await TenantUser.find({}).select('email tenantId role').limit(10);
            console.log('📋 All users in tenant database (first 10):');
            allUsers.forEach(u => console.log(`   - ${u.email} (tenant: ${u.tenantId}, role: ${u.role})`));
        }

        if (!user || !(await user.comparePassword(password))) {
            // Log failed attempt
            if (user) {
                console.log('❌ Password comparison failed for user:', user.email);
                const TenantAuditLog = tenantConnection.model('AuditLog', AuditLog.schema);
                await TenantAuditLog.create({
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
            } else {
                console.log('❌ No user found with email:', email, 'and tenantId:', tenantId);
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
        if (tenant && tenant.deploymentMode === 'on-premise' && !tenant.validateLicense()) {
            return res.status(403).json({
                success: false,
                message: 'License expired or invalid'
            });
        }

        const token = generateToken(user);

        // Log successful login
        const TenantAuditLog = tenantConnection.model('AuditLog', AuditLog.schema);
        await TenantAuditLog.create({
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
        console.error('🚨 Login error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get current user
export const getCurrentUser = async (req, res) => {
    try {
        // Get tenant-specific database connection
        const tenantConnection = await multiTenantDB.getCompanyConnection(req.tenantId);
        const TenantUser = tenantConnection.model('User', User.schema);
        
        const user = await TenantUser.findOne({
            _id: req.user.id,
            tenantId: req.tenantId
        });

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
