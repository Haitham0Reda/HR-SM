import express from 'express';
import {
    getAllNotifications,
    createNotification,
    getNotificationById,
    updateNotification,
    deleteNotification
} from '../controller/notification.controller.js';

const router = express.Router();

router.get('/', getAllNotifications);
router.post('/', createNotification);
router.get('/:id', getNotificationById);
router.put('/:id', updateNotification);
router.delete('/:id', deleteNotification);

export default router;
