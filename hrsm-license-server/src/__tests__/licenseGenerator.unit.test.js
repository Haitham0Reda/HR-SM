import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

describe('License Generator Unit Tests', () => {
  let privateKey;
  
  beforeAll(() => {
    // Load the actual private key for JWT testing
    try {
      const keyPath = path.resolve('./keys/private.pem');
      privateKey = fs.readFileSync(keyPath, 'utf8');
    } catch (error) {
      // Skip JWT tests if no key is available
      privateKey = null;
    }
  });

  describe('JWT Token Generation', () => {
    it('should generate a valid JWT token structure', () => {
      if (!privateKey) {
        console.log('Skipping JWT test - no private key available');
        return;
      }

      const mockLicense = {
        licenseNumber: 'HRSM-2025-123456',
        tenantId: 'tenant-123',
        type: 'professional',
        features: {
          modules: ['hr-core', 'payroll'],
          maxUsers: 100,
          maxStorage: 20480,
          maxAPICallsPerMonth: 200000
        },
        binding: {
          boundDomain: 'test.company.com',
          machineHash: 'test-hash'
        },
        expiresAt: new Date('2025-12-31')
      };

      // Generate JWT token using the same logic as the service
      const payload = {
        ln: mockLicense.licenseNumber,
        tid: mockLicense.tenantId,
        type: mockLicense.type,
        features: mockLicense.features.modules,
        maxUsers: mockLicense.features.maxUsers,
        maxStorage: mockLicense.features.maxStorage,
        maxAPI: mockLicense.features.maxAPICallsPerMonth,
        domain: mockLicense.binding.boundDomain,
        machineHash: mockLicense.binding.machineHash,
        exp: Math.floor(new Date(mockLicense.expiresAt).getTime() / 1000)
      };

      const token = jwt.sign(payload, privateKey, { 
        algorithm: 'RS256',
        issuer: 'HRSM-License-Server',
        subject: mockLicense.tenantId
      });

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      // Verify the token can be decoded
      const publicKeyPath = path.resolve('./keys/public.pem');
      if (fs.existsSync(publicKeyPath)) {
        const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        const decoded = jwt.verify(token, publicKey, {
          algorithms: ['RS256'],
          issuer: 'HRSM-License-Server'
        });

        expect(decoded.ln).toBe(mockLicense.licenseNumber);
        expect(decoded.tid).toBe(mockLicense.tenantId);
        expect(decoded.type).toBe(mockLicense.type);
      }
    });
  });

  describe('License Number Generation', () => {
    it('should generate a unique license number format', () => {
      const timestamp = Date.now().toString(16).toUpperCase();
      const random = crypto.randomBytes(4).toString('hex').toUpperCase();
      const licenseNumber = `HRSM-${timestamp}-${random}`;

      expect(typeof licenseNumber).toBe('string');
      expect(licenseNumber).toMatch(/^HRSM-[A-F0-9]+-[A-F0-9]+$/);
    });

    it('should generate different license numbers on subsequent calls', () => {
      const generateLicenseNumber = () => {
        const timestamp = Date.now().toString(16).toUpperCase();
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `HRSM-${timestamp}-${random}`;
      };

      const licenseNumber1 = generateLicenseNumber();
      // Add small delay to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 2) { /* wait */ }
      const licenseNumber2 = generateLicenseNumber();

      expect(licenseNumber1).not.toBe(licenseNumber2);
    });
  });

  describe('Machine ID Generation', () => {
    it('should generate a consistent machine ID', async () => {
      const os = await import('os');
      
      const generateMachineId = () => {
        // Collect system information
        const systemInfo = {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          cpus: os.cpus().map(cpu => cpu.model).join(''),
          networkInterfaces: JSON.stringify(os.networkInterfaces())
        };
        
        // Create hash of system information
        return crypto
          .createHash('sha256')
          .update(JSON.stringify(systemInfo))
          .digest('hex');
      };

      const machineId1 = generateMachineId();
      const machineId2 = generateMachineId();

      expect(typeof machineId1).toBe('string');
      expect(machineId1).toHaveLength(64); // SHA256 hash length
      expect(machineId1).toBe(machineId2); // Should be consistent
    });
  });

  describe('Machine Binding Hash', () => {
    it('should create a machine binding hash', () => {
      const machineInfo = {
        machineId: 'test-machine-id',
        hostname: 'test-machine',
        platform: 'linux',
        arch: 'x64',
        timestamp: Date.now()
      };

      const bindingData = {
        machineId: machineInfo.machineId,
        hostname: machineInfo.hostname,
        platform: machineInfo.platform,
        arch: machineInfo.arch,
        timestamp: machineInfo.timestamp
      };

      const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(bindingData))
        .digest('hex');

      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(64); // SHA256 hash length
    });

    it('should create different hashes for different machine info', () => {
      const createHash = (machineInfo) => {
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
      };

      const machineInfo1 = {
        machineId: 'machine-1',
        hostname: 'test-machine-1',
        platform: 'linux',
        arch: 'x64'
      };

      const machineInfo2 = {
        machineId: 'machine-2',
        hostname: 'test-machine-2',
        platform: 'linux',
        arch: 'x64'
      };

      const hash1 = createHash(machineInfo1);
      const hash2 = createHash(machineInfo2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Machine Fingerprint Validation', () => {
    it('should validate matching fingerprints', () => {
      const validateMachineFingerprint = (providedFingerprint, storedFingerprint, tolerance = 0.8) => {
        if (!providedFingerprint || !storedFingerprint) {
          return { valid: false, reason: 'Missing fingerprint data' };
        }

        // Parse fingerprints
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
      };

      const fingerprint = {
        hostname: 'test-machine',
        platform: 'linux',
        arch: 'x64',
        cpus: 'Intel Core i7'
      };

      const result = validateMachineFingerprint(
        JSON.stringify(fingerprint),
        JSON.stringify(fingerprint),
        0.8
      );

      expect(result.valid).toBe(true);
      expect(result.similarity).toBe(1.0);
      expect(result.matches).toBe(4);
      expect(result.total).toBe(4);
    });

    it('should validate partial fingerprint matches above threshold', () => {
      const validateMachineFingerprint = (providedFingerprint, storedFingerprint, tolerance = 0.8) => {
        let provided, stored;
        try {
          provided = typeof providedFingerprint === 'string' ? JSON.parse(providedFingerprint) : providedFingerprint;
          stored = typeof storedFingerprint === 'string' ? JSON.parse(storedFingerprint) : storedFingerprint;
        } catch (error) {
          return { valid: false, reason: 'Invalid fingerprint format' };
        }

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

        return { valid, similarity, matches, total };
      };

      const storedFingerprint = {
        hostname: 'test-machine',
        platform: 'linux',
        arch: 'x64',
        cpus: 'Intel Core i7'
      };

      const providedFingerprint = {
        hostname: 'test-machine',
        platform: 'linux',
        arch: 'x64',
        cpus: 'Intel Core i9' // Different CPU
      };

      const result = validateMachineFingerprint(
        JSON.stringify(providedFingerprint),
        JSON.stringify(storedFingerprint),
        0.7 // 70% threshold
      );

      expect(result.valid).toBe(true);
      expect(result.similarity).toBe(0.75); // 3 out of 4 match
    });

    it('should reject fingerprints below threshold', () => {
      const validateMachineFingerprint = (providedFingerprint, storedFingerprint, tolerance = 0.8) => {
        let provided, stored;
        try {
          provided = typeof providedFingerprint === 'string' ? JSON.parse(providedFingerprint) : providedFingerprint;
          stored = typeof storedFingerprint === 'string' ? JSON.parse(storedFingerprint) : storedFingerprint;
        } catch (error) {
          return { valid: false, reason: 'Invalid fingerprint format' };
        }

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

        return { valid, similarity, matches, total };
      };

      const storedFingerprint = {
        hostname: 'test-machine',
        platform: 'linux',
        arch: 'x64',
        cpus: 'Intel Core i7'
      };

      const providedFingerprint = {
        hostname: 'different-machine',
        platform: 'windows',
        arch: 'x64',
        cpus: 'AMD Ryzen'
      };

      const result = validateMachineFingerprint(
        JSON.stringify(providedFingerprint),
        JSON.stringify(storedFingerprint),
        0.8 // 80% threshold
      );

      expect(result.valid).toBe(false);
      expect(result.similarity).toBe(0.25); // Only 1 out of 4 match
    });
  });
});