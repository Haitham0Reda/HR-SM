import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import License from '../models/License.js';

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
    try {
      // Verify JWT signature using RSA public key
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: 'HRSM-License-Server'
      });
      
      // Get license from database
      const license = await License.findOne({ licenseNumber: decoded.ln });
      
      if (!license) {
        return {
          valid: false,
          error: 'License not found in database',
          code: 'LICENSE_NOT_FOUND'
        };
      }
      
      // Check license status
      if (license.status !== 'active') {
        return {
          valid: false,
          error: `License is ${license.status}`,
          code: 'LICENSE_INACTIVE',
          status: license.status
        };
      }
      
      // Check expiry
      if (license.isExpired) {
        // Update status to expired
        license.status = 'expired';
        await license.save();
        
        return {
          valid: false,
          error: 'License has expired',
          code: 'LICENSE_EXPIRED',
          expiresAt: license.expiresAt
        };
      }
      
      // Add machine ID binding validation using Node.js crypto
      if (options.machineId) {
        const validationResult = await this.validateMachineBinding(license, options.machineId, options.ipAddress);
        if (!validationResult.valid) {
          return validationResult;
        }
      }
      
      // Validate domain binding if provided
      if (options.domain && license.binding.boundDomain) {
        if (license.binding.boundDomain !== options.domain) {
          return {
            valid: false,
            error: 'Domain mismatch',
            code: 'DOMAIN_MISMATCH',
            expectedDomain: license.binding.boundDomain,
            providedDomain: options.domain
          };
        }
      }
      
      // Track activation count and enforce maxActivations limit
      if (options.machineId) {
        try {
          await this.trackActivation(license, options.machineId, options.ipAddress);
        } catch (activationError) {
          if (activationError.message.includes('Maximum activations')) {
            return {
              valid: false,
              error: activationError.message,
              code: 'MAX_ACTIVATIONS_REACHED',
              currentActivations: license.activations.length,
              maxActivations: license.maxActivations
            };
          }
          throw activationError; // Re-throw if it's not an activation limit error
        }
      }
      
      // Update usage tracking
      license.usage.lastValidatedAt = new Date();
      license.usage.totalValidations = (license.usage.totalValidations || 0) + 1;
      await license.save();
      
      return {
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
      
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return {
          valid: false,
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        };
      }
      
      if (error.name === 'JsonWebTokenError') {
        return {
          valid: false,
          error: 'Invalid token signature',
          code: 'INVALID_SIGNATURE'
        };
      }
      
      return {
        valid: false,
        error: error.message,
        code: 'VALIDATION_ERROR'
      };
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
    // Check if already activated on this machine
    let activation = license.activations.find(a => a.machineId === machineId);
    
    if (activation) {
      // Update existing activation
      activation.lastValidatedAt = new Date();
      if (ipAddress) activation.ipAddress = ipAddress;
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
    }
    
    await license.save();
    return license;
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
}

export default new ValidationService();