import { body, param, query } from 'express-validator';

/**
 * Validation middleware for Insurance Provider operations
 */

// Validation for creating insurance provider
export const validateCreateProvider = [
    body('name')
        .notEmpty()
        .withMessage('Provider name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Provider name must be between 2 and 100 characters')
        .trim(),
    
    body('nameArabic')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Arabic name must not exceed 100 characters')
        .trim(),
    
    body('code')
        .notEmpty()
        .withMessage('Provider code is required')
        .isLength({ min: 2, max: 10 })
        .withMessage('Provider code must be between 2 and 10 characters')
        .matches(/^[A-Z0-9]+$/)
        .withMessage('Provider code must contain only uppercase letters and numbers')
        .trim(),
    
    body('contactInfo.email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('contactInfo.phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    
    body('contactInfo.website')
        .optional()
        .isURL()
        .withMessage('Please provide a valid website URL'),
    
    body('licenseNumber')
        .optional()
        .isLength({ max: 50 })
        .withMessage('License number must not exceed 50 characters')
        .trim(),
    
    body('establishedYear')
        .optional()
        .isInt({ min: 1900, max: new Date().getFullYear() })
        .withMessage(`Established year must be between 1900 and ${new Date().getFullYear()}`),
    
    body('insuranceTypes')
        .optional()
        .isArray()
        .withMessage('Insurance types must be an array'),
    
    body('insuranceTypes.*')
        .optional()
        .isIn(['health', 'life', 'dental', 'vision', 'disability', 'accident', 'travel', 'other'])
        .withMessage('Invalid insurance type'),
    
    body('coverageAreas')
        .optional()
        .isArray()
        .withMessage('Coverage areas must be an array'),
    
    body('coverageAreas.*')
        .optional()
        .isIn(['cairo', 'alexandria', 'giza', 'luxor', 'aswan', 'nationwide', 'international'])
        .withMessage('Invalid coverage area'),
    
    body('financialInfo.currency')
        .optional()
        .isIn(['EGP', 'USD', 'EUR'])
        .withMessage('Currency must be EGP, USD, or EUR'),
    
    body('financialInfo.paymentTerms')
        .optional()
        .isIn(['monthly', 'quarterly', 'semi-annual', 'annual'])
        .withMessage('Invalid payment terms'),
    
    body('financialInfo.commissionRate')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Commission rate must be between 0 and 100'),
    
    body('status')
        .optional()
        .isIn(['active', 'inactive', 'suspended', 'pending'])
        .withMessage('Invalid status'),
    
    body('rating')
        .optional()
        .isFloat({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    
    body('contractInfo.startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date'),
    
    body('contractInfo.endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date'),
    
    body('contractInfo.renewalDate')
        .optional()
        .isISO8601()
        .withMessage('Renewal date must be a valid date'),
    
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must not exceed 1000 characters')
        .trim(),
    
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes must not exceed 500 characters')
        .trim()
];

// Validation for updating insurance provider
export const validateUpdateProvider = [
    param('id')
        .isMongoId()
        .withMessage('Invalid provider ID'),
    
    body('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Provider name must be between 2 and 100 characters')
        .trim(),
    
    body('nameArabic')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Arabic name must not exceed 100 characters')
        .trim(),
    
    body('code')
        .optional()
        .isLength({ min: 2, max: 10 })
        .withMessage('Provider code must be between 2 and 10 characters')
        .matches(/^[A-Z0-9]+$/)
        .withMessage('Provider code must contain only uppercase letters and numbers')
        .trim(),
    
    body('contactInfo.email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('contactInfo.phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    
    body('contactInfo.website')
        .optional()
        .isURL()
        .withMessage('Please provide a valid website URL'),
    
    body('licenseNumber')
        .optional()
        .isLength({ max: 50 })
        .withMessage('License number must not exceed 50 characters')
        .trim(),
    
    body('establishedYear')
        .optional()
        .isInt({ min: 1900, max: new Date().getFullYear() })
        .withMessage(`Established year must be between 1900 and ${new Date().getFullYear()}`),
    
    body('insuranceTypes')
        .optional()
        .isArray()
        .withMessage('Insurance types must be an array'),
    
    body('insuranceTypes.*')
        .optional()
        .isIn(['health', 'life', 'dental', 'vision', 'disability', 'accident', 'travel', 'other'])
        .withMessage('Invalid insurance type'),
    
    body('coverageAreas')
        .optional()
        .isArray()
        .withMessage('Coverage areas must be an array'),
    
    body('coverageAreas.*')
        .optional()
        .isIn(['cairo', 'alexandria', 'giza', 'luxor', 'aswan', 'nationwide', 'international'])
        .withMessage('Invalid coverage area'),
    
    body('financialInfo.currency')
        .optional()
        .isIn(['EGP', 'USD', 'EUR'])
        .withMessage('Currency must be EGP, USD, or EUR'),
    
    body('financialInfo.paymentTerms')
        .optional()
        .isIn(['monthly', 'quarterly', 'semi-annual', 'annual'])
        .withMessage('Invalid payment terms'),
    
    body('financialInfo.commissionRate')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Commission rate must be between 0 and 100'),
    
    body('status')
        .optional()
        .isIn(['active', 'inactive', 'suspended', 'pending'])
        .withMessage('Invalid status'),
    
    body('rating')
        .optional()
        .isFloat({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    
    body('contractInfo.startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date'),
    
    body('contractInfo.endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date'),
    
    body('contractInfo.renewalDate')
        .optional()
        .isISO8601()
        .withMessage('Renewal date must be a valid date'),
    
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must not exceed 1000 characters')
        .trim(),
    
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes must not exceed 500 characters')
        .trim()
];

// Validation for provider ID parameter
export const validateProviderId = [
    param('id')
        .isMongoId()
        .withMessage('Invalid provider ID')
];

// Validation for deactivating provider
export const validateDeactivateProvider = [
    param('id')
        .isMongoId()
        .withMessage('Invalid provider ID'),
    
    body('reason')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Reason must not exceed 500 characters')
        .trim()
];

// Validation for query parameters
export const validateProviderQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    query('status')
        .optional()
        .custom((value) => {
            if (value === '' || value === undefined || value === null) return true;
            return ['active', 'inactive', 'suspended', 'pending'].includes(value);
        })
        .withMessage('Invalid status filter'),
    
    query('insuranceType')
        .optional()
        .custom((value) => {
            if (value === '' || value === undefined || value === null) return true;
            return ['health', 'life', 'dental', 'vision', 'disability', 'accident', 'travel', 'other'].includes(value);
        })
        .withMessage('Invalid insurance type filter'),
    
    query('search')
        .optional()
        .custom((value) => {
            if (value === '' || value === undefined || value === null) return true;
            return value.length >= 1 && value.length <= 100;
        })
        .withMessage('Search term must be between 1 and 100 characters'),
    
    query('sort')
        .optional()
        .custom((value) => {
            if (value === '' || value === undefined || value === null) return true;
            return ['name', '-name', 'createdAt', '-createdAt', 'rating', '-rating', 'status', '-status'].includes(value);
        })
        .withMessage('Invalid sort parameter')
];

// Custom validation for contract dates
export const validateContractDates = (req, res, next) => {
    const { contractInfo } = req.body;
    
    if (contractInfo) {
        const { startDate, endDate, renewalDate } = contractInfo;
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (start >= end) {
                return res.status(400).json({
                    success: false,
                    message: 'Contract end date must be after start date'
                });
            }
        }
        
        if (renewalDate && endDate) {
            const renewal = new Date(renewalDate);
            const end = new Date(endDate);
            
            if (renewal > end) {
                return res.status(400).json({
                    success: false,
                    message: 'Renewal date must be before or equal to end date'
                });
            }
        }
    }
    
    next();
};