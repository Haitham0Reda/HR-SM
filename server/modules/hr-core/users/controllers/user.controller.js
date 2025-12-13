// User Controller
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logAuthEvent } from '../../../../middleware/activityLogger.js';
import xlsx from 'xlsx';

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
        // Build query with tenant filtering
        const query = {};
        
        // Apply tenant filtering if tenantId is available
        if (req.tenantId) {
            query.tenantId = req.tenantId;
        } else if (req.user?.tenantId) {
            query.tenantId = req.user.tenantId;
        }
        
        console.log('🔍 Fetching users with query:', query);
        
        const users = await User.find(query)
            .populate({
                path: 'department',
                populate: {
                    path: 'parentDepartment',
                    select: 'name code'
                }
            })
            .populate('position');
            
        console.log(`✓ Found ${users.length} users for tenant ${query.tenantId || 'unknown'}`);
        res.json(users.map(sanitizeUser));
    } catch (err) {
        console.error('❌ Error fetching users:', err);
        res.status(500).json({ error: err.message });
    }
};

export const getUserById = async (req, res) => {
    try {
        // Build query with tenant filtering
        const query = { _id: req.params.id };
        
        // Apply tenant filtering if tenantId is available
        if (req.tenantId) {
            query.tenantId = req.tenantId;
        } else if (req.user?.tenantId) {
            query.tenantId = req.user.tenantId;
        }
        
        console.log('🔍 Fetching user by ID with query:', query);
        
        const user = await User.findOne(query)
            .populate({
                path: 'department',
                populate: {
                    path: 'parentDepartment',
                    select: 'name code'
                }
            })
            .populate('position');
            
        if (!user) {
            console.log(`❌ User not found with ID ${req.params.id} for tenant ${query.tenantId || 'unknown'}`);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`✓ Found user ${user.email} for tenant ${query.tenantId || 'unknown'}`);
        res.json(sanitizeUser(user));
    } catch (err) {
        console.error('❌ Error fetching user by ID:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createUser = async (req, res) => {
    try {
        const error = validateUserInput(req.body);
        if (error) return res.status(400).json({ error });

        // Remove employeeId from request body if provided (it will be auto-generated)
        delete req.body.employeeId;

        // Check for duplicate username/email within the same tenant
        const tenantId = req.tenantId || req.user?.tenantId;
        const conditions = [
            { email: req.body.email, tenantId },
            { username: req.body.username, tenantId }
        ];

        const existing = await User.findOne({ $or: conditions });

        if (existing) {
            if (existing.email === req.body.email) {
                return res.status(409).json({ error: 'Email already exists' });
            }
            if (existing.username === req.body.username) {
                return res.status(409).json({ error: 'Username already exists' });
            }
        }

        // Ensure tenantId is set from the authenticated user context
        const userData = { ...req.body };
        if (req.tenantId) {
            userData.tenantId = req.tenantId;
        } else if (req.user?.tenantId) {
            userData.tenantId = req.user.tenantId;
        }
        
        console.log('👤 Creating user with tenant context:', { email: userData.email, tenantId: userData.tenantId });

        const user = new User(userData);
        await user.save();
        await user.populate({
            path: 'department',
            populate: {
                path: 'parentDepartment',
                select: 'name code'
            }
        });
        await user.populate('position');
        res.status(201).json(sanitizeUser(user));
    } catch (err) {
        // Handle MongoDB duplicate key errors
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(409).json({
                error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
            });
        }
        res.status(400).json({ error: err.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        // For profile updates (no params.id), use the logged-in user's ID
        const userId = req.params.id || req.user._id;

        const error = validateUserInput(req.body, true);
        if (error) return res.status(400).json({ error });

        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        // Prevent updating unique fields to existing values within the same tenant
        if (req.body.email || req.body.username || req.body.employeeId) {
            const conditions = [];
            if (req.body.email) conditions.push({ email: req.body.email, tenantId });
            if (req.body.username) conditions.push({ username: req.body.username, tenantId });
            if (req.body.employeeId) conditions.push({ employeeId: req.body.employeeId, tenantId });

            const conflict = await User.findOne({
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
        const query = { _id: userId };
        if (tenantId) {
            query.tenantId = tenantId;
        }
        
        console.log('✏️ Updating user with query:', query);
        
        const user = await User.findOneAndUpdate(query, req.body, { new: true })
            .populate({
                path: 'department',
                populate: {
                    path: 'parentDepartment',
                    select: 'name code'
                }
            })
            .populate('position');
            
        if (!user) {
            console.log(`❌ User not found for update with ID ${userId} for tenant ${tenantId || 'unknown'}`);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`✓ Updated user ${user.email} for tenant ${tenantId || 'unknown'}`);
        res.json(sanitizeUser(user));
    } catch (err) {
        // Handle MongoDB duplicate key errors
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(409).json({
                error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
            });
        }
        res.status(400).json({ error: err.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        // Build query with tenant filtering
        const query = { _id: req.params.id };
        
        // Apply tenant filtering if tenantId is available
        if (req.tenantId) {
            query.tenantId = req.tenantId;
        } else if (req.user?.tenantId) {
            query.tenantId = req.user.tenantId;
        }
        
        console.log('🗑️ Deleting user with query:', query);
        
        const user = await User.findOneAndDelete(query);
        if (!user) {
            console.log(`❌ User not found for deletion with ID ${req.params.id} for tenant ${query.tenantId || 'unknown'}`);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`✓ Deleted user ${user.email} for tenant ${query.tenantId || 'unknown'}`);
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error('❌ Error deleting user:', err);
        res.status(500).json({ error: err.message });
    }
};

// Login controller
export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
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
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Compare password using model method
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            // Log failed login attempt - wrong password
            logAuthEvent('LOGIN_FAILED', user, req, {
                reason: 'Invalid password'
            });
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token with user's role from database
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

        // Log successful login with detailed information
        logAuthEvent('LOGIN_SUCCESS', user, req, {
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
        res.status(500).json({ error: err.message });
    }
};

// Get current user profile
export const getUserProfile = async (req, res) => {
    try {
        // req.user is set by the protect middleware
        const user = await User.findById(req.user._id).populate('department position');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(sanitizeUser(user));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        console.log('updateUserProfile called - User:', req.user?._id);
        console.log('Request body:', req.body);

        const userId = req.user._id;

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
        const currentUserId = req.user._id.toString();
        
        // Check if user can upload (own profile or admin)
        if (userId !== currentUserId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to upload profile picture for this user' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Create the profile picture URL
        const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;

        // Update user's profile picture
        const user = await User.findByIdAndUpdate(
            userId,
            { 
                'personalInfo.profilePicture': profilePictureUrl 
            },
            { new: true, runValidators: true }
        ).populate('department position');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('Profile picture uploaded successfully:', profilePictureUrl);
        res.json({
            message: 'Profile picture uploaded successfully',
            profilePicture: profilePictureUrl,
            user: sanitizeUser(user)
        });
    } catch (err) {
        console.error('Error uploading profile picture:', err);
        res.status(500).json({ error: 'Failed to upload profile picture' });
    }
};

// Get user plain password (for credential generation - Admin only)
export const getUserPlainPassword = async (req, res) => {
    try {
        // Build query with tenant filtering
        const query = { _id: req.params.id };
        
        // Apply tenant filtering if tenantId is available
        if (req.tenantId) {
            query.tenantId = req.tenantId;
        } else if (req.user?.tenantId) {
            query.tenantId = req.user.tenantId;
        }
        
        console.log('🔑 Fetching plain password with query:', query);
        
        const user = await User.findOne(query).select('+plainPassword');
        if (!user) {
            console.log(`❌ User not found for plain password with ID ${req.params.id} for tenant ${query.tenantId || 'unknown'}`);
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.plainPassword) {
            console.log(`⚠️ Plain password not available for user ${user.email}`);
            return res.status(404).json({
                error: 'Plain password not available. Password was set before this feature was implemented.'
            });
        }

        console.log(`✓ Retrieved plain password for user ${user.email} for tenant ${query.tenantId || 'unknown'}`);
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

        // Parse Excel file
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        if (!data || data.length === 0) {
            return res.status(400).json({ error: 'Excel file is empty' });
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                // Map Excel columns to user fields (support multiple column name formats)
                const userData = {
                    username: row.username || row.Username,
                    email: row.email || row.Email,
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
                if (!userData.email) {
                    errors.push({ row: i + 2, error: 'Email is required' });
                    continue;
                }

                // Check for duplicates
                const existing = await User.findOne({
                    $or: [
                        { email: userData.email },
                        { username: userData.username }
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
                const user = new User(userData);
                await user.save();
                results.push({
                    row: i + 2,
                    username: userData.username,
                    email: userData.email,
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
        res.status(500).json({ error: err.message });
    }
};
