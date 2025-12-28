import UserService from '../services/UserService.js';

const userService = new UserService();

// Get all users
export const getUsers = async (req, res) => {
    try {
        const { role, status, department, page = 1, limit = 20, search } = req.query;

        const filters = {
            role,
            status,
            department,
            page,
            limit,
            search,
            tenantId: req.tenantId
        };

        const result = await userService.getUsers(filters);

        res.json({
            success: true,
            data: result.users,
            pagination: result.pagination
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
        const user = await userService.getUserById(req.params.id, req.tenantId);

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        const statusCode = error.message === 'User not found' ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

// Create user
export const createUser = async (req, res) => {
    try {
        const user = await userService.createUser(req.body, req.user.id, req.tenantId);

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
        const user = await userService.updateUser(req.params.id, req.body, req.user.id, req.tenantId);

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        const statusCode = error.message === 'User not found' ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

// Delete user (soft delete by setting status to inactive)
export const deleteUser = async (req, res) => {
    try {
        const result = await userService.deleteUser(req.params.id, req.user.id, req.tenantId);

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        const statusCode = error.message === 'User not found' ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

// Get user's subordinates
export const getSubordinates = async (req, res) => {
    try {
        const subordinates = await userService.getSubordinates(req.params.id, req.tenantId);

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
