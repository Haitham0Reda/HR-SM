/**
 * Pricing Routes
 * 
 * API endpoints for pricing calculations and quote generation
 */

import express from 'express';
import {
    generateQuote,
    getModulePricing,
    calculatePricing
} from '../controller/pricing.controller.js';

const router = express.Router();

/**
 * POST /api/v1/pricing/quote
 * Generate a pricing quote for selected modules
 * 
 * Public endpoint - no authentication required for quote generation
 */
router.post('/quote', generateQuote);

/**
 * GET /api/v1/pricing/modules
 * Get all available modules with pricing information
 * 
 * Public endpoint - pricing information is publicly available
 */
router.get('/modules', getModulePricing);

/**
 * GET /api/v1/pricing/calculate
 * Calculate pricing without generating a quote (for UI preview)
 * 
 * Public endpoint - allows users to preview pricing
 */
router.get('/calculate', calculatePricing);

export default router;
