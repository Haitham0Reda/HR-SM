// User Controller
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
        if (!data.school) return 'School is required.';
    }
    if (data.role && !validRoles.includes(data.role)) return 'Invalid role.';
    if (data.profile) {
        if (data.profile.gender && !['male', 'female'].includes(data.profile.gender)) return 'Invalid gender.';
        if (data.profile.maritalStatus && !['single', 'married', 'divorced', 'widowed'].includes(data.profile.maritalStatus)) return 'Invalid marital status.';
    }
    if (data.employment) {
        if (data.employment.contractType && !['full-time', 'part-time', 'contract', 'probation'].includes(data.employment.contractType)) return 'Invalid contract type.';
        if (data.employment.employmentStatus && !['active', 'on-leave', 'terminated', 'resigned'].includes(data.employment.employmentStatus)) return 'Invalid employment status.';
    }
    return null;
};

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().populate('department position school');
        res.json(users.map(sanitizeUser));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('department position school');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(sanitizeUser(user));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createUser = async (req, res) => {
    try {
        const error = validateUserInput(req.body);
        if (error) return res.status(400).json({ error });
        // Check for duplicate username/email
        const existing = await User.findOne({ $or: [{ email: req.body.email }, { username: req.body.username }] });
        if (existing) return res.status(409).json({ error: 'Username or email already exists' });
        const user = new User(req.body);
        await user.save();
        await user.populate('department position school');
        res.status(201).json(sanitizeUser(user));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        // For profile updates (no params.id), use the logged-in user's ID
        const userId = req.params.id || req.user._id;

        const error = validateUserInput(req.body, true);
        if (error) return res.status(400).json({ error });
        // Prevent updating unique fields to existing values
        if (req.body.email || req.body.username) {
            const conflict = await User.findOne({
                $or: [
                    req.body.email ? { email: req.body.email } : {},
                    req.body.username ? { username: req.body.username } : {}
                ],
                _id: { $ne: userId }
            });
            if (conflict) return res.status(409).json({ error: 'Username or email already exists' });
        }
        const user = await User.findByIdAndUpdate(userId, req.body, { new: true }).populate('department position school');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(sanitizeUser(user));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted' });
    } catch (err) {
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
        const user = await User.findOne({ email }).populate('department position school');
        if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

        // Compare password using model method
        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token with user's role from database
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
        res.json({ user: sanitizeUser(user), token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get current user profile
export const getUserProfile = async (req, res) => {
    try {
        // req.user is set by the protect middleware
        const user = await User.findById(req.user._id).populate('department position school');
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

        // Build the update object - profilePicture should be inside profile
        const allowedUpdates = {};

        if (req.body.profile) {
            allowedUpdates.profile = req.body.profile;
        }

        // If profilePicture is sent separately, add it to profile
        if (req.body.profilePicture) {
            if (!allowedUpdates.profile) {
                allowedUpdates.profile = {};
            }
            allowedUpdates.profile.profilePicture = req.body.profilePicture;
        }

        const user = await User.findByIdAndUpdate(userId, allowedUpdates, { new: true, runValidators: true })
            .populate('department position school');

        if (!user) return res.status(404).json({ error: 'User not found' });

        console.log('Profile updated successfully:', user.profile?.profilePicture);
        res.json(sanitizeUser(user));
    } catch (err) {
        console.error('Error in updateUserProfile:', err);
        res.status(400).json({ error: err.message });
    }
};
