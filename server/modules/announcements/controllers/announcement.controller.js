// Announcement Controller
import Announcement from '../models/announcement.model.js';
import { createAnnouncementNotifications } from '../../../middleware/index.js';

export const getAllAnnouncements = async (req, res) => {
    try {
        // Get tenant ID from user or request
        const tenantId = req.user?.tenantId || req.tenantId;
        
        // Base query - filter by tenant through createdBy user's tenant
        let query = {};
        
        // If we have tenant ID, filter announcements by users from the same tenant
        if (tenantId) {
            // Import User model to get users from same tenant
            const { default: User } = await import('../../hr-core/users/models/user.model.js');
            const tenantUsers = await User.find({ tenantId }).select('_id');
            const tenantUserIds = tenantUsers.map(u => u._id);
            
            query.createdBy = { $in: tenantUserIds };
        }

        // If user is not HR or Admin, filter announcements based on their role
        if (req.user.role !== 'hr' && req.user.role !== 'admin') {
            const roleFilter = {
                $or: [
                    { targetAudience: 'all' },
                    { targetAudience: 'employees' },
                    { targetAudience: req.user.role }
                ]
            };
            
            // Combine tenant filter with role filter
            if (query.createdBy) {
                query = { $and: [{ createdBy: query.createdBy }, roleFilter] };
            } else {
                query = roleFilter;
            }
        }

        const announcements = await Announcement.find(query)
            .populate('createdBy', 'username email')
            .populate('departments', 'name code')
            .sort({ publishDate: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getActiveAnnouncements = async (req, res) => {
    try {
        const now = new Date();
        
        // Get tenant ID from user or request
        const tenantId = req.user?.tenantId || req.tenantId;
        
        let query = {
            isActive: true,
            $or: [
                // No date restrictions
                { startDate: null, endDate: null },
                // Only start date - must have started
                { startDate: { $lte: now }, endDate: null },
                // Only end date - must not have expired
                { startDate: null, endDate: { $gte: now } },
                // Both dates - must be within range
                { startDate: { $lte: now }, endDate: { $gte: now } }
            ]
        };

        // Filter by tenant through createdBy user's tenant
        if (tenantId) {
            const { default: User } = await import('../../hr-core/users/models/user.model.js');
            const tenantUsers = await User.find({ tenantId }).select('_id');
            const tenantUserIds = tenantUsers.map(u => u._id);
            
            query.createdBy = { $in: tenantUserIds };
        }

        // If user is not HR or Admin, filter announcements based on their role
        if (req.user.role !== 'hr' && req.user.role !== 'admin') {
            const roleFilter = {
                $or: [
                    { targetAudience: 'all' },
                    { targetAudience: 'employees' },
                    { targetAudience: req.user.role }
                ]
            };
            
            // Combine existing query with role filter
            query = { $and: [query, roleFilter] };
        }

        const announcements = await Announcement.find(query)
            .populate('createdBy', 'username email')
            .populate('departments', 'name code')
            .sort({ publishDate: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createAnnouncement = async (req, res) => {
    try {
        const announcement = new Announcement(req.body);
        const savedAnnouncement = await announcement.save();

        // Create notifications for targeted audience
        await createAnnouncementNotifications(savedAnnouncement);

        res.status(201).json(savedAnnouncement);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getAnnouncementById = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id)
            .populate('createdBy', 'username email')
            .populate('departments', 'name code')
            .populate('employees', 'username email');
        if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
        res.json(announcement);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
        res.json(announcement);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndDelete(req.params.id);
        if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getAnnouncementsByStatus = async (req, res) => {
    try {
        const { status } = req.params; // upcoming, active, expired
        const now = new Date();
        let query = {};

        switch (status) {
            case 'upcoming':
                query = {
                    isActive: true,
                    startDate: { $gt: now }
                };
                break;
            case 'active':
                query = {
                    isActive: true,
                    $or: [
                        { startDate: null, endDate: null },
                        { startDate: { $lte: now }, endDate: null },
                        { startDate: null, endDate: { $gte: now } },
                        { startDate: { $lte: now }, endDate: { $gte: now } }
                    ]
                };
                break;
            case 'expired':
                query = {
                    $or: [
                        { isActive: false },
                        { endDate: { $lt: now } }
                    ]
                };
                break;
            default:
                return res.status(400).json({ error: 'Invalid status. Use: upcoming, active, or expired' });
        }

        const announcements = await Announcement.find(query)
            .populate('createdBy', 'username email')
            .populate('departments', 'name code')
            .sort({ publishDate: -1 });

        res.json(announcements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};