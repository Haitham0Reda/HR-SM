import emailService from '../services/emailService.js';

/**
 * Email Controller
 * Handles email-related API requests
 */
class EmailController {
  /**
   * Send email
   * POST /api/v1/email-service/send
   */
  async sendEmail(req, res, next) {
    try {
      const tenantId = req.tenant?.id;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TENANT_ID',
            message: 'Tenant ID is required'
          }
        });
      }

      const { to, subject, template, variables, html, text, from, provider } = req.body;

      // Validate required fields
      if (!to || !subject) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Email recipient (to) and subject are required'
          }
        });
      }

      if (!template && !html) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Either template or html content is required'
          }
        });
      }

      // Send email
      const result = await emailService.sendEmail(tenantId, {
        to,
        subject,
        template,
        variables,
        html,
        text,
        from,
        provider
      });

      if (result.success) {
        return res.status(200).json({
          success: true,
          data: {
            messageId: result.messageId,
            provider: result.provider
          },
          meta: {
            timestamp: new Date().toISOString()
          }
        });
      } else {
        return res.status(500).json({
          success: false,
          error: {
            code: 'EMAIL_SEND_FAILED',
            message: result.error
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available email templates
   * GET /api/v1/email-service/templates
   */
  async getTemplates(req, res, next) {
    try {
      const templates = emailService.getTemplates();

      return res.status(200).json({
        success: true,
        data: {
          templates
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get email logs for tenant
   * GET /api/v1/email-service/logs
   */
  async getLogs(req, res, next) {
    try {
      const tenantId = req.tenant?.id;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TENANT_ID',
            message: 'Tenant ID is required'
          }
        });
      }

      const { limit, skip, status } = req.query;

      const logs = await emailService.getLogs(tenantId, {
        limit: parseInt(limit) || 50,
        skip: parseInt(skip) || 0,
        status
      });

      return res.status(200).json({
        success: true,
        data: {
          logs,
          count: logs.length
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if email service is enabled
   * GET /api/v1/email-service/status
   */
  async getStatus(req, res, next) {
    try {
      const tenantId = req.tenant?.id;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TENANT_ID',
            message: 'Tenant ID is required'
          }
        });
      }

      const enabled = await emailService.isEnabled(tenantId);

      return res.status(200).json({
        success: true,
        data: {
          enabled,
          providers: Array.from(emailService.providers.keys()),
          defaultProvider: emailService.defaultProvider
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new EmailController();
