import express from 'express';
import {
    getAllAnnouncements,
    createAnnouncement,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement
} from '../controller/announcement.controller.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllAnnouncements);
router.post('/', createAnnouncement);
router.get('/:id', getAnnouncementById);
router.put('/:id', protect, admin, updateAnnouncement);
router.delete('/:id', protect, admin, deleteAnnouncement);

export default router;
