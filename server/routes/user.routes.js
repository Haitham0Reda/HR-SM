import express from 'express';
import {
    getAllUsers,
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    getUserPlainPassword
} from '../controller/user.controller.js';
import { bulkDownloadPhotos } from '../controller/userPhoto.controller.js';
import {
    protect,
    admin,
    checkEmailUnique,
    checkUsernameUnique,
    validateHireDate,
    validateDateOfBirth,
    validatePhoneNumber,
    validateNationalID,
    validatePassword
} from '../middleware/index.js';

const router = express.Router();

// Login route - Public (no auth required)
router.post('/login', loginUser);

// IMPORTANT: Profile routes must come BEFORE /:id routes to avoid matching "profile" as an ID
// Get current user profile - Protected
router.get('/profile', protect, getUserProfile);

// Update current user profile - Protected (users can update their own profile)
router.put('/profile', protect, updateUserProfile);

// Get all users - Protected, all authenticated users can view
router.get('/', protect, getAllUsers);

// Bulk download user photos - Protected (supports both POST and GET)
router.post('/bulk-download-photos', protect, bulkDownloadPhotos);
router.get('/bulk-download-photos', bulkDownloadPhotos); // GET with token in query

// Test photo download endpoint
router.get('/test-photo-download', protect, async (req, res) => {
    res.json({ 
        message: 'Photo download endpoint is working',
        timestamp: new Date().toISOString()
    });
});

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
    validatePassword,
    createUser
);

// Get user by ID - Protected
router.get('/:id', protect, getUserById);

// Get user plain password - Admin only (for credential generation)
router.get('/:id/plain-password', protect, admin, getUserPlainPassword);

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