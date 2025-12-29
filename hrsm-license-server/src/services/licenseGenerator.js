import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import License from '../models/License.js';
import auditService from './auditService.js';
import logger from '../utils/logger.js';

class LicenseGenerator {
  constructor() {
    this.privateKey = null;
    this.loadPrivateKey();
  }
  
  loadPrivateKey() {
    try {
      const keyPath = path.resolve(process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem');
      this.privateKey = fs.readFileSync(keyPath, 'utf8');
    } catch (error) {
      console.error('❌ Failed to load private key:', error.message);
      throw new Error('Private key not found. Generate RSA keys first.');
    }
  }
  
  static generateLicenseNumber() {
    const timestamp = Date.now().toString(16).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `HRSM-${timestamp}-${random}`;
  }
  
  // Service methods for creating, revoking, and renewing licenses
  async createLicense(data, performedBy = 'system') {
    try {
      // Create Mongoose document
      const license = new License({
        tenantId: data.tenantId,
        tenantName: data.tenantName,
        type: data.type,
        features: {
          modules: data.modules || ['hr-core'],
          maxUsers: data.maxUsers || 50,
          maxStorage: data.maxStorage || 10240,
          maxAPICallsPerMonth: data.maxAPICallsPerMonth || 100000
        },
        binding: {
          boundDomain: data.domain,
          machineHash: data.machineHash,
          ipWhitelist: data.ipWhitelist || []
        },
        expiresAt: data.expiresAt,
        maxActivations: data.maxActivations || 1,
        createdBy: data.createdBy || performedBy,
        notes: data.notes
      });
      
      // Save to MongoDB
      await license.save();
      
      // Generate JWT token using RS256 algorithm
      const token = this.generateToken(license);
      
      // Log license creation for audit trail
      await auditService.logLicenseCreation(
        license.licenseNumber,
        license.tenantId,
        license.toObject(),
        performedBy
      );
      
      logger.info('License created successfully', {
        licenseNumber: license.licenseNumber,
        tenantId: license.tenantId,
        type: license.type,
        performedBy
      });
      
      return { license, token };
    } catch (error) {
      logger.error('Failed to create license', {
        tenantId: data.tenantId,
        error: error.message,
        performedBy
      });
      throw error;
    }
  }
  
  // Generate JWT tokens using Node.js jsonwebtoken library with RS256 algorithm
  generateToken(license) {
    // Include tenant ID, features, expiry, and machine binding in JWT payload
    const payload = {
      ln: license.licenseNumber,
      tid: license.tenantId,
      type: license.type,
      features: license.features.modules,
      maxUsers: license.features.maxUsers,
      maxStorage: license.features.maxStorage,
      maxAPI: license.features.maxAPICallsPerMonth,
      domain: license.binding.boundDomain,
      machineHash: license.binding.machineHash,
      exp: Math.floor(new Date(license.expiresAt).getTime() / 1000)
    };
    
    // Sign tokens with RSA private key (4096-bit)
    return jwt.sign(payload, this.privateKey, { 
      algorithm: 'RS256',
      issuer: 'HRSM-License-Server',
      subject: license.tenantId
    });
  }
  
  async revokeLicense(licenseNumber, reason, performedBy = 'system') {
    try {
      const license = await License.findOne({ licenseNumber });
      if (!license) throw new Error('License not found');
      
      const oldStatus = license.status;
      license.status = 'revoked';
      license.notes = `${license.notes || ''}\nRevoked: ${reason} (${new Date().toISOString()})`;
      await license.save();
      
      // Log revocation for audit trail
      await auditService.logLicenseRevocation(
        licenseNumber,
        license.tenantId,
        reason,
        performedBy
      );
      
      logger.info('License revoked', {
        licenseNumber,
        tenantId: license.tenantId,
        reason,
        oldStatus,
        performedBy
      });
      
      return license;
    } catch (error) {
      logger.error('Failed to revoke license', {
        licenseNumber,
        reason,
        error: error.message,
        performedBy
      });
      throw error;
    }
  }
  
  async renewLicense(licenseNumber, newExpiryDate, notes, performedBy = 'system') {
    try {
      const license = await License.findOne({ licenseNumber });
      if (!license) throw new Error('License not found');
      
      const oldExpiryDate = license.expiresAt;
      license.expiresAt = newExpiryDate;
      license.status = 'active'; // Reactivate if it was expired
      
      if (notes) {
        license.notes = `${license.notes || ''}\nRenewed: ${notes} (${new Date().toISOString()})`;
      }
      
      await license.save();
      
      // Log renewal for audit trail
      await auditService.logLicenseRenewal(
        licenseNumber,
        license.tenantId,
        oldExpiryDate,
        newExpiryDate,
        performedBy
      );
      
      logger.info('License renewed', {
        licenseNumber,
        tenantId: license.tenantId,
        oldExpiryDate,
        newExpiryDate,
        performedBy
      });
      
      // Generate new token with updated expiry
      const newToken = this.generateToken(license);
      return { license, token: newToken };
    } catch (error) {
      logger.error('Failed to renew license', {
        licenseNumber,
        newExpiryDate,
        error: error.message,
        performedBy
      });
      throw error;
    }
  }
  
  async suspendLicense(licenseNumber, reason, performedBy = 'system') {
    try {
      const license = await License.findOne({ licenseNumber });
      if (!license) throw new Error('License not found');
      
      const oldStatus = license.status;
      license.status = 'suspended';
      license.notes = `${license.notes || ''}\nSuspended: ${reason} (${new Date().toISOString()})`;
      await license.save();
      
      // Log suspension for audit trail
      await auditService.logLicenseSuspension(
        licenseNumber,
        license.tenantId,
        reason,
        performedBy
      );
      
      logger.info('License suspended', {
        licenseNumber,
        tenantId: license.tenantId,
        reason,
        oldStatus,
        performedBy
      });
      
      return license;
    } catch (error) {
      logger.error('Failed to suspend license', {
        licenseNumber,
        reason,
        error: error.message,
        performedBy
      });
      throw error;
    }
  }
  
  async reactivateLicense(licenseNumber, performedBy = 'system') {
    try {
      const license = await License.findOne({ licenseNumber });
      if (!license) throw new Error('License not found');
      
      if (license.isExpired) {
        throw new Error('Cannot reactivate expired license. Renew first.');
      }
      
      const oldStatus = license.status;
      license.status = 'active';
      license.notes = `${license.notes || ''}\nReactivated: ${new Date().toISOString()}`;
      await license.save();
      
      // Log reactivation for audit trail
      await auditService.logLicenseReactivation(
        licenseNumber,
        license.tenantId,
        performedBy
      );
      
      logger.info('License reactivated', {
        licenseNumber,
        tenantId: license.tenantId,
        oldStatus,
        performedBy
      });
      
      const newToken = this.generateToken(license);
      return { license, token: newToken };
    } catch (error) {
      logger.error('Failed to reactivate license', {
        licenseNumber,
        error: error.message,
        performedBy
      });
      throw error;
    }
  }
  
  async getLicense(licenseNumber) {
    const license = await License.findOne({ licenseNumber });
    if (!license) throw new Error('License not found');
    return license;
  }
  
  async getTenantLicenses(tenantId) {
    const licenses = await License.find({ tenantId }).sort({ createdAt: -1 });
    return licenses;
  }
  
  async updateLicenseUsage(licenseNumber, currentUsers, currentStorage, apiCallsThisMonth) {
    try {
      const license = await License.findOne({ licenseNumber });
      if (!license) throw new Error('License not found');
      
      const oldUsage = { ...license.usage };
      const updatedUsage = await license.updateUsage(currentUsers, currentStorage);
      
      // Update API calls tracking if provided
      if (apiCallsThisMonth !== undefined) {
        license.usage.apiCallsThisMonth = apiCallsThisMonth;
        await license.save();
      }
      
      // Log usage update for audit trail
      await auditService.logUsageUpdate(
        licenseNumber,
        license.tenantId,
        {
          currentUsers,
          currentStorage,
          apiCallsThisMonth
        }
      );
      
      logger.debug('License usage updated', {
        licenseNumber,
        tenantId: license.tenantId,
        oldUsage,
        newUsage: license.usage
      });
      
      return updatedUsage;
    } catch (error) {
      logger.error('Failed to update license usage', {
        licenseNumber,
        currentUsers,
        currentStorage,
        apiCallsThisMonth,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Auto-renewal logic for licenses nearing expiry
   * @param {number} daysBeforeExpiry - Number of days before expiry to trigger auto-renewal
   * @param {number} renewalPeriodDays - Number of days to extend the license
   * @param {string} performedBy - Who is performing the auto-renewal
   */
  async autoRenewExpiringLicenses(daysBeforeExpiry = 7, renewalPeriodDays = 365, performedBy = 'auto-renewal-system') {
    try {
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + daysBeforeExpiry);
      
      // Find licenses that are active and expiring soon
      const expiringLicenses = await License.find({
        status: 'active',
        expiresAt: { $lte: expiryThreshold },
        type: { $in: ['professional', 'enterprise', 'unlimited'] } // Only auto-renew paid licenses
      });
      
      const renewalResults = [];
      
      for (const license of expiringLicenses) {
        try {
          // Calculate new expiry date
          const newExpiryDate = new Date(license.expiresAt);
          newExpiryDate.setDate(newExpiryDate.getDate() + renewalPeriodDays);
          
          // Renew the license
          const renewalResult = await this.renewLicense(
            license.licenseNumber,
            newExpiryDate,
            `Auto-renewed for ${renewalPeriodDays} days`,
            performedBy
          );
          
          renewalResults.push({
            licenseNumber: license.licenseNumber,
            tenantId: license.tenantId,
            oldExpiryDate: license.expiresAt,
            newExpiryDate,
            status: 'success'
          });
          
        } catch (error) {
          renewalResults.push({
            licenseNumber: license.licenseNumber,
            tenantId: license.tenantId,
            status: 'failed',
            error: error.message
          });
          
          logger.error('Auto-renewal failed for license', {
            licenseNumber: license.licenseNumber,
            tenantId: license.tenantId,
            error: error.message
          });
        }
      }
      
      logger.info('Auto-renewal process completed', {
        totalLicenses: expiringLicenses.length,
        successful: renewalResults.filter(r => r.status === 'success').length,
        failed: renewalResults.filter(r => r.status === 'failed').length,
        daysBeforeExpiry,
        renewalPeriodDays
      });
      
      return renewalResults;
    } catch (error) {
      logger.error('Auto-renewal process failed', {
        daysBeforeExpiry,
        renewalPeriodDays,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check and update expired licenses
   */
  async updateExpiredLicenses() {
    try {
      const now = new Date();
      
      // Find active licenses that have expired
      const expiredLicenses = await License.find({
        status: 'active',
        expiresAt: { $lt: now }
      });
      
      const updateResults = [];
      
      for (const license of expiredLicenses) {
        try {
          license.status = 'expired';
          license.notes = `${license.notes || ''}\nAuto-expired: ${now.toISOString()}`;
          await license.save();
          
          // Log expiry for audit trail
          await auditService.logOperation(
            'expire',
            license.licenseNumber,
            license.tenantId,
            'success',
            { expiredAt: now },
            {},
            'auto-expiry-system'
          );
          
          updateResults.push({
            licenseNumber: license.licenseNumber,
            tenantId: license.tenantId,
            status: 'expired'
          });
          
        } catch (error) {
          updateResults.push({
            licenseNumber: license.licenseNumber,
            tenantId: license.tenantId,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      if (expiredLicenses.length > 0) {
        logger.info('Expired licenses updated', {
          totalExpired: expiredLicenses.length,
          successful: updateResults.filter(r => r.status === 'expired').length,
          failed: updateResults.filter(r => r.status === 'failed').length
        });
      }
      
      return updateResults;
    } catch (error) {
      logger.error('Failed to update expired licenses', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get license statistics and usage analytics
   */
  async getLicenseStatistics(tenantId = null) {
    try {
      const matchStage = tenantId ? { tenantId } : {};
      
      const stats = await License.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalUsers: { $sum: '$usage.currentUsers' },
            totalStorage: { $sum: '$usage.currentStorage' },
            avgUsers: { $avg: '$usage.currentUsers' },
            avgStorage: { $avg: '$usage.currentStorage' }
          }
        }
      ]);
      
      const typeStats = await License.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            activeCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
              }
            }
          }
        }
      ]);
      
      const expiryStats = await License.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            expiringIn7Days: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'active'] },
                      { $lte: ['$expiresAt', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            expiringIn30Days: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'active'] },
                      { $lte: ['$expiresAt', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      
      return {
        statusStats: stats,
        typeStats,
        expiryStats: expiryStats[0] || { expiringIn7Days: 0, expiringIn30Days: 0 },
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to get license statistics', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }
}

export default new LicenseGenerator();