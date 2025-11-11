// Leave Controller
import Leave from '../models/leave.model.js';
import { handleVacationBalanceUpdate, createLeaveNotifications } from '../middleware/index.js';
import { sendLeaveRequestNotification, sendLeaveStatusUpdateNotification } from '../utils/leaveEmailService.js';

export const getAllLeaves = async (req, res) => {
    try {
        console.log('=== GET ALL LEAVES ===');
        console.log('Query params:', req.query);

        const query = {};

        // Filter by user/employee if provided
        if (req.query.user) {
            query.employee = req.query.user;
            console.log('Filtering by employee:', req.query.user);
        } else if (req.query.employee) {
            query.employee = req.query.employee;
            console.log('Filtering by employee:', req.query.employee);
        }

        console.log('Final query:', query);

        const leaves = await Leave.find(query)
            .populate('employee', 'name email profile')
            .sort({ createdAt: -1 });

        console.log(`Found ${leaves.length} leave requests`);
        res.json(leaves);
    } catch (err) {
        console.error('Get leaves error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createLeave = async (req, res) => {
    try {
        console.log('=== CREATE LEAVE REQUEST ===');
        console.log('Body:', req.body);
        console.log('File:', req.file);
        console.log('User:', req.user);

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

        console.log('Final data before save:', req.body);

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
