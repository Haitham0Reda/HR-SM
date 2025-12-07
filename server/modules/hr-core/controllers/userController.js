import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

// Get all users
export const getUsers = async (req, res) => {
    try {
        const { role, status, department, page = 1, limit = 20, search } = req.query;

        const filter = { tenantId: req.tenantId };

        if (role) filter.role = role;
        if (status) filter.status = status;
        if (department) filter.department = department;

        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { employeeId: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .populate('department', 'name code')
            .populate('position', 'title level')
            .populate('manager', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await User.countDocuments(filter);

        res.json({
            success: true,
            data: users,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single user
export const getUser = async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        })
            .populate('department', 'name code')
            .populate('position', 'title level')
            .populate('manager', 'firstName lastName email');

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

// Create user
export const createUser = async (req, res) => {
    try {
        const userData = {
            ...req.body,
            tenantId: req.tenantId,
            createdBy: req.user.id
        };

        const user = await User.create(userData);

        await AuditLog.create({
            action: 'create',
            resource: 'User',
            resourceId: user._id,
            userId: req.user.id,
            tenantId: req.tenantId,
            module: 'hr-core'
        });

        await user.populate('department', 'name code');
        await user.populate('position', 'title level');

        res.status(201).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Update user
export const updateUser = async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const allowedUpdates = [
            'firstName', 'lastName', 'phone', 'dateOfBirth',
            'department', 'position', 'manager', 'role',
            'status', 'employeeId', 'hireDate', 'address'
        ];

        const updates = {};
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        Object.assign(user, updates);
        user.updatedBy = req.user.id;
        await user.save();

        await AuditLog.create({
            action: 'update',
            resource: 'User',
            resourceId: user._id,
            userId: req.user.id,
            tenantId: req.tenantId,
            module: 'hr-core',
            changes: updates
        });

        await user.populate('department', 'name code');
        await user.populate('position', 'title level');
        await user.populate('manager', 'firstName lastName email');

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Delete user (soft delete by setting status to inactive)
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.status = 'inactive';
        user.updatedBy = req.user.id;
        await user.save();

        await AuditLog.create({
            action: 'delete',
            resource: 'User',
            resourceId: user._id,
            userId: req.user.id,
            tenantId: req.tenantId,
            module: 'hr-core'
        });

        res.json({
            success: true,
            message: 'User deactivated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user's subordinates
export const getSubordinates = async (req, res) => {
    try {
        const subordinates = await User.find({
            manager: req.params.id,
            tenantId: req.tenantId,
            status: 'active'
        })
            .populate('department', 'name code')
            .populate('position', 'title level');

        res.json({
            success: true,
            data: subordinates
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export default {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getSubordinates
};
