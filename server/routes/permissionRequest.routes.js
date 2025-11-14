import express from 'express';
import Permission from '../models/permission.model.js';
import { protect } from '../middleware/index.js';

const router = express.Router();

// Get all permission requests (filtered by role)
router.get('/', protect, async (req, res) => {
    try {
        const { user } = req;
        let query = {};

        // Regular employees see only their own requests
        if (user.role === 'employee') {
            query.employee = user._id;
        }
        // HR and Admin see all requests

        const permissions = await Permission.find(query)
            .populate('employee', 'name email profile')
            .populate('approval.reviewedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(permissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single permission request
router.get('/:id', protect, async (req, res) => {
    try {
        const permission = await Permission.findById(req.params.id)
            .populate('employee', 'name email profile')
            .populate('approval.reviewedBy', 'name email');

        if (!permission) {
            return res.status(404).json({ message: 'Permission request not found' });
        }

        // Check access rights
        if (req.user.role === 'employee' && permission.employee._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(permission);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create permission request
router.post('/', protect, async (req, res) => {
    try {
        const { type, date, startTime, endTime, reason } = req.body;
        const mongoose = await import('mongoose');
        const User = mongoose.default.model('User');
        const Notification = mongoose.default.model('Notification');

        // Map frontend field names to backend schema
        const permissionData = {
            employee: req.body.user || req.user._id, // Use provided user or logged-in user
            permissionType: type,
            date,
            time: {
                scheduled: startTime || '09:00',
                requested: endTime || '17:00',
                duration: 0 // Will be calculated if needed
            },
            reason,
            status: req.body.status || 'pending'
        };

        const permission = await Permission.create(permissionData);
        const populatedPermission = await Permission.findById(permission._id)
            .populate('employee', 'name email profile');

        // Create notifications for HR/Admin
        if (permission.status === 'pending') {
            console.log('Creating permission notifications...');
            const hrAdminUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
            console.log('Found HR/Admin users:', hrAdminUsers.length);

            const employee = await User.findById(permission.employee);
            const employeeName = employee?.name || 'An employee';
            const permissionTypeName = type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            const hrNotifications = hrAdminUsers.map(user => ({
                recipient: user._id,
                type: 'permission',
                title: 'New Permission Request',
                message: `${employeeName} has submitted a ${permissionTypeName} request for ${new Date(date).toLocaleDateString()}.`,
                relatedModel: 'Permission',
                relatedId: permission._id
            }));

            if (hrNotifications.length > 0) {
                console.log('Inserting notifications:', hrNotifications.length);
                await Notification.insertMany(hrNotifications);
                console.log('Permission notifications created successfully');
            } else {
                console.log('No HR/Admin users found to notify');
            }
        }

        res.status(201).json(populatedPermission);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update permission request
router.put('/:id', protect, async (req, res) => {
    try {
        const permission = await Permission.findById(req.params.id);

        if (!permission) {
            return res.status(404).json({ message: 'Permission request not found' });
        }

        // Check access rights
        const isOwner = permission.employee.toString() === req.user._id.toString();
        const isHROrAdmin = ['hr', 'admin'].includes(req.user.role);

        if (!isOwner && !isHROrAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Update fields
        const { type, date, startTime, endTime, reason, status } = req.body;

        if (type) permission.permissionType = type;
        if (date) permission.date = date;
        if (startTime) permission.time.scheduled = startTime;
        if (endTime) permission.time.requested = endTime;
        if (reason) permission.reason = reason;
        if (status && isHROrAdmin) permission.status = status;

        await permission.save();

        const updatedPermission = await Permission.findById(permission._id)
            .populate('employee', 'name email profile')
            .populate('approval.reviewedBy', 'name email');

        res.json(updatedPermission);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete permission request
router.delete('/:id', protect, async (req, res) => {
    try {
        const permission = await Permission.findById(req.params.id);

        if (!permission) {
            return res.status(404).json({ message: 'Permission request not found' });
        }

        // Check access rights
        const isOwner = permission.employee.toString() === req.user._id.toString();
        const isHROrAdmin = ['hr', 'admin'].includes(req.user.role);

        if (!isOwner && !isHROrAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Permission.findByIdAndDelete(req.params.id);
        res.json({ message: 'Permission request deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Approve permission request
router.post('/:id/approve', protect, async (req, res) => {
    try {
        // Only HR and Admin can approve
        if (!['hr', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const permission = await Permission.findById(req.params.id);

        if (!permission) {
            return res.status(404).json({ message: 'Permission request not found' });
        }

        await permission.approve(req.user._id, req.body.comments);

        const updatedPermission = await Permission.findById(permission._id)
            .populate('employee', 'name email profile')
            .populate('approval.reviewedBy', 'name email');

        res.json(updatedPermission);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Reject permission request
router.post('/:id/reject', protect, async (req, res) => {
    try {
        // Only HR and Admin can reject
        if (!['hr', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const permission = await Permission.findById(req.params.id);

        if (!permission) {
            return res.status(404).json({ message: 'Permission request not found' });
        }

        await permission.reject(req.user._id, req.body.reason || 'Request rejected');

        const updatedPermission = await Permission.findById(permission._id)
            .populate('employee', 'name email profile')
            .populate('approval.reviewedBy', 'name email');

        res.json(updatedPermission);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
