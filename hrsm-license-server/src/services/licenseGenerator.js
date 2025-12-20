import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import License from '../models/License.js';

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
  async createLicense(data) {
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
      createdBy: data.createdBy,
      notes: data.notes
    });
    
    // Save to MongoDB
    await license.save();
    
    // Generate JWT token using RS256 algorithm
    const token = this.generateToken(license);
    
    return { license, token };
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
  
  async revokeLicense(licenseNumber, reason) {
    const license = await License.findOne({ licenseNumber });
    if (!license) throw new Error('License not found');
    
    license.status = 'revoked';
    license.notes = `${license.notes || ''}\nRevoked: ${reason} (${new Date().toISOString()})`;
    await license.save();
    
    return license;
  }
  
  async renewLicense(licenseNumber, newExpiryDate, notes) {
    const license = await License.findOne({ licenseNumber });
    if (!license) throw new Error('License not found');
    
    license.expiresAt = newExpiryDate;
    license.status = 'active'; // Reactivate if it was expired
    
    if (notes) {
      license.notes = `${license.notes || ''}\nRenewed: ${notes} (${new Date().toISOString()})`;
    }
    
    await license.save();
    
    // Generate new token with updated expiry
    const newToken = this.generateToken(license);
    return { license, token: newToken };
  }
  
  async suspendLicense(licenseNumber, reason) {
    const license = await License.findOne({ licenseNumber });
    if (!license) throw new Error('License not found');
    
    license.status = 'suspended';
    license.notes = `${license.notes || ''}\nSuspended: ${reason} (${new Date().toISOString()})`;
    await license.save();
    
    return license;
  }
  
  async reactivateLicense(licenseNumber) {
    const license = await License.findOne({ licenseNumber });
    if (!license) throw new Error('License not found');
    
    if (license.isExpired) {
      throw new Error('Cannot reactivate expired license. Renew first.');
    }
    
    license.status = 'active';
    license.notes = `${license.notes || ''}\nReactivated: ${new Date().toISOString()}`;
    await license.save();
    
    const newToken = this.generateToken(license);
    return { license, token: newToken };
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
  
  async updateLicenseUsage(licenseNumber, currentUsers, currentStorage) {
    const license = await License.findOne({ licenseNumber });
    if (!license) throw new Error('License not found');
    
    return await license.updateUsage(currentUsers, currentStorage);
  }
}

export default new LicenseGenerator();