import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
    getTheme,
    updateTheme,
    resetTheme,
    getThemePresets,
} from '../controller/theme.controller.js';

const router = express.Router();

// Get active theme configuration (all authenticated users)
router.get('/', protect, getTheme);

// Update theme configuration (admin only)
router.put('/', protect, admin, updateTheme);

// Reset theme to defaults (admin only)
router.post('/reset', protect, admin, resetTheme);

// Get theme presets (all authenticated users)
router.get('/presets', protect, getThemePresets);

export default router;
