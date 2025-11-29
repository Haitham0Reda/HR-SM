import ForgetCheck from '../models/forgetCheck.model.js';
import User from '../models/user.model.js';

export const getAllForgetChecks = async (req, res) => {
    try {
        const query = {};
        const { user, isHR, isAdmin } = req;

        // Filter by user/employee if provided
        if (req.query.user) {
            query.employee = req.query.user;
        } else if (req.query.employee) {
            query.employee = req.query.employee;
        }

        // Role-based filtering
        if (!isHR && !isAdmin) {
            // Regular users see only their own requests
            query.employee = user._id;
        }

        const forgetChecks = await ForgetCheck.find(query)
            .populate('employee', 'username email personalInfo')
            .populate('approvedBy rejectedBy', 'username personalInfo')
            .populate('department', 'name')
            .populate('position', 'title')
            .sort({ createdAt: -1 });

        res.json(forgetChecks);
    } catch (err) {
        console.error('Get forget checks error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createForgetCheck = async (req, res) => {
    try {
        console.log('=== CREATE FORGET CHECK REQUEST ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Get employee details to populate department and position
        const employee = await User.findById(req.body.employee || req.body.user)
            .populate('department')
            .populate('position');

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Add department and position to request
        req.body.employee = employee._id;
        req.body.department = employee.department?._id;
        req.body.position = employee.position?._id;

        const forgetCheck = new ForgetCheck(req.body);
        const savedForgetCheck = await forgetCheck.save();

        console.log('Forget check saved successfully:', savedForgetCheck._id);

        res.status(201).json(savedForgetCheck);
    } catch (err) {
        console.error('Create forget check error:', err);
        res.status(400).json({
            error: err.message,
            details: err.errors ? Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            })) : null
        });
    }
};

export const getForgetCheckById = async (req, res) => {
    try {
        const forgetCheck = await ForgetCheck.findById(req.params.id)
            .populate('employee', 'username email personalInfo')
            .populate('approvedBy rejectedBy', 'username personalInfo')
            .populate('department', 'name')
            .populate('position', 'title');

        if (!forgetCheck) {
            return res.status(404).json({ error: 'Forget check request not found' });
        }

        res.json(forgetCheck);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateForgetCheck = async (req, res) => {
    try {
        const forgetCheck = await ForgetCheck.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!forgetCheck) {
            return res.status(404).json({ error: 'Forget check request not found' });
        }

        res.json(forgetCheck);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteForgetCheck = async (req, res) => {
    try {
        const forgetCheck = await ForgetCheck.findByIdAndDelete(req.params.id);

        if (!forgetCheck) {
            return res.status(404).json({ error: 'Forget check request not found' });
        }

        res.json({ message: 'Forget check request deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const approveForgetCheck = async (req, res) => {
    try {
        const forgetCheck = await ForgetCheck.findById(req.params.id);

        if (!forgetCheck) {
            return res.status(404).json({ error: 'Forget check request not found' });
        }

        // Check if user has permission to approve
        const canApprove = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canApprove) {
            return res.status(403).json({ error: 'You do not have permission to approve forget check requests' });
        }

        await forgetCheck.approve(req.user._id);

        res.json(forgetCheck);
    } catch (err) {
        console.error('Approve forget check error:', err);
        res.status(400).json({ error: err.message });
    }
};

export const rejectForgetCheck = async (req, res) => {
    try {
        const forgetCheck = await ForgetCheck.findById(req.params.id);

        if (!forgetCheck) {
            return res.status(404).json({ error: 'Forget check request not found' });
        }

        // Check if user has permission to reject
        const canReject = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canReject) {
            return res.status(403).json({ error: 'You do not have permission to reject forget check requests' });
        }

        const { reason } = req.body;

        // Validate reason
        if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
            return res.status(400).json({ error: 'Rejection reason must be at least 10 characters long' });
        }

        await forgetCheck.reject(req.user._id, reason.trim());

        res.json(forgetCheck);
    } catch (err) {
        console.error('Reject forget check error:', err);
        res.status(400).json({ error: err.message });
    }
};
