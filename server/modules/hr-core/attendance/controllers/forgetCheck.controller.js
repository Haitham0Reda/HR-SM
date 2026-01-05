import ForgetCheck from '../models/forgetCheck.model.js';
import User from '../../users/models/user.model.js';
import Department from '../../users/models/department.model.js';
import Position from '../../users/models/position.model.js';
import mongoose from 'mongoose';
import multiTenantDB from '../../../../config/multiTenant.js';

export const getAllForgetChecks = async (req, res) => {
    try {
        // Get tenant-specific database connection
        const tenantConnection = await multiTenantDB.getCompanyConnection(req.tenantId);
        
        // Register models on tenant connection
        const TenantUser = tenantConnection.model('User', User.schema);
        const TenantForgetCheck = tenantConnection.model('ForgetCheck', ForgetCheck.schema);
        const TenantDepartment = tenantConnection.model('Department', Department.schema);
        const TenantPosition = tenantConnection.model('Position', Position.schema);

        const query = { tenantId: req.tenantId };
        const { user } = req;

        // Filter by user/employee if provided
        if (req.query.user) {
            query.employee = req.query.user;
        } else if (req.query.employee) {
            query.employee = req.query.employee;
        }

        // Role-based filtering - check user role
        const isHR = user.role === 'hr' || user.role === 'admin';
        if (!isHR) {
            // Regular users see only their own requests
            query.employee = user._id;
        }

        const forgetChecks = await TenantForgetCheck.find(query)
            .populate('employee', 'username email personalInfo')
            .populate('approvedBy rejectedBy', 'username personalInfo')
            .populate('department', 'name')
            .populate('position', 'title')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: forgetChecks
        });
    } catch (err) {
        console.error('Get forget checks error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
};

export const createForgetCheck = async (req, res) => {
    try {
        console.log('🔍 CREATE FORGET CHECK - START');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Authenticated user:', JSON.stringify(req.user, null, 2));
        console.log('Tenant ID:', req.tenantId);

        // Get tenant-specific database connection
        const tenantConnection = await multiTenantDB.getCompanyConnection(req.tenantId);
        
        // Register models on tenant connection
        const TenantUser = tenantConnection.model('User', User.schema);
        const TenantForgetCheck = tenantConnection.model('ForgetCheck', ForgetCheck.schema);
        const TenantDepartment = tenantConnection.model('Department', Department.schema);
        const TenantPosition = tenantConnection.model('Position', Position.schema);

        // Determine the employee ID - use from request body or fall back to authenticated user
        let employeeId = req.body.employee || req.body.user || req.user._id || req.user.id;
        
        if (!employeeId) {
            console.log('❌ No employee ID found');
            return res.status(400).json({ 
                error: 'Employee ID is required',
                details: 'No employee ID provided in request or user context'
            });
        }

        console.log('🔍 Using employee ID:', employeeId);

        // Convert string ID to ObjectId if needed
        let objectId;
        try {
            objectId = new mongoose.Types.ObjectId(employeeId);
        } catch (error) {
            console.log('❌ Invalid ObjectId format:', employeeId);
            return res.status(400).json({ 
                error: 'Invalid employee ID format',
                details: 'Employee ID must be a valid ObjectId'
            });
        }

        // Get employee details from tenant-specific database
        console.log('🔍 Looking up employee in tenant database...');
        console.log('🔍 Search criteria:', { _id: objectId, tenantId: req.tenantId });
        
        // First, let's try to find all users in this tenant to debug
        const allUsersInTenant = await TenantUser.find({ tenantId: req.tenantId }).select('_id username email');
        console.log('🔍 All users in tenant database:', allUsersInTenant);
        
        // Try to find the specific user by ID only (no tenant filter since we're already in tenant DB)
        const userById = await TenantUser.findById(objectId);
        console.log('🔍 User found by ID in tenant DB:', userById ? { _id: userById._id, tenantId: userById.tenantId, username: userById.username } : 'Not found');
        
        const employee = await TenantUser.findOne({ 
            _id: objectId, 
            tenantId: req.tenantId 
        })
            .populate('department')
            .populate('position');

        if (!employee) {
            console.log('❌ Employee not found in tenant database:', employeeId);
            console.log('🔍 Available user fields:', Object.keys(req.user || {}));
            console.log('🔍 User ID variations:', {
                'req.user._id': req.user?._id,
                'req.user.id': req.user?.id,
                'req.user.userId': req.user?.userId,
                'req.body.employee': req.body.employee
            });
            console.log('🔍 Tenant context:', {
                'req.tenantId': req.tenantId,
                'user.tenantId': req.user?.tenantId
            });
            
            return res.status(404).json({ 
                error: 'Employee not found',
                details: `No employee found with ID: ${employeeId} in tenant: ${req.tenantId}`,
                debug: {
                    searchedId: employeeId,
                    tenantId: req.tenantId,
                    userFields: Object.keys(req.user || {}),
                    userTenantId: req.user?.tenantId,
                    databaseName: tenantConnection.name
                }
            });
        }

        console.log('✅ Found employee:', employee.username, employee.email);

        // Prepare the forget check data
        const forgetCheckData = {
            employee: employee._id,
            department: employee.department?._id,
            position: employee.position?._id,
            date: req.body.date,
            requestType: req.body.requestType,
            requestedTime: req.body.requestedTime,
            reason: req.body.reason,
            tenantId: req.tenantId
        };

        console.log('🔍 Creating forget check with data:', JSON.stringify(forgetCheckData, null, 2));

        const forgetCheck = new TenantForgetCheck(forgetCheckData);
        const savedForgetCheck = await forgetCheck.save();

        console.log('✅ Forget check created successfully:', savedForgetCheck._id);

        res.status(201).json(savedForgetCheck);
    } catch (err) {
        console.error('❌ Error creating forget check:', err);
        console.error('❌ Error stack:', err.stack);
        
        // Don't let errors become 404s - return proper error codes
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                message: err.message,
                details: err.errors ? Object.keys(err.errors).map(key => ({
                    field: key,
                    message: err.errors[key].message
                })) : null
            });
        }
        
        if (err.name === 'CastError') {
            return res.status(400).json({
                error: 'Invalid ID format',
                message: err.message
            });
        }
        
        res.status(500).json({
            error: 'Internal server error',
            message: err.message,
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

        res.status(400).json({ error: err.message });
    }
};
