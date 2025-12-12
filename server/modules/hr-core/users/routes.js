import express from 'express';
import multer from 'multer';
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
    bulkCreateUsers
} from './controllers/user.controller.js';
import { bulkDownloadPhotos } from './controllers/userPhoto.controller.js';
import {
    getAllDepartments,
    createDepartment,
    getDepartmentById,
    updateDepartment,
    deleteDepartment
} from './controllers/department.controller.js';
import {
    getAllPositions,
    createPosition,
    getPositionById,
    updatePosition,
    deletePosition
} from './controllers/position.controller.js';
import {
    protect,
    admin,
    checkEmailUnique,
    checkUsernameUnique,
    validateHireDate,
    validateDateOfBirth,
    validatePhoneNumber,
    validateNationalID,
    validatePassword,
    checkDepartmentCodeUnique,
    validateManager,
    checkPositionCodeUnique,
    validatePositionDepartment,
    validatePositionDeletion
} from '../../../middleware/index.js';

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

// ===== USER ROUTES =====

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

// ===== DEPARTMENT ROUTES =====

// Get all departments - All authenticated users can view
router.get('/departments', protect, getAllDepartments);

// Create department - Admin only with validation
router.post('/departments',
    protect,
    admin,
    validateManager,
    createDepartment
);

// Get department by ID - All authenticated users
router.get('/departments/:id', protect, getDepartmentById);

// Update department - Admin only with validation
router.put('/departments/:id',
    protect,
    admin,
    validateManager,
    updateDepartment
);

// Delete department - Admin only
router.delete('/departments/:id', protect, admin, deleteDepartment);

// ===== POSITION ROUTES =====

// Get all positions - All authenticated users can view
router.get('/positions', protect, getAllPositions);

// Create position - Admin only with validation
router.post('/positions',
    protect,
    admin,
    checkPositionCodeUnique,
    validatePositionDepartment,
    createPosition
);

// Get position by ID - All authenticated users
router.get('/positions/:id', protect, getPositionById);

// Update position - Admin only with validation
router.put('/positions/:id',
    protect,
    admin,
    checkPositionCodeUnique,
    validatePositionDepartment,
    updatePosition
);

// Delete position - Admin only with validation
router.delete('/positions/:id',
    protect,
    admin,
    validatePositionDeletion,
    deletePosition
);

export default router;