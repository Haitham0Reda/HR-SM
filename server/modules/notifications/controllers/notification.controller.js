// Notification Controller
import NotificationService from '../services/NotificationService.js';

const notificationService = new NotificationService();

export const getAllNotifications = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        // Optional: filter by isRead status if provided
        const options = {};
        if (req.query.isRead !== undefined) {
            options.filter = { isRead: req.query.isRead === 'true' };
        }

        const notifications = await notificationService.getAllNotifications(req.user._id, tenantId, options);

        res.json({
            success: true,
            data: notifications
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

export const createNotification = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const notification = await notificationService.createNotification(req.body, tenantId);

        res.status(201).json({
            success: true,
            data: notification
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};

export const getNotificationById = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const notification = await notificationService.getNotificationById(req.params.id, tenantId);

        res.json({
            success: true,
            data: notification
        });
    } catch (err) {
        const statusCode = err.message === 'Notification not found' ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            error: err.message
        });
    }
};

export const updateNotification = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const notification = await notificationService.updateNotification(req.params.id, req.body, tenantId);

        res.json({
            success: true,
            data: notification
        });
    } catch (err) {
        const statusCode = err.message === 'Notification not found' ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            error: err.message
        });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const result = await notificationService.deleteNotification(req.params.id, tenantId);

        res.json({
            success: true,
            message: result.message
        });
    } catch (err) {
        const statusCode = err.message === 'Notification not found' ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            error: err.message
        });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const notification = await notificationService.markAsRead(req.params.id, tenantId);

        res.json({
            success: true,
            data: notification
        });
    } catch (err) {
        const statusCode = err.message === 'Notification not found' ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            error: err.message
        });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.tenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID is required' });
        }

        const result = await notificationService.markAllAsRead(req.user._id, tenantId);

        res.json({
            success: true,
            message: 'All notifications marked as read',
            data: result
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};
