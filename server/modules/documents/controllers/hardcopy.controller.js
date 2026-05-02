// Hard Copy Controller
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import Hardcopy from '../models/hardcopy.model.js';
import User from '../../hr-core/users/models/user.model.js';

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'hardcopies');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images, PDFs, and document files are allowed!'));
    }
};

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: fileFilter
});

export const getAllHardCopies = async (req, res) => {
    try {
        // Base query with tenant isolation
        let where = { tenant_id: req.tenantId };

        // Role-based filtering
        if (req.user.role === 'employee') {
            // Employees only see their own hard copies or public ones
            const userId = req.user.id;
            where[Op.or] = [
                { created_by: userId },
                { is_public: true }
            ];
        }
        // HR and Admin see all hard copies (no additional filtering needed)

        const hardCopies = await Hardcopy.findAll({
            where,
            include: [{
                model: User,
                as: 'creator',
                attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'employee_id']
            }],
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: hardCopies
        });
    } catch (err) {
        console.error('Error fetching hard copies:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const createHardCopy = async (req, res) => {
    try {
        const userId = req.user.id;
        const hardCopyData = {
            ...req.body,
            created_by: userId,
            tenant_id: req.tenantId
        };

        const hardCopy = await Hardcopy.create(hardCopyData);
        
        const hardCopyWithUser = await Hardcopy.findByPk(hardCopy.id, {
            include: [{
                model: User,
                as: 'creator',
                attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'employee_id']
            }]
        });

        res.status(201).json({
            success: true,
            data: hardCopyWithUser
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

export const getHardCopyById = async (req, res) => {
    try {
        const hardCopy = await Hardcopy.findOne({
            where: {
                id: req.params.id,
                tenant_id: req.tenantId
            },
            include: [{
                model: User,
                as: 'creator',
                attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'employee_id']
            }]
        });

        if (!hardCopy) {
            return res.status(404).json({
                success: false,
                message: 'Hard copy not found'
            });
        }

        // Check access permissions
        const userId = req.user.id;
        const canAccess = 
            hardCopy.created_by === userId ||
            ['hr', 'admin'].includes(req.user.role) ||
            hardCopy.is_public;

        if (!canAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: hardCopy
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const updateHardCopy = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [updated] = await Hardcopy.update(
            { ...req.body, updated_by: userId },
            {
                where: {
                    id: req.params.id,
                    tenant_id: req.tenantId
                }
            }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Hard copy not found'
            });
        }

        const hardCopy = await Hardcopy.findOne({
            where: {
                id: req.params.id,
                tenant_id: req.tenantId
            },
            include: [{
                model: User,
                as: 'creator',
                attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'employee_id']
            }]
        });

        res.json({
            success: true,
            data: hardCopy
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

export const uploadHardCopy = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const { title, description, category } = req.body;

        // Generate file URL
        const fileUrl = `/uploads/hardcopies/${req.file.filename}`;

        const userId = req.user.id;
        console.log('Upload hardcopy - User ID:', userId, 'User:', req.user.email);

        const hardCopyData = {
            title: title || req.file.originalname,
            description: description || '',
            category: category || 'general',
            file_name: req.file.originalname,
            file_url: fileUrl,
            file_size: req.file.size,
            created_by: userId,
            tenant_id: req.tenantId
        };

        const hardCopy = await Hardcopy.create(hardCopyData);
        
        const hardCopyWithUser = await Hardcopy.findByPk(hardCopy.id, {
            include: [{
                model: User,
                as: 'creator',
                attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'employee_id']
            }]
        });

        res.status(201).json({
            success: true,
            data: hardCopyWithUser,
            message: 'File uploaded successfully'
        });
    } catch (err) {
        // Clean up uploaded file if database operation fails
        if (req.file) {
            const filePath = path.join(process.cwd(), 'uploads', 'hardcopies', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        console.error('Upload hardcopy error:', err);
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

export const deleteHardCopy = async (req, res) => {
    try {
        const hardCopy = await Hardcopy.findOne({
            where: {
                id: req.params.id,
                tenant_id: req.tenantId
            }
        });

        if (!hardCopy) {
            return res.status(404).json({
                success: false,
                message: 'Hard copy not found'
            });
        }

        // Delete the physical file if it exists
        if (hardCopy.file_url && hardCopy.file_url.startsWith('/uploads/hardcopies/')) {
            const filename = path.basename(hardCopy.file_url);
            const filePath = path.join(process.cwd(), 'uploads', 'hardcopies', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await hardCopy.destroy();

        res.json({
            success: true,
            message: 'Hard copy deleted successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};