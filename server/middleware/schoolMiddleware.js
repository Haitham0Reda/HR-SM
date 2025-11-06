/**
 * School Middleware
 * 
 * Validation and business logic for schools
 */
import mongoose from 'mongoose';

/**
 * Validate school code
 */
export const validateSchoolCode = (req, res, next) => {
    const validCodes = ['BUS', 'ENG', 'CS'];
    
    if (req.body.schoolCode) {
        const code = req.body.schoolCode.toUpperCase();
        
        if (!validCodes.includes(code)) {
            return res.status(400).json({
                success: false,
                message: `School code must be one of: ${validCodes.join(', ')}`
            });
        }
        
        req.body.schoolCode = code; // Ensure uppercase
    }
    next();
};

/**
 * Validate school name matches code
 */
export const validateSchoolNameMatch = (req, res, next) => {
    const schoolMapping = {
        'BUS': 'School of Business',
        'ENG': 'School of Engineering',
        'CS': 'School of Computer Science'
    };

    const arabicMapping = {
        'BUS': 'المعهد الكندى العالى للإدارة بالسادس من اكتوبر',
        'ENG': 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر',
        'CS': 'المعهد الكندى العالى للحاسبات والذكاء الاصطناعى بالسادس من اكتوبر'
    };

    if (req.body.schoolCode) {
        const code = req.body.schoolCode.toUpperCase();
        
        // Auto-set name if not provided
        if (!req.body.name) {
            req.body.name = schoolMapping[code];
        }
        
        // Auto-set Arabic name if not provided
        if (!req.body.arabicName) {
            req.body.arabicName = arabicMapping[code];
        }

        // Validate provided name matches code
        if (req.body.name !== schoolMapping[code]) {
            return res.status(400).json({
                success: false,
                message: `School name must be "${schoolMapping[code]}" for code ${code}`
            });
        }
    }
    next();
};

/**
 * Validate school code uniqueness
 */
export const checkSchoolCodeUnique = async (req, res, next) => {
    try {
        if (req.body.schoolCode) {
            const School = mongoose.model('School');
            const schoolId = req.params.id;

            const query = { schoolCode: req.body.schoolCode.toUpperCase() };
            if (schoolId) {
                query._id = { $ne: schoolId };
            }

            const existingSchool = await School.findOne(query);

            if (existingSchool) {
                return res.status(400).json({
                    success: false,
                    message: 'School code already exists'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error checking school code uniqueness:', error);
        next();
    }
};

/**
 * Validate dean assignment
 */
export const validateDean = async (req, res, next) => {
    try {
        if (req.body.dean) {
            const User = mongoose.model('User');
            const dean = await User.findById(req.body.dean);

            if (!dean) {
                return res.status(404).json({
                    success: false,
                    message: 'Dean not found'
                });
            }

            if (!['manager', 'hr', 'admin'].includes(dean.role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Dean must have manager, HR, or admin role'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error validating dean:', error);
        next();
    }
};

/**
 * Validate school before deletion
 * Check if school has active departments
 */
export const validateSchoolDeletion = async (req, res, next) => {
    try {
        const School = mongoose.model('School');
        const Department = mongoose.model('Department');
        
        const school = await School.findById(req.params.id);
        
        if (!school) {
            return res.status(404).json({
                success: false,
                message: 'School not found'
            });
        }

        const departmentCount = await Department.countDocuments({ 
            school: req.params.id,
            isActive: true 
        });

        if (departmentCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete school. ${departmentCount} active department(s) are assigned to this school.`
            });
        }

        next();
    } catch (error) {
        console.error('Error validating school deletion:', error);
        return res.status(500).json({
            success: false,
            message: 'Error validating school deletion'
        });
    }
};

export default {
    validateSchoolCode,
    validateSchoolNameMatch,
    checkSchoolCodeUnique,
    validateDean,
    validateSchoolDeletion
};
