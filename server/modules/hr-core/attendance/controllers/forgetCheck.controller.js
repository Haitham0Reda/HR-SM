import { Op } from 'sequelize';
import ForgetCheck from '../models/forgetCheck.model.js';
import User from '../../users/models/user.model.js';
import Department from '../../users/models/department.model.js';
import Position from '../../users/models/position.model.js';

export const getAllForgetChecks = async (req, res) => {
    try {
        const where = { tenantId: req.tenantId };
        const { user } = req;

        // Filter by user/employee if provided
        if (req.query.user) {
            where.employeeId = req.query.user;
        } else if (req.query.employee) {
            where.employeeId = req.query.employee;
        }

        // Role-based filtering - check user role
        const isHR = user.role === 'hr' || user.role === 'admin';
        if (!isHR) {
            // Regular users see only their own requests
            where.employeeId = user.id;
        }

        const forgetChecks = await ForgetCheck.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'employee',
                    attributes: ['username', 'email', 'personalInfo']
                },
                {
                    model: User,
                    as: 'approvedBy',
                    attributes: ['username', 'personalInfo']
                },
                {
                    model: User,
                    as: 'rejectedBy',
                    attributes: ['username', 'personalInfo']
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['name']
                },
                {
                    model: Position,
                    as: 'position',
                    attributes: ['title']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

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

        // Determine the employee ID - use from request body or fall back to authenticated user
        let employeeId = req.body.employee || req.body.user || req.user.id;
        
        if (!employeeId) {
            console.log('❌ No employee ID found');
            return res.status(400).json({ 
                error: 'Employee ID is required',
                details: 'No employee ID provided in request or user context'
            });
        }

        console.log('🔍 Using employee ID:', employeeId);

        // Get employee details
        console.log('🔍 Looking up employee in database...');
        console.log('🔍 Search criteria:', { id: employeeId, tenantId: req.tenantId });
        
        const employee = await User.findOne({ 
            where: {
                id: employeeId, 
                tenantId: req.tenantId 
            },
            include: [
                { model: Department, as: 'department' },
                { model: Position, as: 'position' }
            ]
        });

        if (!employee) {
            console.log('❌ Employee not found in database:', employeeId);
            console.log('🔍 Available user fields:', Object.keys(req.user || {}));
            console.log('🔍 User ID variations:', {
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
                    userTenantId: req.user?.tenantId
                }
            });
        }

        console.log('✅ Found employee:', employee.username, employee.email);

        // Prepare the forget check data
        const forgetCheckData = {
            employeeId: employee.id,
            departmentId: employee.department?.id,
            positionId: employee.position?.id,
            date: req.body.date,
            requestType: req.body.requestType,
            requestedTime: req.body.requestedTime,
            reason: req.body.reason,
            tenantId: req.tenantId
        };

        console.log('🔍 Creating forget check with data:', JSON.stringify(forgetCheckData, null, 2));

        const savedForgetCheck = await ForgetCheck.create(forgetCheckData);

        console.log('✅ Forget check created successfully:', savedForgetCheck.id);

        res.status(201).json(savedForgetCheck);
    } catch (err) {
        console.error('❌ Error creating forget check:', err);
        console.error('❌ Error stack:', err.stack);
        
        // Don't let errors become 404s - return proper error codes
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                message: err.message,
                details: err.errors ? err.errors.map(e => ({
                    field: e.path,
                    message: e.message
                })) : null
            });
        }
        
        if (err.name === 'SequelizeDatabaseError') {
            return res.status(400).json({
                error: 'Database error',
                message: err.message
            });
        }
        
        res.status(500).json({
            error: 'Internal server error',
            message: err.message
        });
    }
};

export const getForgetCheckById = async (req, res) => {
    try {
        const forgetCheck = await ForgetCheck.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'employee',
                    attributes: ['username', 'email', 'personalInfo']
                },
                {
                    model: User,
                    as: 'approvedBy',
                    attributes: ['username', 'personalInfo']
                },
                {
                    model: User,
                    as: 'rejectedBy',
                    attributes: ['username', 'personalInfo']
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['name']
                },
                {
                    model: Position,
                    as: 'position',
                    attributes: ['title']
                }
            ]
        });

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
        const [updated] = await ForgetCheck.update(req.body, {
            where: { id: req.params.id },
            returning: true
        });

        if (!updated) {
            return res.status(404).json({ error: 'Forget check request not found' });
        }

        const forgetCheck = await ForgetCheck.findByPk(req.params.id);
        res.json(forgetCheck);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteForgetCheck = async (req, res) => {
    try {
        const deleted = await ForgetCheck.destroy({
            where: { id: req.params.id }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Forget check request not found' });
        }

        res.json({ message: 'Forget check request deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const approveForgetCheck = async (req, res) => {
    try {
        const forgetCheck = await ForgetCheck.findByPk(req.params.id);

        if (!forgetCheck) {
            return res.status(404).json({ error: 'Forget check request not found' });
        }

        // Check if user has permission to approve
        const canApprove = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canApprove) {
            return res.status(403).json({ error: 'You do not have permission to approve forget check requests' });
        }

        await forgetCheck.approve(req.user.id);

        res.json(forgetCheck);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const rejectForgetCheck = async (req, res) => {
    try {
        const forgetCheck = await ForgetCheck.findByPk(req.params.id);

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

        await forgetCheck.reject(req.user.id, reason.trim());

        res.json(forgetCheck);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
