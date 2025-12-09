import express from 'express';
import emailController from '../controllers/emailController.js';
import { tenantContext } from '../../../core/middleware/tenantContext.js';
import { moduleGuard } from '../../../core/middleware/moduleGuard.js';

const router = express.Router();

// Apply tenant context middleware to all routes
router.use(tenantContext);

// Apply module guard to ensure email-service is enabled for tenant
router.use(moduleGuard('email-service'));

/**
 * @route   POST /api/v1/email-service/send
 * @desc    Send email
 * @access  Private (requires authentication and email-service module)
 */
router.post('/send', emailController.sendEmail);

/**
 * @route   GET /api/v1/email-service/templates
 * @desc    Get available email templates
 * @access  Private (requires authentication and email-service module)
 */
router.get('/templates', emailController.getTemplates);

/**
 * @route   GET /api/v1/email-service/logs
 * @desc    Get email logs for tenant
 * @access  Private (requires authentication and email-service module)
 */
router.get('/logs', emailController.getLogs);

/**
 * @route   GET /api/v1/email-service/status
 * @desc    Check if email service is enabled
 * @access  Private (requires authentication and email-service module)
 */
router.get('/status', emailController.getStatus);

export default router;
