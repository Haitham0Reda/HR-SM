// User Controller
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logAuthEvent } from '../../../../middleware/activityLogger.js';
import xlsx from 'xlsx';
import { 
    logControllerAction, 
    logControllerError, 
    logDataAccess, 
    logSecurityEvent,
    logAuthenticationEvent,
    logAdminAction 
} from '../../../../utils/controllerLogger.js';

// Helper: sanitize user object (remove sensitive fields)
const sanitizeUser = (user) => {
    const obj = user.toObject ? user.toObject() : user;
    delete obj.password;
    return obj;
};

// Helper: validate user input based on model
const validateUserInput = (data, isUpdate = false) => {
    const validRoles = ['employee', 'admin', 'hr', 'manager', 'id-card-admin', 'supervisor', 'head-of-department', 'dean'];

    if (!isUpdate) {
        if (!data.username || typeof data.username !== 'string') return 'Username is required.';
        if (!data.email || typeof data.email !== 'string') return 'Email is required.';
        if (!data.password || typeof data.password !== 'string') return 'Password is required.';
    }
    if (data.role && !validRoles.includes(data.role)) return 'Invalid role.';
    if (data.status && !['active', 'vacation', 'resigned', 'inactive'].includes(data.status)) return 'Invalid status.';
    if (data.profile) {
        if (data.profile.gender && !['male', 'female'].includes(data.profile.gender)) return 'Invalid gender.';
        if (data.profile.maritalStatus && !['single', 'married', 'divorced', 'widowed'].includes(data.profile.maritalStatus)) return 'Invalid marital status.';
    }
    if (data.employment) {
        if (data.employment.contractType && !['full-time', 'part-time', 'contract', 'probation'].includes(data.employment.contractType)) return 'Invalid contract type.';
        if (data.employment.employmentStatus && !['active', 'on-leave', 'vacation', 'inactive', 'terminated', 'resigned'].includes(data.employment.employmentStatus)) return 'Invalid employment status.';
    }
    return null;
};

export const getAllUsers = async (req, res) => {
    try {
        // Log controller action start
        logControllerAction(req, 'getAllUsers', {
            controller: 'UserController',
            filters: req.query
        });

        // Get tenant ID
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        console.log('🔍 Fetching users for tenant:', tenantId);
        console.log('🔍 Request tenantId:', req.tenantId);
        console.log('🔍 User tenantId:', req.user?.tenantId);
        
        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }
        
        // Build query with tenant filtering
        const query = { tenantId: tenantId };
        
        const users = await models.User.find(query)
            .populate({
                path: 'department',
                populate: {
                    path: 'parentDepartment',
                    select: 'name code'
                }
            })
            .populate('position');
            
        console.log(`✓ Found ${users.length} users for tenant ${tenantId}`);
        
        // Log sensitive data access
        logDataAccess(req, 'users', {
            operation: 'read',
            recordsAccessed: users.length,
            sensitiveData: true,
            filters: req.query
        });
        
        res.json({
            success: true,
            data: users.map(sanitizeUser)
        });
    } catch (err) {
        console.error('❌ Error fetching users:', err);
        logControllerError(req, err, {
            controller: 'UserController',
            action: 'getAllUsers'
        });
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

export const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Safely get current user ID - auth middleware sets req.user.id, not req.user._id
        const currentUserId = req.user?.id || 'unknown';
        
        // Get the tenant ID from multiple sources
        const tenantId = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'];
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }
        
        console.log(`🔍 Fetching user ${userId}, tenant: ${tenantId}, current user: ${currentUserId}`);
        console.log(`🔍 Request details:`, {
            'req.user': req.user,
            'req.tenantId': req.tenantId,
            'req.headers.authorization': req.headers.authorization ? 'Bearer [REDACTED]' : 'None'
        });
        
        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }
        
        // Find user in tenant database
        const user = await models.User.findOne({ _id: userId, tenantId: tenantId })
            .populate({
                path: 'department',
                populate: {
                    path: 'parentDepartment',
                    select: 'name code'
                }
            })
            .populate('position');
            
        if (!user) {
            console.log(`❌ User ${userId} not found in tenant ${tenantId}`);
            return res.status(404).json({ 
                success: false,
                message: 'User not found'
            });
        }

        console.log(`✓ Found user: ${user.email} (tenant: ${tenantId})`);
        
        // Log sensitive data access
        logDataAccess(req, 'user', {
            operation: 'read',
            resourceId: userId,
            sensitiveData: true
        });

        res.json({
            success: true,
            data: sanitizeUser(user)
        });
    } catch (err) {
        console.error('❌ Error fetching user by ID:', err);
        logControllerError(req, err, {
            controller: 'UserController',
            action: 'getUserById'
        });
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const createUser = async (req, res) => {
    try {
        const error = validateUserInput(req.body);
        if (error) return res.status(400).json({ error });

        // Remove employeeId from request body if provided (it will be auto-generated)
        delete req.body.employeeId;

        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get company email domain
        const CompanyService = (await import('../../../../services/CompanyService.js')).default;
        const companyService = new CompanyService();
        const emailDomain = await companyService.getCompanyEmailDomain(tenantId);
        
        if (!emailDomain) {
            return res.status(400).json({
                success: false,
                message: 'Company email domain not configured. Please contact administrator.'
            });
        }

        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }

        // Auto-generate email if not provided
        let email = req.body.email;
        if (!email) {
            const { generateUniqueEmail } = await import('../../../../utils/emailGenerator.js');
            try {
                // Pass the complete user data for name-based email generation
                const userDataForEmail = {
                    firstName: req.body.personalInfo?.firstName || req.body.firstName,
                    lastName: req.body.personalInfo?.lastName || req.body.lastName,
                    username: req.body.username,
                    personalInfo: req.body.personalInfo
                };
                
                email = await generateUniqueEmail(models.User, userDataForEmail, emailDomain, tenantId);
                console.log(`📧 Auto-generated email: ${email} for user: ${userDataForEmail.firstName} ${userDataForEmail.lastName} (${userDataForEmail.username})`);
            } catch (emailError) {
                console.error('❌ Error generating email:', emailError);
                return res.status(400).json({
                    success: false,
                    message: `Failed to generate email: ${emailError.message}`
                });
            }
        }

        // Check for duplicate username/email within the same tenant
        const conditions = [
            { email: email, tenantId },
            { username: req.body.username, tenantId }
        ];

        const existing = await models.User.findOne({ $or: conditions });

        if (existing) {
            if (existing.email === email) {
                return res.status(409).json({ 
                    success: false,
                    message: 'Email already exists' 
                });
            }
            if (existing.username === req.body.username) {
                return res.status(409).json({ 
                    success: false,
                    message: 'Username already exists' 
                });
            }
        }

        // Ensure tenantId and generated email are set
        const userData = { ...req.body, tenantId, email };
        
        console.log('👤 Creating user with tenant context:', { email: userData.email, username: userData.username, tenantId: userData.tenantId });

        const user = new models.User(userData);
        await user.save();
        await user.populate({
            path: 'department',
            populate: {
                path: 'parentDepartment',
                select: 'name code'
            }
        });
        await user.populate('position');
        
        res.status(201).json({
            success: true,
            data: sanitizeUser(user),
            message: email !== req.body.email ? `Email auto-generated: ${email}` : undefined
        });
    } catch (err) {
        console.error('❌ Error creating user:', err);
        // Handle MongoDB duplicate key errors
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(409).json({
                success: false,
                message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
            });
        }
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const updateUser = async (req, res) => {
    try {
        // For profile updates (no params.id), use the logged-in user's ID
        const userId = req.params.id || req.user.id;

        const error = validateUserInput(req.body, true);
        if (error) return res.status(400).json({ error });

        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }
        
        // Prevent updating unique fields to existing values within the same tenant
        if (req.body.email || req.body.username || req.body.employeeId) {
            const conditions = [];
            if (req.body.email) conditions.push({ email: req.body.email, tenantId });
            if (req.body.username) conditions.push({ username: req.body.username, tenantId });
            if (req.body.employeeId) conditions.push({ employeeId: req.body.employeeId, tenantId });

            const conflict = await models.User.findOne({
                $or: conditions,
                _id: { $ne: userId }
            });

            if (conflict) {
                if (conflict.email === req.body.email) {
                    return res.status(409).json({ error: 'Email already exists' });
                }
                if (conflict.username === req.body.username) {
                    return res.status(409).json({ error: 'Username already exists' });
                }
                if (conflict.employeeId === req.body.employeeId) {
                    return res.status(409).json({ error: 'Employee ID already exists' });
                }
            }
        }

        // Build query with tenant filtering for update
        const query = { _id: userId, tenantId: tenantId };
        
        console.log('✏️ Updating user with query:', query);
        
        const user = await models.User.findOneAndUpdate(query, req.body, { new: true })
            .populate({
                path: 'department',
                populate: {
                    path: 'parentDepartment',
                    select: 'name code'
                }
            })
            .populate('position');
            
        if (!user) {
            console.log(`❌ User not found for update with ID ${userId} for tenant ${tenantId}`);
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        console.log(`✓ Updated user ${user.email} for tenant ${tenantId}`);
        res.json({
            success: true,
            data: sanitizeUser(user)
        });
    } catch (err) {
        console.error('❌ Error updating user:', err);
        // Handle MongoDB duplicate key errors
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(409).json({
                success: false,
                message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
            });
        }
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const deleteUser = async (req, res) => {
    try {
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }
        
        // Build query with tenant filtering
        const query = { _id: req.params.id, tenantId: tenantId };
        
        console.log('🗑️ Deleting user with query:', query);
        
        const user = await models.User.findOneAndDelete(query);
        if (!user) {
            console.log(`❌ User not found for deletion with ID ${req.params.id} for tenant ${tenantId}`);
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        console.log(`✓ Deleted user ${user.email} for tenant ${tenantId}`);
        res.json({ 
            success: true,
            message: 'User deleted successfully' 
        });
    } catch (err) {
        console.error('❌ Error deleting user:', err);
        res.status(500).json({ error: err.message });
    }
};

// Login controller
export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        logSecurityEvent(req, 'incomplete_login_attempt', {
            severity: 'low',
            missingFields: !email ? 'email' : 'password'
        });
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const user = await User.findOne({ email }).populate('department position');

        if (!user) {
            // Log failed login attempt - user not found
            logAuthEvent('LOGIN_FAILED', null, req, {
                email,
                reason: 'User not found'
            });
            
            // Enhanced authentication logging
            logAuthenticationEvent(req, 'login_failed', {
                success: false,
                userEmail: email,
                reason: 'user_not_found'
            });
            
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Compare password using model method
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            // Log failed login attempt - wrong password
            logAuthEvent('LOGIN_FAILED', user, req, {
                reason: 'Invalid password'
            });
            
            // Enhanced authentication logging
            logAuthenticationEvent(req, 'login_failed', {
                success: false,
                userId: user._id.toString(),
                userEmail: email,
                reason: 'invalid_password'
            });
            
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token with user's role and tenantId from database
        const token = jwt.sign(
            { 
                id: user._id, 
                userId: user._id,
                role: user.role, 
                tenantId: user.tenantId 
            }, 
            process.env.TENANT_JWT_SECRET || process.env.JWT_SECRET || 'secret', 
            { expiresIn: '1d' }
        );

        // Log successful login with detailed information
        logAuthEvent('LOGIN_SUCCESS', user, req, {
            department: user.department?.name,
            position: user.position?.title,
            lastLogin: user.lastLogin
        });
        
        // Enhanced authentication logging
        logAuthenticationEvent(req, 'login_success', {
            success: true,
            userId: user._id.toString(),
            userEmail: email,
            userRole: user.role,
            department: user.department?.name,
            position: user.position?.title,
            lastLogin: user.lastLogin
        });

        res.json({ user: sanitizeUser(user), token });
    } catch (err) {
        logAuthEvent('LOGIN_FAILED', null, req, {
            email,
            reason: 'Server error',
            error: err.message
        });
        
        logControllerError(req, err, {
            controller: 'UserController',
            action: 'loginUser',
            userEmail: email
        });
        
        res.status(500).json({ error: err.message });
    }
};

// Get current user profile
export const getUserProfile = async (req, res) => {
    try {
        console.log('🔍 getUserProfile called');
        console.log('   req.user.id:', req.user?.id);
        console.log('   req.tenantId:', req.tenantId);
        console.log('   req.user.tenantId:', req.user?.tenantId);
        
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }
        
        // Find user in tenant database
        const user = await models.User.findOne({ _id: req.user.id, tenantId: tenantId })
            .populate({
                path: 'department',
                populate: {
                    path: 'parentDepartment',
                    select: 'name code'
                }
            })
            .populate('position');
        
        if (!user) {
            console.log(`❌ User profile not found for ID ${req.user.id} in tenant ${tenantId}`);
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        console.log(`✅ User profile found: ${user.email} (tenant: ${tenantId})`);
        res.json({
            success: true,
            data: sanitizeUser(user)
        });
    } catch (err) {
        console.error('❌ Error in getUserProfile:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        console.log('updateUserProfile called - User:', req.user?._id);
        console.log('Request body:', req.body);

        const userId = req.user.id;

        // Build the update object - profilePicture should be inside personalInfo
        const allowedUpdates = {};

        if (req.body.personalInfo) {
            allowedUpdates.personalInfo = req.body.personalInfo;
        }

        // If profilePicture is sent separately, add it to personalInfo
        if (req.body.profilePicture) {
            if (!allowedUpdates.personalInfo) {
                allowedUpdates.personalInfo = {};
            }
            allowedUpdates.personalInfo.profilePicture = req.body.profilePicture;
        }

        const user = await User.findByIdAndUpdate(userId, allowedUpdates, { new: true, runValidators: true })
            .populate('department position');

        if (!user) return res.status(404).json({ error: 'User not found' });

        console.log('Profile updated successfully:', user.personalInfo?.profilePicture);
        res.json(sanitizeUser(user));
    } catch (err) {
        console.error('Error in updateUserProfile:', err);
        res.status(400).json({ error: err.message });
    }
};

// Upload profile picture
export const uploadProfilePicture = async (req, res) => {
    try {
        const userId = req.params.id;
        const currentUserId = req.user.id;
        
        // Check if user can upload (own profile or admin)
        if (userId !== currentUserId && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Not authorized to upload profile picture for this user' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'No file uploaded' 
            });
        }

        // Create the profile picture URL
        const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;

        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        console.log(`🔍 Profile picture upload for user ${userId}, tenant: ${tenantId}`);

        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }

        // Update user profile picture in tenant database
        const user = await models.User.findOneAndUpdate(
            { _id: userId, tenantId: tenantId },
            { 'personalInfo.profilePicture': profilePictureUrl },
            { new: true, runValidators: true }
        ).populate({
            path: 'department',
            populate: {
                path: 'parentDepartment',
                select: 'name code'
            }
        }).populate('position');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        console.log(`✅ Profile picture uploaded successfully for user ${user.email} (${tenantId})`);
        res.json({
            success: true,
            message: 'Profile picture uploaded successfully',
            profilePicture: profilePictureUrl,
            data: sanitizeUser(user)
        });
    } catch (err) {
        console.error('❌ Error uploading profile picture:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to upload profile picture',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Get user plain password (for credential generation - Admin only)
export const getUserPlainPassword = async (req, res) => {
    try {
        // Get tenant ID from request
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            console.log('❌ No tenant ID available for plain password request');
            return res.status(400).json({ error: 'Tenant ID required' });
        }

        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: modelError.message
            });
        }
        
        // Build query with tenant filtering
        const query = { _id: req.params.id, tenantId };
        
        console.log('🔑 Fetching plain password with query:', query);
        console.log('🏢 Using tenant connection for:', tenantId);
        
        const user = await models.User.findOne(query).select('+plainPassword');
        if (!user) {
            console.log(`❌ User not found for plain password with ID ${req.params.id} for tenant ${tenantId}`);
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.plainPassword) {
            console.log(`⚠️ Plain password not available for user ${user.email}`);
            return res.status(404).json({
                error: 'Plain password not available. Password was set before this feature was implemented.'
            });
        }

        console.log(`✓ Retrieved plain password for user ${user.email} for tenant ${tenantId}`);
        res.json({ plainPassword: user.plainPassword });
    } catch (err) {
        console.error('❌ Error fetching plain password:', err);
        res.status(500).json({ error: err.message });
    }
};


// Update vacation balance for a user
export const updateVacationBalance = async (req, res) => {
    try {
        const { userId } = req.params;
        const { annualTotal, casualTotal, flexibleTotal } = req.body;

        // Build query with tenant filtering
        const query = { _id: userId };
        
        // Apply tenant filtering if tenantId is available
        if (req.tenantId) {
            query.tenantId = req.tenantId;
        } else if (req.user?.tenantId) {
            query.tenantId = req.user.tenantId;
        }
        
        console.log('📊 Updating vacation balance with query:', query);

        const user = await User.findOne(query);
        if (!user) {
            console.log(`❌ User not found for vacation balance update with ID ${userId} for tenant ${query.tenantId || 'unknown'}`);
            return res.status(404).json({ error: 'User not found' });
        }

        // Initialize vacationBalance if it doesn't exist
        if (!user.vacationBalance) {
            user.vacationBalance = {};
        }

        // Update the balance totals
        if (annualTotal !== undefined) {
            user.vacationBalance.annualTotal = annualTotal;
        }
        if (casualTotal !== undefined) {
            user.vacationBalance.casualTotal = casualTotal;
        }
        if (flexibleTotal !== undefined) {
            user.vacationBalance.flexibleTotal = flexibleTotal;
        }

        await user.save();

        console.log(`✓ Updated vacation balance for user ${user.email} for tenant ${query.tenantId || 'unknown'}`);
        res.json({
            success: true,
            message: 'Vacation balance updated successfully',
            vacationBalance: user.vacationBalance
        });
    } catch (err) {
        console.error('❌ Error updating vacation balance:', err);
        res.status(500).json({ error: err.message });
    }
};

// Bulk update vacation balances for multiple users
export const bulkUpdateVacationBalances = async (req, res) => {
    try {
        const { updates } = req.body; // Array of { userId, annualTotal, casualTotal, flexibleTotal }

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: 'Updates array is required' });
        }

        const results = [];
        const errors = [];

        for (const update of updates) {
            try {
                const { userId, annualTotal, casualTotal, flexibleTotal } = update;

                const user = await User.findById(userId);
                if (!user) {
                    errors.push({ userId, error: 'User not found' });
                    continue;
                }

                // Initialize vacationBalance if it doesn't exist
                if (!user.vacationBalance) {
                    user.vacationBalance = {};
                }

                // Update the balance totals
                if (annualTotal !== undefined) {
                    user.vacationBalance.annualTotal = annualTotal;
                }
                if (casualTotal !== undefined) {
                    user.vacationBalance.casualTotal = casualTotal;
                }
                if (flexibleTotal !== undefined) {
                    user.vacationBalance.flexibleTotal = flexibleTotal;
                }

                await user.save();
                results.push({ userId, success: true });
            } catch (err) {
                errors.push({ userId: update.userId, error: err.message });
            }
        }

        res.json({
            success: true,
            message: `Updated ${results.length} vacation balance(s)`,
            updated: results.length,
            failed: errors.length,
            results,
            errors
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Bulk create users from Excel file
export const bulkCreateUsers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Get company email domain
        const CompanyService = (await import('../../../../services/CompanyService.js')).default;
        const companyService = new CompanyService();
        const emailDomain = await companyService.getCompanyEmailDomain(tenantId);
        
        if (!emailDomain) {
            return res.status(400).json({
                success: false,
                message: 'Company email domain not configured. Please contact administrator.'
            });
        }

        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }

        // Parse Excel file
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        if (!data || data.length === 0) {
            return res.status(400).json({ error: 'Excel file is empty' });
        }

        // Prepare users data for bulk email generation
        const usersForEmailGeneration = data.map(row => ({
            firstName: row.firstName || row.FirstName || row['First Name'],
            lastName: row.lastName || row.LastName || row['Last Name'],
            username: row.username || row.Username,
            email: row.email || row.Email, // Keep existing email if provided
            personalInfo: {
                firstName: row.firstName || row.FirstName || row['First Name'],
                lastName: row.lastName || row.LastName || row['Last Name']
            }
        })).filter(user => 
            (user.firstName && user.lastName) || user.username // Must have name or username
        );

        // Generate emails for users that don't have one
        const { generateBulkUniqueEmails } = await import('../../../../utils/emailGenerator.js');
        let usersWithEmails;
        try {
            const usersNeedingEmails = usersForEmailGeneration.filter(user => !user.email);
            if (usersNeedingEmails.length > 0) {
                const generatedEmailUsers = await generateBulkUniqueEmails(models.User, usersNeedingEmails, emailDomain, tenantId);
                
                // Create a map of user identifier to generated email
                const emailMap = new Map();
                generatedEmailUsers.forEach(user => {
                    const key = user.firstName && user.lastName 
                        ? `${user.firstName}_${user.lastName}` 
                        : user.username;
                    emailMap.set(key, user.email);
                });
                
                // Apply generated emails to original data
                usersWithEmails = usersForEmailGeneration.map(user => {
                    if (user.email) return user; // Keep existing email
                    
                    const key = user.firstName && user.lastName 
                        ? `${user.firstName}_${user.lastName}` 
                        : user.username;
                    
                    return {
                        ...user,
                        email: emailMap.get(key) || user.email
                    };
                });
            } else {
                usersWithEmails = usersForEmailGeneration;
            }
        } catch (emailError) {
            console.error('❌ Error generating bulk emails:', emailError);
            return res.status(400).json({
                success: false,
                message: `Failed to generate emails: ${emailError.message}`
            });
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                // Get the email for this user (either provided or generated)
                const firstName = row.firstName || row.FirstName || row['First Name'];
                const lastName = row.lastName || row.LastName || row['Last Name'];
                const username = row.username || row.Username;
                
                const userKey = firstName && lastName 
                    ? `${firstName}_${lastName}` 
                    : username;
                    
                const userWithEmail = usersWithEmails.find(u => {
                    const uKey = u.firstName && u.lastName 
                        ? `${u.firstName}_${u.lastName}` 
                        : u.username;
                    return uKey === userKey;
                });
                
                const email = userWithEmail?.email;

                if (!email) {
                    errors.push({ row: i + 2, error: 'First name + last name or username is required for email generation' });
                    continue;
                }

                // Map Excel columns to user fields (support multiple column name formats)
                const userData = {
                    tenantId,
                    username: row.username || row.Username,
                    email: email,
                    password: row.password || row.Password || 'DefaultPassword123',
                    role: row.role || row.Role || 'employee',
                    status: row.status || row.Status || 'active',
                    employeeId: row.employeeId || row.EmployeeId || row['Employee ID'],

                    // Personal Information
                    personalInfo: {
                        fullName: row.fullName || row.FullName || row['Full Name'],
                        firstName: row.firstName || row.FirstName || row['First Name'],
                        medName: row.medName || row.MedName || row['Middle Name'],
                        lastName: row.lastName || row.LastName || row['Last Name'],
                        arabicName: row.arabicName || row.ArabicName || row['Arabic Name'],
                        dateOfBirth: row.dateOfBirth || row.DateOfBirth || row['Date of Birth'],
                        gender: row.gender || row.Gender,
                        nationality: row.nationality || row.Nationality,
                        nationalId: row.nationalId || row.nationalID || row.NationalId || row.NationalID || row['National ID'],
                        phone: row.phone || row.phoneNumber || row.Phone || row.PhoneNumber || row['Phone Number'],
                        address: row.address || row.Address,
                        maritalStatus: row.maritalStatus || row.MaritalStatus || row['Marital Status']
                    },

                    // Employment Information
                    employment: {
                        hireDate: row.hireDate || row.HireDate || row['Hire Date'],
                        contractType: row.contractType || row.ContractType || row['Contract Type'],
                        employmentStatus: row.employmentStatus || row.EmploymentStatus || row['Employment Status']
                    },

                    // Vacation Balance
                    vacationBalance: {
                        annualTotal: row.annualTotal || row.AnnualTotal || row['Annual Total'] || 0,
                        annualUsed: row.annualUsed || row.AnnualUsed || row['Annual Used'] || 0,
                        casualTotal: row.casualTotal || row.CasualTotal || row['Casual Total'] || 7,
                        casualUsed: row.casualUsed || row.CasualUsed || row['Casual Used'] || 0,
                        flexibleTotal: row.flexibleTotal || row.FlexibleTotal || row['Flexible Total'] || 0,
                        flexibleUsed: row.flexibleUsed || row.FlexibleUsed || row['Flexible Used'] || 0
                    }
                };

                // Validate required fields
                if (!userData.username) {
                    errors.push({ row: i + 2, error: 'Username is required' });
                    continue;
                }

                // Check for duplicates within tenant
                const existing = await models.User.findOne({
                    $or: [
                        { email: userData.email, tenantId },
                        { username: userData.username, tenantId }
                    ]
                });

                if (existing) {
                    if (existing.email === userData.email) {
                        errors.push({ row: i + 2, username: userData.username, error: 'Email already exists' });
                    } else {
                        errors.push({ row: i + 2, username: userData.username, error: 'Username already exists' });
                    }
                    continue;
                }

                // Create user
                const user = new models.User(userData);
                await user.save();
                results.push({
                    row: i + 2,
                    username: userData.username,
                    email: userData.email,
                    emailGenerated: userData.email !== (row.email || row.Email),
                    success: true
                });
            } catch (err) {
                errors.push({
                    row: i + 2,
                    username: row.username || row.Username,
                    error: err.message
                });
            }
        }

        res.json({
            success: true,
            message: `Processed ${data.length} rows: ${results.length} created, ${errors.length} failed`,
            created: results.length,
            failed: errors.length,
            results,
            errors
        });
    } catch (err) {
        console.error('❌ Error in bulk create users:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
