// Leave Controller
import Leave from '../models/leave.model.js';
import { handleVacationBalanceUpdate, createLeaveNotifications } from '../middleware/index.js';
import { sendLeaveRequestNotification, sendLeaveStatusUpdateNotification } from '../utils/leaveEmailService.js';

export const getAllLeaves = async (req, res) => {
    try {
        const query = {};

        // Filter by user/employee if provided
        if (req.query.user) {
            query.employee = req.query.user;
        } else if (req.query.employee) {
            query.employee = req.query.employee;
        }

        const leaves = await Leave.find(query)
            .populate('employee', 'name email profile')
            .sort({ createdAt: -1 });

        res.json(leaves);
    } catch (err) {
        console.error('Get leaves error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createLeave = async (req, res) => {
    try {
        console.log('=== CREATE LEAVE REQUEST ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Leave type:', req.body.leaveType);
        console.log('Mission data:', req.body.mission);

        // Handle file upload for sick leave
        if (req.file && req.body.leaveType === 'sick') {
            if (!req.body.medicalDocumentation) {
                req.body.medicalDocumentation = {};
            }
            req.body.medicalDocumentation.required = true;
            req.body.medicalDocumentation.provided = true;
            req.body.medicalDocumentation.documents = [{
                filename: req.file.originalname,
                url: req.file.path,
                uploadedAt: new Date(),
                uploadedBy: req.user?._id || req.body.employee
            }];
        }



        const leave = new Leave(req.body);
        const savedLeave = await leave.save();

        console.log('Leave saved successfully:', savedLeave._id);

        // Handle post-save operations
        await handleVacationBalanceUpdate(savedLeave);
        await createLeaveNotifications(savedLeave);

        // Send email notification to manager
        await sendLeaveRequestNotification(savedLeave);

        res.status(201).json(savedLeave);
    } catch (err) {
        console.error('Create leave error:', err);
        console.error('Error stack:', err.stack);
        res.status(400).json({
            error: err.message,
            details: err.errors ? Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            })) : null
        });
    }
};

export const getLeaveById = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });
        res.json(leave);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateLeave = async (req, res) => {
    try {
        const oldLeave = await Leave.findById(req.params.id);
        if (!oldLeave) return res.status(404).json({ error: 'Leave not found' });

        const previousStatus = oldLeave.status;
        const leave = await Leave.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // Handle post-update operations if status changed
        if (previousStatus !== leave.status) {
            await handleVacationBalanceUpdate(leave);
            await createLeaveNotifications(leave);

            // Send status update email to employee
            if (['approved', 'rejected', 'cancelled'].includes(leave.status)) {
                await sendLeaveStatusUpdateNotification(leave, previousStatus);
            }
        }

        res.json(leave);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteLeave = async (req, res) => {
    try {
        const leave = await Leave.findByIdAndDelete(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });
        res.json({ message: 'Leave deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Approve leave by supervisor
export const approveLeave = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });

        // IMPORTANT: Sick leave can ONLY be approved by doctors
        if (leave.leaveType === 'sick') {
            return res.status(403).json({
                error: 'Sick leave requests can only be approved by doctors. Please use the doctor approval endpoint.'
            });
        }

        const { notes } = req.body;
        const userId = req.user._id;

        // Check if user has permission to approve (HR, admin, manager, supervisor)
        const canApprove = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canApprove) {
            return res.status(403).json({ error: 'You do not have permission to approve leaves' });
        }

        // Use supervisor approval method
        await leave.approveBySupervisor(userId, notes);

        // Send notification
        await sendLeaveStatusUpdateNotification(leave, 'pending');

        res.json(leave);
    } catch (err) {
        console.error('Approve leave error:', err);
        res.status(400).json({ error: err.message });
    }
};

// Reject leave by supervisor
export const rejectLeave = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id).populate('employee', 'profile email');
        if (!leave) return res.status(404).json({ error: 'Leave not found' });

        console.log('=== REJECT LEAVE ===');
        console.log('Leave ID:', req.params.id);
        console.log('Leave type:', leave.leaveType);
        console.log('User role:', req.user.role);
        console.log('Request body:', req.body);

        // IMPORTANT: Sick leave can ONLY be rejected by doctors
        if (leave.leaveType === 'sick') {
            return res.status(403).json({
                error: 'Sick leave requests can only be rejected by doctors. Please use the doctor rejection endpoint.'
            });
        }

        const { reason } = req.body;
        const userId = req.user._id;

        // Check if user has permission to reject (HR, admin, manager, supervisor)
        const canReject = ['hr', 'admin', 'manager', 'supervisor', 'head-of-department', 'dean'].includes(req.user.role);
        if (!canReject) {
            return res.status(403).json({ error: 'You do not have permission to reject leaves' });
        }

        // Validate reason
        if (!reason || typeof reason !== 'string') {
            console.error('Rejection reason validation failed: not a string or missing');
            return res.status(400).json({ error: 'Rejection reason is required and must be a string' });
        }

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            console.error('Rejection reason validation failed: empty after trim');
            return res.status(400).json({ error: 'Rejection reason is required and cannot be empty' });
        }

        if (trimmedReason.length < 10) {
            console.error('Rejection reason validation failed: too short', trimmedReason.length);
            return res.status(400).json({ error: 'Rejection reason must be at least 10 characters long' });
        }

        console.log('Calling rejectBySupervisor with reason:', trimmedReason);

        // Use supervisor rejection method
        await leave.rejectBySupervisor(userId, trimmedReason);

        console.log('Leave rejected successfully');

        // Send notification
        await sendLeaveStatusUpdateNotification(leave, 'pending');

        res.json(leave);
    } catch (err) {
        console.error('Reject leave error:', err);
        console.error('Error stack:', err.stack);
        res.status(400).json({ error: err.message });
    }
};

// Approve sick leave by doctor
export const approveSickLeaveByDoctor = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });

        // Check if user is a doctor
        if (req.user.role !== 'doctor') {
            return res.status(403).json({ error: 'Only doctors can approve sick leave' });
        }

        // Check if it's a sick leave
        if (leave.leaveType !== 'sick') {
            return res.status(400).json({ error: 'This endpoint is only for sick leave approval' });
        }

        const { notes } = req.body;
        const doctorId = req.user._id;

        // Use doctor approval method
        await leave.approveByDoctor(doctorId, notes);

        // Send notification
        await sendLeaveStatusUpdateNotification(leave, 'pending');

        res.json(leave);
    } catch (err) {
        console.error('Doctor approve sick leave error:', err);
        res.status(400).json({ error: err.message });
    }
};

// Reject sick leave by doctor
export const rejectSickLeaveByDoctor = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave not found' });

        // Check if user is a doctor
        if (req.user.role !== 'doctor') {
            return res.status(403).json({ error: 'Only doctors can reject sick leave' });
        }

        // Check if it's a sick leave
        if (leave.leaveType !== 'sick') {
            return res.status(400).json({ error: 'This endpoint is only for sick leave rejection' });
        }

        const { reason } = req.body;
        const doctorId = req.user._id;

        // Validate reason
        if (!reason || typeof reason !== 'string') {
            return res.status(400).json({ error: 'Rejection reason is required and must be a string' });
        }

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            return res.status(400).json({ error: 'Rejection reason is required and cannot be empty' });
        }

        if (trimmedReason.length < 10) {
            return res.status(400).json({ error: 'Rejection reason must be at least 10 characters long' });
        }

        // Use doctor rejection method
        await leave.rejectByDoctor(doctorId, trimmedReason);

        // Send notification
        await sendLeaveStatusUpdateNotification(leave, 'pending');

        res.json(leave);
    } catch (err) {
        console.error('Doctor reject sick leave error:', err);
        res.status(400).json({ error: err.message });
    }
};

// Get leaves pending doctor review (for doctors)
export const getPendingDoctorReview = async (req, res) => {
    try {
        // Check if user is a doctor
        if (req.user.role !== 'doctor') {
            return res.status(403).json({ error: 'Only doctors can access this endpoint' });
        }

        const leaves = await Leave.getPendingDoctorReview();
        res.json(leaves);
    } catch (err) {
        console.error('Get pending doctor review error:', err);
        res.status(500).json({ error: err.message });
    }
};
