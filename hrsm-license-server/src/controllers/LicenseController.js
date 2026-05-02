import License from '../models/License.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * License Controller - License Server (PostgreSQL/Sequelize)
 * Handles all license management operations
 */
class LicenseController {
  
  /**
   * Create a new license
   */
  async createLicense(req, res) {
    try {
      const {
        companyId,
        companyName,
        companyDomain,
        licenseType,
        limits,
        modules,
        expiresAt,
        metadata
      } = req.body;

      // Generate unique license ID
      const licenseId = `lic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create license
      const license = await License.create({
        licenseId,
        companyId,
        companyName,
        companyDomain,
        licenseType,
        limits,
        modules,
        expiresAt: new Date(expiresAt),
        metadata,
        createdBy: req.user?.userId || 'system'
      });

      logger.info('License created successfully', {
        licenseId: license.licenseId,
        licenseNumber: license.licenseNumber,
        companyId,
        licenseType
      });

      res.status(201).json({
        success: true,
        message: 'License created successfully',
        license: {
          licenseId: license.licenseId,
          licenseNumber: license.licenseNumber,
          companyId: license.companyId,
          licenseType: license.licenseType,
          status: license.status,
          expiresAt: license.expiresAt,
          limits: license.limits,
          modules: license.modules,
          encryptedPayload: license.generateEncryptedPayload()
        }
      });

    } catch (error) {
      logger.error('Failed to create license', {
        error: error.message,
        companyId: req.body.companyId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create license',
        error: error.message
      });
    }
  }

  /**
   * Get license by company ID
   */
  async getLicenseByCompany(req, res) {
    try {
      const { companyId } = req.params;

      const license = await License.findByCompany(companyId);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found for company'
        });
      }

      res.json({
        success: true,
        license: {
          licenseId: license.licenseId,
          licenseNumber: license.licenseNumber,
          companyId: license.companyId,
          companyName: license.companyName,
          licenseType: license.licenseType,
          status: license.status,
          expiresAt: license.expiresAt,
          limits: license.limits,
          modules: license.modules,
          encryptionKey: license.encryptionKey,
          signature: license.signature,
          currentUsage: license.currentUsage,
          lastValidated: license.lastValidated
        }
      });

    } catch (error) {
      logger.error('Failed to get license by company', {
        error: error.message,
        companyId: req.params.companyId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve license',
        error: error.message
      });
    }
  }

  /**
   * Validate license
   */
  async validateLicense(req, res) {
    try {
      const { licenseId } = req.params;
      const { usage, timestamp } = req.body;

      const license = await License.findOne({ where: { licenseId } });

      if (!license) {
        return res.status(404).json({
          success: false,
          valid: false,
          message: 'License not found'
        });
      }

      // Perform validation
      const validationResult = {
        valid: license.isValid(),
        expired: license.isExpired(),
        signatureValid: license.verifySignature(),
        limitsChecked: false,
        limitViolations: []
      };

      // Check limits if usage data provided
      if (usage) {
        await license.updateUsage(usage);
        const limitCheck = license.checkLimits();
        validationResult.limitsChecked = true;
        validationResult.limitViolations = limitCheck.violations;
        
        if (!limitCheck.withinLimits) {
          validationResult.valid = false;
        }
      }

      res.json({
        success: true,
        valid: validationResult.valid,
        license: {
          licenseId: license.licenseId,
          licenseNumber: license.licenseNumber,
          status: license.status,
          expiresAt: license.expiresAt,
          daysUntilExpiry: license.daysUntilExpiry()
        },
        validation: validationResult,
        currentUsage: license.currentUsage
      });

    } catch (error) {
      logger.error('License validation failed', {
        error: error.message,
        licenseId: req.params.licenseId
      });

      res.status(500).json({
        success: false,
        valid: false,
        message: 'License validation failed',
        error: error.message
      });
    }
  }

  /**
   * Update license usage
   */
  async updateUsage(req, res) {
    try {
      const { licenseId } = req.params;
      const { usage } = req.body;

      const license = await License.findOne({ where: { licenseId } });

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found'
        });
      }

      const previousUsage = { ...license.currentUsage };
      
      // Update usage
      await license.updateUsage(usage);
      
      // Check limits
      const limitCheck = license.checkLimits();

      res.json({
        success: true,
        message: 'Usage updated successfully',
        currentUsage: license.currentUsage,
        limitCheck
      });

    } catch (error) {
      logger.error('Failed to update usage', {
        error: error.message,
        licenseId: req.params.licenseId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update usage',
        error: error.message
      });
    }
  }

  /**
   * Update license status
   */
  async updateLicenseStatus(req, res) {
    try {
      const { licenseId } = req.params;
      const { status, reason } = req.body;

      const license = await License.findOne({ where: { licenseId } });

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found'
        });
      }

      const previousStatus = license.status;
      license.status = status;
      license.updatedBy = req.user?.userId || 'system';

      await license.save();

      logger.info('License status updated', {
        licenseId: license.licenseId,
        previousStatus,
        newStatus: status,
        reason
      });

      res.json({
        success: true,
        message: 'License status updated successfully',
        license: {
          licenseId: license.licenseId,
          status: license.status,
          updatedAt: license.updatedAt
        }
      });

    } catch (error) {
      logger.error('Failed to update license status', {
        error: error.message,
        licenseId: req.params.licenseId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update license status',
        error: error.message
      });
    }
  }

  /**
   * Get license audit trail
   */
  async getLicenseAudit(req, res) {
    try {
      const { licenseId } = req.params;
      const { limit = 100, page = 1 } = req.query;

      // TODO: Implement LicenseAudit model for PostgreSQL
      res.json({
        success: true,
        message: 'Audit trail feature coming soon',
        audits: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      });

    } catch (error) {
      logger.error('Failed to get license audit', {
        error: error.message,
        licenseId: req.params.licenseId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit trail',
        error: error.message
      });
    }
  }

  /**
   * Get expiring licenses
   */
  async getExpiringLicenses(req, res) {
    try {
      const { days = 30 } = req.query;

      const expiringLicenses = await License.findExpiring(parseInt(days));

      res.json({
        success: true,
        count: expiringLicenses.length,
        licenses: expiringLicenses.map(license => ({
          licenseId: license.licenseId,
          licenseNumber: license.licenseNumber,
          companyId: license.companyId,
          companyName: license.companyName,
          licenseType: license.licenseType,
          expiresAt: license.expiresAt,
          daysUntilExpiry: license.daysUntilExpiry()
        }))
      });

    } catch (error) {
      logger.error('Failed to get expiring licenses', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve expiring licenses',
        error: error.message
      });
    }
  }

  /**
   * Renew license
   */
  async renewLicense(req, res) {
    try {
      const { licenseId } = req.params;
      const { newExpiryDate, newLimits, newModules } = req.body;

      const license = await License.findOne({ where: { licenseId } });

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found'
        });
      }

      const previousState = {
        expiresAt: license.expiresAt,
        limits: license.limits,
        modules: license.modules
      };

      // Update license
      if (newExpiryDate) license.expiresAt = new Date(newExpiryDate);
      if (newLimits) license.limits = { ...license.limits, ...newLimits };
      if (newModules) license.modules = newModules;
      
      license.status = 'active';
      license.updatedBy = req.user?.userId || 'system';

      await license.save();

      logger.info('License renewed successfully', {
        licenseId: license.licenseId,
        newExpiryDate: license.expiresAt
      });

      res.json({
        success: true,
        message: 'License renewed successfully',
        license: {
          licenseId: license.licenseId,
          licenseNumber: license.licenseNumber,
          status: license.status,
          expiresAt: license.expiresAt,
          limits: license.limits,
          modules: license.modules,
          encryptedPayload: license.generateEncryptedPayload()
        }
      });

    } catch (error) {
      logger.error('Failed to renew license', {
        error: error.message,
        licenseId: req.params.licenseId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to renew license',
        error: error.message
      });
    }
  }

  /**
   * Get license statistics
   */
  async getLicenseStatistics(req, res) {
    try {
      const totalLicenses = await License.count();
      const activeLicenses = await License.count({ where: { status: 'active' } });
      const expiredLicenses = await License.count({ where: { status: 'expired' } });
      const suspendedLicenses = await License.count({ where: { status: 'suspended' } });

      // Get counts by type
      const typeStats = await License.findAll({
        attributes: [
          'licenseType',
          [License.sequelize.fn('COUNT', License.sequelize.col('id')), 'count'],
          [License.sequelize.fn('SUM', License.sequelize.literal("CASE WHEN status = 'active' THEN 1 ELSE 0 END")), 'active']
        ],
        group: ['licenseType'],
        raw: true
      });

      res.json({
        success: true,
        statistics: {
          overview: {
            totalLicenses,
            activeLicenses,
            expiredLicenses,
            suspendedLicenses
          },
          byType: typeStats
        }
      });

    } catch (error) {
      logger.error('Failed to get license statistics', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        error: error.message
      });
    }
  }
}

export default new LicenseController();
