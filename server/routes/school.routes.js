import express from 'express';
import {
    getAllSchools,
    createSchool,
    getSchoolById,
    getSchoolByCode,
    updateSchool,
    deleteSchool,
    getActiveSchools
} from '../controller/school.controller.js';
import {
    protect,
    admin,
    validateSchoolCode,
    validateSchoolNameMatch,
    checkSchoolCodeUnique,
    validateDean,
    validateSchoolDeletion
} from '../middleware/index.js';

const router = express.Router();

// Get all schools - All authenticated users can view
router.get('/', protect, getAllSchools);

// Get active schools only
router.get('/active', protect, getActiveSchools);

// Get school by code
router.get('/code/:code', protect, getSchoolByCode);

// Create school - Admin only with validation
router.post('/',
    protect,
    admin,
    validateSchoolCode,
    validateSchoolNameMatch,
    checkSchoolCodeUnique,
    validateDean,
    createSchool
);

// Get school by ID - All authenticated users
router.get('/:id', protect, getSchoolById);

// Update school - Admin only with validation
router.put('/:id',
    protect,
    admin,
    validateSchoolCode,
    validateSchoolNameMatch,
    checkSchoolCodeUnique,
    validateDean,
    updateSchool
);

// Delete school - Admin only with validation
router.delete('/:id',
    protect,
    admin,
    validateSchoolDeletion,
    deleteSchool
);

export default router;
