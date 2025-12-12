/**
 * Email Service Module Configuration
 * 
 * This module provides email functionality to other modules.
 * It supports multiple email providers (SMTP, SendGrid, AWS SES).
 */

export default {
  // Module identification
  name: 'email-service',
  displayName: 'Email Service',
  version: '1.0.0',
  description: 'Provides email functionality with support for multiple providers (SMTP, SendGrid, AWS SES) and template rendering',
  author: 'System',
  category: 'communication',
  
  // Module dependencies
  // Email service has no dependencies - it's a standalone service
  dependencies: [],
  
  // Optional dependencies
  // Email service doesn't require any optional dependencies
  optionalDependencies: [],
  
  // Modules that can use this module
  // Email service provides functionality to these modules
  providesTo: ['hr-core', 'tasks', 'payroll', 'notifications', 'clinic'],
  
  // Pricing information
  pricing: {
    tier: 'premium',
    monthlyPrice: 29.99,
    yearlyPrice: 299.99,
    currency: 'USD',
    description: 'Includes unlimited emails, all providers, and custom templates'
  },
  
  // Feature flags
  features: {
    smtp: true,
    sendgrid: true,
    ses: true,
    templates: true,
    customTemplates: true,
    emailLogs: true,
    attachments: true
  },
  
  // API routes configuration
  routes: {
    base: '/api/v1/email-service',
    endpoints: [
      {
        path: '/send',
        method: 'POST',
        auth: true,
        description: 'Send email using configured provider'
      },
      {
        path: '/templates',
        method: 'GET',
        auth: true,
        description: 'Get available email templates'
      },
      {
        path: '/logs',
        method: 'GET',
        auth: true,
        roles: ['Admin', 'HR'],
        description: 'Get email logs for tenant'
      },
      {
        path: '/status',
        method: 'GET',
        auth: true,
        description: 'Check if email service is enabled'
      }
    ]
  },
  
  // Database models
  models: ['EmailLog'],
  
  // Configuration schema
  configSchema: {
    provider: {
      type: 'string',
      enum: ['smtp', 'sendgrid', 'ses'],
      default: 'smtp',
      description: 'Default email provider'
    },
    smtp: {
      type: 'object',
      properties: {
        host: { type: 'string', required: true },
        port: { type: 'number', default: 587 },
        secure: { type: 'boolean', default: false },
        auth: {
          type: 'object',
          properties: {
            user: { type: 'string', required: true },
            pass: { type: 'string', required: true }
          }
        },
        defaultFrom: { type: 'string' }
      }
    },
    sendgrid: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', required: true },
        defaultFrom: { type: 'string' }
      }
    },
    ses: {
      type: 'object',
      properties: {
        region: { type: 'string', required: true },
        accessKeyId: { type: 'string', required: true },
        secretAccessKey: { type: 'string', required: true },
        defaultFrom: { type: 'string' }
      }
    }
  },
  
  /**
   * Initialize email service module
   * @param {Object} app - Express app instance
   * @param {string} tenantId - Tenant identifier
   * @param {Object} config - Module configuration
   */
  async initialize(app, tenantId, config) {
    const emailService = (await import('./services/emailService.js')).default;
    
    // Initialize email service with configuration
    await emailService.initialize(config);
    
    console.log(`[Email Service] Initialized for tenant: ${tenantId}`);
    
    return {
      success: true,
      message: 'Email service initialized successfully'
    };
  },
  
  /**
   * Cleanup email service module
   * @param {string} tenantId - Tenant identifier
   */
  async cleanup(tenantId) {
    console.log(`[Email Service] Cleanup for tenant: ${tenantId}`);
    
    // No specific cleanup needed for email service
    // Email logs are preserved in the database
    
    return {
      success: true,
      message: 'Email service cleanup completed'
    };
  },
  
  /**
   * Health check for email service
   * @param {string} tenantId - Tenant identifier
   */
  async healthCheck(tenantId) {
    const emailService = (await import('./services/emailService.js')).default;
    
    const enabled = await emailService.isEnabled(tenantId);
    const providers = Array.from(emailService.providers.keys());
    
    return {
      healthy: enabled && providers.length > 0,
      details: {
        enabled,
        providers,
        defaultProvider: emailService.defaultProvider
      }
    };
  }
};
