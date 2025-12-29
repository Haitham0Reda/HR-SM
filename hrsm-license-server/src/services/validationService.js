import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import License from '../models/License.js';
import auditService from './auditService.js';
import logger from '../utils/logger.js';

class ValidationService {
  constructor() {
    this.publicKey = null;
    this.loadPublicKey();
  }
  
  loadPublicKey() {
    try {
      const keyPath = path.resolve(process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem');
      this.publicKey = fs.readFileSync(keyPath, 'utf8');
    } catch (error) {
      console.error('❌ Failed to load public key:', error.message);
      throw new Error('Public key not found. Generate RSA keys first.');
    }
  }
  
  // Use Node.js jsonwebtoken for JWT verification with RSA public key
  async validateToken(token, options = {}) {
    let licenseNumber = null;
    let tenantId = null;
    
    try {
      // Verify JWT signature using RSA public key
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: 'HRSM-License-Server'
      });
      
      licenseNumber = decoded.ln;
      tenantId = decoded.tid;
      
      // Get license from database
      const license = await License.findOne({ licenseNumber });
      
      if (!license) {
        const result = {
          valid: false,
          error: 'License not found in database',
          code: 'LICENSE_NOT_FOUND'
        };
        
        // Log validation failure
        await auditService.logLicenseValidation(
          licenseNumber,
          tenantId,
          result,
          options
        );
        
        return result;
      }
      
      // Check license status
      if (license.status !== 'active') {
        const result = {
          valid: false,
          error: `License is ${license.status}`,
          code: 'LICENSE_INACTIVE',
          status: license.status
        };
        
        // Log validation failure
        await auditService.logLicenseValidation(
          licenseNumber,
          license.tenantId,
          result,
          options
        );
        
        return result;
      }
      
      // Check expiry
      if (license.isExpired) {
        // Update status to expired
        license.status = 'expired';
        await license.save();
        
        const result = {
          valid: false,
          error: 'License has expired',
          code: 'LICENSE_EXPIRED',
          expiresAt: license.expiresAt
        };
        
        // Log validation failure
        await auditService.logLicenseValidation(
          licenseNumber,
          license.tenantId,
          result,
          options
        );
        
        return result;
      }
      
      // Add machine ID binding validation using Node.js crypto
      if (options.machineId) {
        const validationResult = await this.validateMachineBinding(license, options.machineId, options.ipAddress);
        if (!validationResult.valid) {
          // Log validation failure
          await auditService.logLicenseValidation(
            licenseNumber,
            license.tenantId,
            validationResult,
            options
          );
          
          return validationResult;
        }
      }
      
      // Validate domain binding if provided
      if (options.domain && license.binding.boundDomain) {
        if (license.binding.boundDomain !== options.domain) {
          const result = {
            valid: false,
            error: 'Domain mismatch',
            code: 'DOMAIN_MISMATCH',
            expectedDomain: license.binding.boundDomain,
            providedDomain: options.domain
          };
          
          // Log validation failure
          await auditService.logLicenseValidation(
            licenseNumber,
            license.tenantId,
            result,
            options
          );
          
          return result;
        }
      }
      
      // Track activation count and enforce maxActivations limit
      if (options.machineId) {
        try {
          await this.trackActivation(license, options.machineId, options.ipAddress);
        } catch (activationError) {
          if (activationError.message.includes('Maximum activations')) {
            const result = {
              valid: false,
              error: activationError.message,
              code: 'MAX_ACTIVATIONS_REACHED',
              currentActivations: license.activations.length,
              maxActivations: license.maxActivations
            };
            
            // Log validation failure
            await auditService.logLicenseValidation(
              licenseNumber,
              license.tenantId,
              result,
              options
            );
            
            return result;
          }
          throw activationError; // Re-throw if it's not an activation limit error
        }
      }
      
      // Update usage tracking
      license.usage.lastValidatedAt = new Date();
      license.usage.totalValidations = (license.usage.totalValidations || 0) + 1;
      await license.save();
      
      const result = {
        valid: true,
        license: {
          licenseNumber: license.licenseNumber,
          tenantId: license.tenantId,
          tenantName: license.tenantName,
          type: license.type,
          features: license.features,
          expiresAt: license.expiresAt,
          status: license.status,
          activations: license.activations.length,
          maxActivations: license.maxActivations
        },
        decoded
      };
      
      // Log successful validation
      await auditService.logLicenseValidation(
        licenseNumber,
        license.tenantId,
        result,
        options
      );
      
      return result;
      
    } catch (error) {
      let result;
      
      if (error.name === 'TokenExpiredError') {
        result = {
          valid: false,
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        };
      } else if (error.name === 'JsonWebTokenError') {
        result = {
          valid: false,
          error: 'Invalid token signature',
          code: 'INVALID_SIGNATURE'
        };
      } else {
        result = {
          valid: false,
          error: error.message,
          code: 'VALIDATION_ERROR'
        };
      }
      
      // Log validation failure if we have license info
      if (licenseNumber && tenantId) {
        await auditService.logLicenseValidation(
          licenseNumber,
          tenantId,
          result,
          options
        );
      }
      
      logger.error('License validation error', {
        licenseNumber,
        tenantId,
        error: error.message,
        options
      });
      
      return result;
    }
  }
  
  // Add machine ID binding validation using Node.js crypto
  async validateMachineBinding(license, machineId, ipAddress) {
    // Check if machine binding is required
    if (license.binding.machineHash) {
      // Generate hash of provided machine ID
      const providedHash = crypto.createHash('sha256').update(machineId).digest('hex');
      
      if (license.binding.machineHash !== providedHash) {
        return {
          valid: false,
          error: 'Machine ID mismatch',
          code: 'MACHINE_MISMATCH'
        };
      }
    }
    
    // Check IP whitelist if configured
    if (license.binding.ipWhitelist && license.binding.ipWhitelist.length > 0) {
      if (ipAddress && !license.binding.ipWhitelist.includes(ipAddress)) {
        return {
          valid: false,
          error: 'IP address not whitelisted',
          code: 'IP_NOT_WHITELISTED',
          ipAddress
        };
      }
    }
    
    return { valid: true };
  }
  
  // Implement license activation tracking in MongoDB with Mongoose
  async trackActivation(license, machineId, ipAddress) {
    try {
      // Check if already activated on this machine
      let activation = license.activations.find(a => a.machineId === machineId);
      
      if (activation) {
        // Update existing activation
        activation.lastValidatedAt = new Date();
        if (ipAddress) activation.ipAddress = ipAddress;
        
        // Log existing activation
        await auditService.logLicenseActivation(
          license.licenseNumber,
          license.tenantId,
          machineId,
          ipAddress,
          'existing'
        );
      } else {
        // Check if max activations reached
        if (license.activations.length >= license.maxActivations) {
          throw new Error(`Maximum activations (${license.maxActivations}) reached for this license`);
        }
        
        // Add new activation
        license.activations.push({
          machineId,
          activatedAt: new Date(),
          lastValidatedAt: new Date(),
          ipAddress
        });
        
        // Log new activation
        await auditService.logLicenseActivation(
          license.licenseNumber,
          license.tenantId,
          machineId,
          ipAddress,
          'new'
        );
      }
      
      await license.save();
      return license;
    } catch (error) {
      logger.error('Failed to track license activation', {
        licenseNumber: license.licenseNumber,
        tenantId: license.tenantId,
        machineId,
        ipAddress,
        error: error.message
      });
      throw error;
    }
  }
  
  // Quick validation without database lookup (for performance)
  async quickValidateToken(token) {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: 'HRSM-License-Server'
      });
      
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return {
          valid: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        };
      }
      
      return {
        valid: true,
        decoded
      };
      
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        code: error.name === 'JsonWebTokenError' ? 'INVALID_SIGNATURE' : 'VALIDATION_ERROR'
      };
    }
  }
  
  // Validate specific features
  async validateFeature(token, featureName) {
    const validation = await this.validateToken(token);
    
    if (!validation.valid) {
      return validation;
    }
    
    const hasFeature = validation.license.features.modules.includes(featureName);
    
    return {
      valid: hasFeature,
      error: hasFeature ? null : `Feature '${featureName}' not included in license`,
      code: hasFeature ? null : 'FEATURE_NOT_LICENSED',
      license: validation.license
    };
  }
  
  // Check usage limits
  async validateUsageLimits(token, currentUsers, currentStorage, currentAPICallsThisMonth) {
    const validation = await this.validateToken(token);
    
    if (!validation.valid) {
      return validation;
    }
    
    const license = validation.license;
    const violations = [];
    
    if (currentUsers > license.features.maxUsers) {
      violations.push({
        type: 'users',
        current: currentUsers,
        limit: license.features.maxUsers,
        message: `User limit exceeded: ${currentUsers}/${license.features.maxUsers}`
      });
    }
    
    if (currentStorage > license.features.maxStorage) {
      violations.push({
        type: 'storage',
        current: currentStorage,
        limit: license.features.maxStorage,
        message: `Storage limit exceeded: ${currentStorage}MB/${license.features.maxStorage}MB`
      });
    }
    
    if (currentAPICallsThisMonth > license.features.maxAPICallsPerMonth) {
      violations.push({
        type: 'api_calls',
        current: currentAPICallsThisMonth,
        limit: license.features.maxAPICallsPerMonth,
        message: `API call limit exceeded: ${currentAPICallsThisMonth}/${license.features.maxAPICallsPerMonth}`
      });
    }
    
    return {
      valid: violations.length === 0,
      violations,
      license: validation.license
    };
  }
  
  // Generate machine ID for hardware fingerprinting
  static generateMachineId() {
    const os = require('os');
    
    // Collect system information
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().map(cpu => cpu.model).join(''),
      networkInterfaces: JSON.stringify(os.networkInterfaces())
    };
    
    // Create hash of system information
    const machineId = crypto
      .createHash('sha256')
      .update(JSON.stringify(systemInfo))
      .digest('hex');
    
    return machineId;
  }

  /**
   * Enhanced machine binding validation with multiple factors
   */
  static validateMachineFingerprint(providedFingerprint, storedFingerprint, tolerance = 0.8) {
    if (!providedFingerprint || !storedFingerprint) {
      return { valid: false, reason: 'Missing fingerprint data' };
    }

    // Parse fingerprints (assuming JSON format)
    let provided, stored;
    try {
      provided = typeof providedFingerprint === 'string' ? JSON.parse(providedFingerprint) : providedFingerprint;
      stored = typeof storedFingerprint === 'string' ? JSON.parse(storedFingerprint) : storedFingerprint;
    } catch (error) {
      return { valid: false, reason: 'Invalid fingerprint format' };
    }

    // Calculate similarity score
    const factors = ['hostname', 'platform', 'arch', 'cpus'];
    let matches = 0;
    let total = factors.length;

    for (const factor of factors) {
      if (provided[factor] === stored[factor]) {
        matches++;
      }
    }

    const similarity = matches / total;
    const valid = similarity >= tolerance;

    return {
      valid,
      similarity,
      matches,
      total,
      reason: valid ? 'Machine fingerprint matches' : `Machine fingerprint similarity (${similarity.toFixed(2)}) below threshold (${tolerance})`
    };
  }

  /**
   * Create machine binding hash with multiple validation factors
   */
  static createMachineBindingHash(machineInfo) {
    const bindingData = {
      machineId: machineInfo.machineId,
      hostname: machineInfo.hostname,
      platform: machineInfo.platform,
      arch: machineInfo.arch,
      timestamp: Date.now()
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(bindingData))
      .digest('hex');
  }

  /**
   * Validate hardware-based license binding
   */
  async validateHardwareBinding(license, providedMachineInfo) {
    try {
      if (!license.binding.machineHash) {
        return { valid: true, reason: 'No hardware binding required' };
      }

      // Generate hash from provided machine info
      const providedHash = ValidationService.createMachineBindingHash(providedMachineInfo);

      if (license.binding.machineHash === providedHash) {
        return { valid: true, reason: 'Hardware binding matches exactly' };
      }

      // If exact match fails, try fingerprint validation for hardware changes
      if (providedMachineInfo.fingerprint && license.binding.machineFingerprint) {
        const fingerprintResult = ValidationService.validateMachineFingerprint(
          providedMachineInfo.fingerprint,
          license.binding.machineFingerprint,
          0.7 // 70% similarity threshold for hardware changes
        );

        if (fingerprintResult.valid) {
          // Update binding hash for future validations
          license.binding.machineHash = providedHash;
          license.binding.machineFingerprint = providedMachineInfo.fingerprint;
          await license.save();

          return {
            valid: true,
            reason: 'Hardware binding updated due to system changes',
            similarity: fingerprintResult.similarity
          };
        }

        return {
          valid: false,
          reason: fingerprintResult.reason,
          code: 'HARDWARE_MISMATCH'
        };
      }

      return {
        valid: false,
        reason: 'Hardware binding mismatch',
        code: 'HARDWARE_MISMATCH'
      };

    } catch (error) {
      logger.error('Hardware binding validation error', {
        licenseNumber: license.licenseNumber,
        error: error.message
      });

      return {
        valid: false,
        reason: 'Hardware binding validation failed',
        code: 'BINDING_VALIDATION_ERROR'
      };
    }
  }
}

export default new ValidationService();