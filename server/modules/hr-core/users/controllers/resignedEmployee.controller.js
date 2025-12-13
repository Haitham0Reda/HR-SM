import ResignedEmployee from '../models/resignedEmployee.model.js';
import User from '../models/user.model.js';

/**
 * Get all resigned employees with optional filtering
 */
export const getAllResignedEmployees = async (req, res) => {
    try {
        const query = { tenantId: req.tenantId };

        // Filter by department if provided
        if (req.query.department) {
            query.department = req.query.department;
        }

        // Filter by resignation reason if provided
        if (req.query.resignationReason) {
            query.resignationReason = req.query.resignationReason;
        }

        // Filter by date range if provided
        if (req.query.startDate || req.query.endDate) {
            query.resignationDate = {};
            if (req.query.startDate) {
                query.resignationDate.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                query.resignationDate.$lte = new Date(req.query.endDate);
            }
        }

        const resignedEmployees = await ResignedEmployee.find(query)
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('processedBy', 'username personalInfo')
            .sort({ resignationDate: -1 });

        res.json({
            success: true,
            data: resignedEmployees
        });
    } catch (err) {
        console.error('Get resigned employees error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

/**
 * Create a new resigned employee record
 */
export const createResignedEmployee = async (req, res) => {
    try {
        const resignedEmployee = new ResignedEmployee({
            ...req.body,
            tenantId: req.tenantId,
            processedBy: req.user._id
        });

        const savedResignedEmployee = await resignedEmployee.save();

        // Optionally deactivate the user account
        if (req.body.deactivateAccount && req.body.employee) {
            await User.findByIdAndUpdate(req.body.employee, { 
                isActive: false,
                resignationDate: req.body.resignationDate 
            });
        }

        res.status(201).json({
            success: true,
            data: savedResignedEmployee
        });
    } catch (err) {
        console.error('Create resigned employee error:', err);
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * Get resigned employee by ID
 */
export const getResignedEmployeeById = async (req, res) => {
    try {
        const resignedEmployee = await ResignedEmployee.findOne({ 
            _id: req.params.id, 
            tenantId: req.tenantId 
        })
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('processedBy', 'username personalInfo');

        if (!resignedEmployee) {
            return res.status(404).json({ 
                success: false,
                message: 'Resigned employee record not found' 
            });
        }

        res.json({
            success: true,
            data: resignedEmployee
        });
    } catch (err) {
        console.error('Get resigned employee by ID error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

/**
 * Update resigned employee record
 */
export const updateResignedEmployee = async (req, res) => {
    try {
        const resignedEmployee = await ResignedEmployee.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            { ...req.body, updatedBy: req.user._id },
            { new: true, runValidators: true }
        )
            .populate('employee', 'username email employeeId personalInfo')
            .populate('department', 'name code')
            .populate('position', 'title')
            .populate('processedBy', 'username personalInfo');

        if (!resignedEmployee) {
            return res.status(404).json({ 
                success: false,
                message: 'Resigned employee record not found' 
            });
        }

        res.json({
            success: true,
            data: resignedEmployee
        });
    } catch (err) {
        console.error('Update resigned employee error:', err);
        res.status(400).json({ 
            success: false,
            message: err.message 
        });
    }
};

/**
 * Delete resigned employee record
 */
export const deleteResignedEmployee = async (req, res) => {
    try {
        const resignedEmployee = await ResignedEmployee.findOneAndDelete({ 
            _id: req.params.id, 
            tenantId: req.tenantId 
        });

        if (!resignedEmployee) {
            return res.status(404).json({ 
                success: false,
                message: 'Resigned employee record not found' 
            });
        }

        res.json({
            success: true,
            message: 'Resigned employee record deleted successfully'
        });
    } catch (err) {
        console.error('Delete resigned employee error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};
