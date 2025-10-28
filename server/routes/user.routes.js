import express from 'express';
import {
    getAllUsers,
    createUser,
    getUserById,
    updateUser,
    deleteUser
} from '../controller/user.controller.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getAllUsers);
router.post('/', protect, admin, createUser);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, admin, updateUser);
router.delete('/:id', protect, admin, deleteUser);

export default router;
