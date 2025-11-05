import express from 'express';
import {
    getAllUsers,
    createUser,
    getUserById,
    updateUser,
    deleteUser
} from '../controller/user.controller.js';
import {
    protect,
    admin,
    checkEmailUnique,
    checkUsernameUnique,
    validateHireDate,
    validateDateOfBirth,
    validatePhoneNumber,
    validateNationalID,
    hashPassword
} from '../middleware/index.js';

const router = express.Router();

// Get all users - Protected, all authenticated users can view
router.get('/', protect, getAllUsers);

// Create user - Admin only with full validation
router.post('/',
    protect,
    admin,
    checkEmailUnique,
    checkUsernameUnique,
    validateHireDate,
    validateDateOfBirth,
    validatePhoneNumber,
    validateNationalID,
    hashPassword,
    createUser
);

// Get user by ID - Protected
router.get('/:id', protect, getUserById);

// Update user - Admin only with validation
router.put('/:id',
    protect,
    admin,
    checkEmailUnique,
    checkUsernameUnique,
    validateHireDate,
    validateDateOfBirth,
    validatePhoneNumber,
    validateNationalID,
    updateUser
);

// Delete user - Admin only
router.delete('/:id', protect, admin, deleteUser);

export default router;
