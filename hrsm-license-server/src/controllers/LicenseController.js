/**
 * License Controller
 * 
 * Handles all license-related operations including creation, validation, renewal, and statistics
 * Implements comprehensive error handling and audit logging
 * 
 * Requirements: 4.3 - License server API endpoints with authentication and validation
 */

import LicenseGenerator from '../services/licenseGenerator.js';
import ValidationService from '../services/validationService.js';
import AuditService from '../services/auditService.js';
import License from '../models/License.js';

class LicenseController {
  /**
   * Create a new license
   * POST /licenses/create
   */
  static async createLicense(req, res) {
    try {
      const { license, token } = await LicenseGenerator.createLicense({
        ...req.validatedData,
        createdBy: req.admin.id
      });
      
      // Log license creation
      await AuditService.logLicenseOperation({
        operation: 'CREATE',
        licenseNumber: license.licenseNumber,
        tenantId: license.tenantId,
        performedBy: req.admin.id,
        details: {
          type: license.type,
          expiresAt: license.expiresAt,
          features: license.features
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.status(201).json({
        success: true,
        message: 'License created successfully',
        data: {
          licenseNumber: license.licenseNumber,
          token,
          type: license.type,
          expiresAt: license.expiresAt,
          features: license.features,
          status: license.status
        }
      });
    } catch (error) {
      console.error('License creation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create license',
        message: error.message
      });
    }
  }

  /**
   * Validate a license token
   * POST /licenses/validate
   */
  static async validateLicense(req, res) {
    try {
      const { token, machineId, ipAddress } = req.validatedData;
      const result = await ValidationService.validateToken(token, {
        machineId,
        ipAddress: ipAddress || req.ip
      });
      
      // Log validation attempt
      await AuditService.logLicenseOperation({
        operation: 'VALIDATE',
        licenseNumber: result.license?.licenseNumber || 'UNKNOWN',
        tenantId: result.license?.tenantId || 'UNKNOWN',
        performedBy: 'SYSTEM',
        details: {
          valid: result.valid,
          machineId,
          error: result.error
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: result.valid,
        valid: result.valid,
        data: result.valid ? result.license : null,
        error: result.valid ? null : result.error,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('License validation failed:', error);
      res.status(500).json({
        success: false,
        valid: false,
        error: 'Validation service error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get license details
   * GET /licenses/:licenseNumber
   */
  static async getLicenseDetails(req, res) {
    try {
      const { licenseNumber } = req.params;
      
      const license = await License.findOne({ licenseNumber })
        .select('-__v')
        .lean();
      
      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found'
        });
      }
      
      // Log license access
      await AuditService.logLicenseOperation({
        operation: 'READ',
        licenseNumber: license.licenseNumber,
        tenantId: license.tenantId,
        performedBy: req.admin.id,
        details: { accessed: true },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        data: license
      });
    } catch (error) {
      console.error('Failed to get license details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve license details'
      });
    }
  }

  /**
   * Renew a license
   * PATCH /licenses/:licenseNumber/renew
   */
  static async renewLicense(req, res) {
    try {
      const { licenseNumber } = req.params;
      const { expiresAt, notes } = req.validatedData;
      
      const license = await License.findOne({ licenseNumber });
      
      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found'
        });
      }
      
      const oldExpiresAt = license.expiresAt;
      
      // Update license
      license.expiresAt = new Date(expiresAt);
      license.status = 'active'; // Reactivate if it was expired
      
      if (notes) {
        license.notes = `${license.notes || ''}\nRenewed: ${notes} (${new Date().toISOString()})`;
      }
      
      await license.save();
      
      // Generate new token
      const newToken = LicenseGenerator.generateToken(license);
      
      // Log license renewal
      await AuditService.logLicenseOperation({
        operation: 'RENEW',
        licenseNumber: license.licenseNumber,
        tenantId: license.tenantId,
        performedBy: req.admin.id,
        details: {
          oldExpiresAt,
          newExpiresAt: license.expiresAt,
          notes
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        message: 'License renewed successfully',
        data: {
          licenseNumber: license.licenseNumber,
          token: newToken,
          expiresAt: license.expiresAt,
          status: license.status
        }
      });
    } catch (error) {
      console.error('License renewal failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to renew license'
      });
    }
  }

  /**
   * Revoke a license
   * DELETE /licenses/:licenseNumber
   */
  static async revokeLicense(req, res) {
    try {
      const { licenseNumber } = req.params;
      const { reason } = req.validatedData;
      
      const license = await LicenseGenerator.revokeLicense(licenseNumber, reason);
      
      // Log license revocation
      await AuditService.logLicenseOperation({
        operation: 'REVOKE',
        licenseNumber: license.licenseNumber,
        tenantId: license.tenantId,
        performedBy: req.admin.id,
        details: { reason },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        message: 'License revoked successfully',
        data: {
          licenseNumber: license.licenseNumber,
          status: license.status,
          revokedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('License revocation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke license'
      });
    }
  }

  /**
   * Get tenant's licenses
   * GET /licenses/tenant/:tenantId
   */
  static async getTenantLicenses(req, res) {
    try {
      const { tenantId } = req.params;
      
      const licenses = await License.find({ tenantId })
        .select('-__v')
        .sort({ createdAt: -1 })
        .lean();
      
      res.json({
        success: true,
        data: {
          tenantId,
          licenses,
          count: licenses.length,
          activeLicense: licenses.find(l => l.status === 'active') || null
        }
      });
    } catch (error) {
      console.error('Failed to get tenant licenses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tenant licenses'
      });
    }
  }

  /**
   * List all licenses with pagination
   * GET /licenses
   */
  static async listLicenses(req, res) {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const status = req.query.status;
      const type = req.query.type;
      const search = req.query.search;
      
      // Build query
      const query = {};
      
      if (status) {
        query.status = status;
      }
      
      if (type) {
        query.type = type;
      }
      
      if (search) {
        // Sanitized search from validation middleware
        query.$or = [
          { licenseNumber: { $regex: search, $options: 'i' } },
          { tenantName: { $regex: search, $options: 'i' } },
          { tenantId: { $regex: search, $options: 'i' } }
        ];
      }
      
      const skip = (page - 1) * limit;
      
      const [licenses, total] = await Promise.all([
        License.find(query)
          .select('-__v')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        License.countDocuments(query)
      ]);
      
      res.json({
        success: true,
        data: {
          licenses,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Failed to list licenses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve licenses'
      });
    }
  }

  /**
   * Get license statistics
   * GET /licenses/stats
   */
  static async getLicenseStatistics(req, res) {
    try {
      // Get overall license statistics
      const [
        totalLicenses,
        activeLicenses,
        expiredLicenses,
        revokedLicenses,
        suspendedLicenses,
        licensesByType,
        recentActivations,
        expiringLicenses
      ] = await Promise.all([
        License.countDocuments(),
        License.countDocuments({ status: 'active' }),
        License.countDocuments({ status: 'expired' }),
        License.countDocuments({ status: 'revoked' }),
        License.countDocuments({ status: 'suspended' }),
        License.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        License.aggregate([
          { $unwind: '$activations' },
          { $match: { 'activations.activatedAt': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$activations.activatedAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: -1 } },
          { $limit: 30 }
        ]),
        License.find({ 
          status: 'active',
          expiresAt: { 
            $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
          }
        }).select('licenseNumber tenantName expiresAt').sort({ expiresAt: 1 }).limit(10)
      ]);

      // Calculate usage statistics
      const usageStats = await License.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: '$usage.currentUsers' },
            totalStorage: { $sum: '$usage.currentStorage' },
            totalValidations: { $sum: '$usage.totalValidations' },
            avgUsers: { $avg: '$usage.currentUsers' },
            avgStorage: { $avg: '$usage.currentStorage' }
          }
        }
      ]);

      const usage = usageStats[0] || {
        totalUsers: 0,
        totalStorage: 0,
        totalValidations: 0,
        avgUsers: 0,
        avgStorage: 0
      };

      res.json({
        success: true,
        data: {
          overview: {
            total: totalLicenses,
            active: activeLicenses,
            expired: expiredLicenses,
            revoked: revokedLicenses,
            suspended: suspendedLicenses
          },
          byType: licensesByType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          usage: {
            totalUsers: usage.totalUsers,
            totalStorage: Math.round(usage.totalStorage),
            totalValidations: usage.totalValidations,
            averageUsers: Math.round(usage.avgUsers * 100) / 100,
            averageStorage: Math.round(usage.avgStorage * 100) / 100
          },
          recentActivations: recentActivations.map(item => ({
            date: item._id,
            count: item.count
          })),
          expiringLicenses: expiringLicenses.map(license => ({
            licenseNumber: license.licenseNumber,
            tenantName: license.tenantName,
            expiresAt: license.expiresAt,
            daysUntilExpiry: Math.ceil((license.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
          })),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to get license statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve license statistics'
      });
    }
  }

  /**
   * Update license usage
   * PATCH /licenses/:licenseNumber/usage
   */
  static async updateLicenseUsage(req, res) {
    try {
      const { licenseNumber } = req.params;
      const { currentUsers, currentStorage } = req.body;
      
      const license = await License.findOne({ licenseNumber });
      
      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found'
        });
      }
      
      // Update usage
      if (currentUsers !== undefined) {
        license.usage.currentUsers = currentUsers;
      }
      
      if (currentStorage !== undefined) {
        license.usage.currentStorage = currentStorage;
      }
      
      license.usage.lastValidatedAt = new Date();
      
      await license.save();
      
      res.json({
        success: true,
        message: 'License usage updated successfully',
        data: {
          licenseNumber: license.licenseNumber,
          usage: license.usage
        }
      });
    } catch (error) {
      console.error('Failed to update license usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update license usage'
      });
    }
  }
}

export default LicenseController;