// Announcement Controller
import AnnouncementService from '../services/AnnouncementService.js';
import { createAnnouncementNotifications } from '../../../middleware/index.js';

const announcementService = new AnnouncementService();

export const getAllAnnouncements = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        let announcements;

        // If user is not HR or Admin, filter announcements based on their role
        if (req.user.role !== 'hr' && req.user.role !== 'admin') {
            announcements = await announcementService.getAnnouncementsForUser(
                req.user.id,
                req.user.role,
                req.user.department,
                tenantId
            );
        } else {
            announcements = await announcementService.getAllAnnouncements(tenantId);
        }

        res.json({
            success: true,
            data: announcements
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

export const getActiveAnnouncements = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        let announcements;

        // If user is not HR or Admin, filter announcements based on their role
        if (req.user.role !== 'hr' && req.user.role !== 'admin') {
            announcements = await announcementService.getAnnouncementsForUser(
                req.user.id,
                req.user.role,
                req.user.department,
                tenantId
            );
        } else {
            announcements = await announcementService.getActiveAnnouncements(tenantId);
        }

        res.json({
            success: true,
            data: announcements
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

export const createAnnouncement = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const announcementData = {
            ...req.body,
            createdBy: req.user.id
        };

        const announcement = await announcementService.createAnnouncement(announcementData, tenantId);

        // Create notifications for targeted audience
        await createAnnouncementNotifications(announcement);

        res.status(201).json({
            success: true,
            data: announcement
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};

export const getAnnouncementById = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const announcement = await announcementService.getAnnouncementById(req.params.id, tenantId);

        res.json({
            success: true,
            data: announcement
        });
    } catch (err) {
        const statusCode = err.message === 'Announcement not found' ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            error: err.message
        });
    }
};

export const updateAnnouncement = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const announcement = await announcementService.updateAnnouncement(req.params.id, req.body, tenantId);

        res.json({
            success: true,
            data: announcement
        });
    } catch (err) {
        const statusCode = err.message === 'Announcement not found' ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            error: err.message
        });
    }
};

export const deleteAnnouncement = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const result = await announcementService.deleteAnnouncement(req.params.id, tenantId);

        res.json({
            success: true,
            message: result.message
        });
    } catch (err) {
        const statusCode = err.message === 'Announcement not found' ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            error: err.message
        });
    }
};

export const getAnnouncementsByStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const { status } = req.params; // upcoming, active, expired

        const announcements = await announcementService.getAnnouncementsByStatus(status, tenantId);

        res.json({
            success: true,
            data: announcements
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};