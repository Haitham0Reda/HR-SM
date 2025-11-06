/**
 * Document Template Middleware
 * 
 * Validation and business logic for document templates
 */

/**
 * Validate template file type
 */
export const validateTemplateFileType = (req, res, next) => {
    const allowedTypes = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'txt'];
    
    if (req.body.fileType && !allowedTypes.includes(req.body.fileType.toLowerCase())) {
        return res.status(400).json({
            success: false,
            message: `File type must be one of: ${allowedTypes.join(', ')}`
        });
    }
    next();
};

/**
 * Validate template name uniqueness
 */
export const checkTemplateNameUnique = async (req, res, next) => {
    try {
        if (req.body.name) {
            const mongoose = await import('mongoose');
            const DocumentTemplate = mongoose.default.model('DocumentTemplate');
            const templateId = req.params.id;

            const query = { name: req.body.name, isActive: true };
            if (templateId) {
                query._id = { $ne: templateId };
            }

            const existingTemplate = await DocumentTemplate.findOne(query);

            if (existingTemplate) {
                return res.status(400).json({
                    success: false,
                    message: 'Template name already exists'
                });
            }
        }
        next();
    } catch (error) {
        console.error('Error checking template name uniqueness:', error);
        next();
    }
};

/**
 * Auto-set created by from authenticated user
 */
export const setTemplateCreatedBy = (req, res, next) => {
    if (req.user && !req.body.createdBy) {
        req.body.createdBy = req.user._id;
    }
    next();
};

/**
 * Validate template file exists
 */
export const validateTemplateFile = (req, res, next) => {
    if (!req.body.fileUrl && !req.file) {
        return res.status(400).json({
            success: false,
            message: 'Template file is required'
        });
    }
    next();
};

export default {
    validateTemplateFileType,
    checkTemplateNameUnique,
    setTemplateCreatedBy,
    validateTemplateFile
};
