import express from 'express';
import multer from 'multer';
import path from 'path';
import {
    getAllUsers,
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    getUserPlainPassword,
    updateVacationBalance,
    bulkUpdateVacationBalances,
    bulkCreateUsers,
    uploadProfilePicture
} from '../controllers/user.controller.js';
import { bulkDownloadPhotos } from '../controllers/userPhoto.controller.js';
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
} from '../../../../middleware/index.js';

const router = express.Router();

// Configure multer for Excel file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xls, .xlsx) are allowed'));
        }
    }
});

// Configure multer for profile picture upload
const profilePictureUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/profile-pictures/');
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, GIF) are allowed'));
        }
    }
});

// Login route - Public (no auth required)
router.post('/login', loginUser);

console.log('🔍 Registering profile routes...');

// IMPORTANT: Profile routes must come BEFORE /:id routes to avoid matching "profile" as an ID
// Get current user profile - Protected
try {
    router.get('/profile', (req, res, next) => {
        console.log('🛣️ Profile route matched!');
        next();
    }, protect, getUserProfile);
    console.log('✅ GET /profile route registered');
} catch (error) {
    console.error('❌ Error registering GET /profile route:', error);
}

// Update current user profile - Protected (users can update their own profile)
try {
    router.put('/profile', protect, updateUserProfile);
    console.log('✅ PUT /profile route registered');
} catch (error) {
    console.error('❌ Error registering PUT /profile route:', error);
}

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

// Upload profile picture - Protected (users can upload their own, admins can upload for others)
router.post('/:id/profile-picture', protect, profilePictureUpload.single('profilePicture'), uploadProfilePicture);

// Get user plain password - Admin only (for credential generation)
router.get('/:id/plain-password', protect, admin, getUserPlainPassword);

// Update vacation balance - Admin/HR only
router.put('/:id/vacation-balance', protect, admin, updateVacationBalance);

// Bulk update vacation balances - Admin/HR only
router.post('/bulk-update-vacation-balances', protect, admin, bulkUpdateVacationBalances);

// Bulk create users from Excel - Admin only
router.post('/bulk-create', protect, admin, upload.single('file'), bulkCreateUsers);

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