// Hard Copy Controller
import HardCopy from '../models/hardcopy.model.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
        let query = { tenantId: req.tenantId };

        // Role-based filtering
        if (req.user.role === 'employee') {
            // Employees only see their own hard copies or public ones
            query.$or = [
                { uploadedBy: req.user.id },
                { isPublic: true }
            ];
        }
        // HR and Admin see all hard copies (no additional filtering needed)

        const hardCopies = await HardCopy.find(query)
            .populate('uploadedBy', 'email firstName lastName role employeeId')
            .sort({ createdAt: -1 });

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
        const hardCopyData = {
            ...req.body,
            uploadedBy: req.user.id,
            tenantId: req.tenantId
        };

        const hardCopy = await HardCopy.create(hardCopyData);
        
        await hardCopy.populate('uploadedBy', 'email firstName lastName role employeeId');

        res.status(201).json({
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

export const getHardCopyById = async (req, res) => {
    try {
        const hardCopy = await HardCopy.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        })
            .populate('uploadedBy', 'email firstName lastName role employeeId');

        if (!hardCopy) {
            return res.status(404).json({
                success: false,
                message: 'Hard copy not found'
            });
        }

        // Check access permissions
        const canAccess = 
            hardCopy.uploadedBy?._id.toString() === req.user.id ||
            ['hr', 'admin'].includes(req.user.role) ||
            hardCopy.isPublic;

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
        const hardCopy = await HardCopy.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            { ...req.body, updatedBy: req.user.id },
            { new: true }
        )
            .populate('uploadedBy', 'email firstName lastName role employeeId');

        if (!hardCopy) {
            return res.status(404).json({
                success: false,
                message: 'Hard copy not found'
            });
        }

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

        const hardCopyData = {
            title: title || req.file.originalname,
            description: description || '',
            category: category || 'general',
            fileName: req.file.originalname,
            fileUrl: fileUrl,
            fileSize: req.file.size,
            uploadedBy: req.user.id,
            tenantId: req.tenantId
        };

        const hardCopy = await HardCopy.create(hardCopyData);
        
        await hardCopy.populate('uploadedBy', 'email firstName lastName role employeeId');

        res.status(201).json({
            success: true,
            data: hardCopy,
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
        
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

export const deleteHardCopy = async (req, res) => {
    try {
        const hardCopy = await HardCopy.findOneAndDelete({
            _id: req.params.id,
            tenantId: req.tenantId
        });

        if (!hardCopy) {
            return res.status(404).json({
                success: false,
                message: 'Hard copy not found'
            });
        }

        // Delete the physical file if it exists
        if (hardCopy.fileUrl && hardCopy.fileUrl.startsWith('/uploads/hardcopies/')) {
            const filename = path.basename(hardCopy.fileUrl);
            const filePath = path.join(process.cwd(), 'uploads', 'hardcopies', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

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