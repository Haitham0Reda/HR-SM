import express from 'express';
import featureFlagService from '../../platform/system/services/featureFlag.service.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get feature flags (protected route)
router.get('/', protect, (req, res) => {
    try {
        const featureFlags = featureFlagService.getFeatureFlags();
        res.json(featureFlags);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get license information (protected route)
router.get('/license', protect, (req, res) => {
    try {
        const license = featureFlagService.getLicense();
        res.json(license);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;