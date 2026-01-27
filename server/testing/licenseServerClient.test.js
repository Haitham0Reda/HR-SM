import { LicenseServerClient, LicenseServerError } from '../services/licenseServerClient.js';

describe('LicenseServerClient', () => {
  let client;

  beforeEach(() => {
    // Create client instance with test configuration
    client = new LicenseServerClient('http://localhost:4000', 'test-api-key', {
      timeout: 1000,
      maxRetries: 2
    });
  });

  describe('constructor', () => {
    it('should throw error if baseUrl is not provided', () => {
      expect(() => new LicenseServerClient(null, 'api-key')).toThrow('License Server base URL is required');
    });

    it('should throw error if apiKey is not provided', () => {
      expect(() => new LicenseServerClient('http://localhost:4000', null)).toThrow('License Server API key is required');
    });

    it('should remove trailing slash from baseUrl', () => {
      const clientWithSlash = new LicenseServerClient('http://localhost:4000/', 'api-key');
      expect(clientWithSlash.baseUrl).toBe('http://localhost:4000');
    });

    it('should set default timeout if not provided', () => {
      const defaultClient = new LicenseServerClient('http://localhost:4000', 'api-key');
      expect(defaultClient.timeout).toBe(5000);
    });

    it('should use custom timeout if provided', () => {
      const customClient = new LicenseServerClient('http://localhost:4000', 'api-key', { timeout: 10000 });
      expect(customClient.timeout).toBe(10000);
    });

    it('should set default maxRetries if not provided', () => {
      const defaultClient = new LicenseServerClient('http://localhost:4000', 'api-key');
      expect(defaultClient.maxRetries).toBe(3);
    });

    it('should use custom maxRetries if provided', () => {
      const customClient = new LicenseServerClient('http://localhost:4000', 'api-key', { maxRetries: 5 });
      expect(customClient.maxRetries).toBe(5);
    });
  });

  describe('getTenant', () => {
    it('should throw error if tenantId is not provided', async () => {
      await expect(client.getTenant(null)).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error if tenantId is undefined', async () => {
      await expect(client.getTenant(undefined)).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error if tenantId is empty string', async () => {
      await expect(client.getTenant('')).rejects.toThrow('Tenant ID is required');
    });
  });

  describe('getEnabledModules', () => {
    it('should throw error if tenantId is not provided', async () => {
      await expect(client.getEnabledModules(null)).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error if tenantId is undefined', async () => {
      await expect(client.getEnabledModules(undefined)).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error if tenantId is empty string', async () => {
      await expect(client.getEnabledModules('')).rejects.toThrow('Tenant ID is required');
    });
  });

  describe('validateLicense', () => {
    it('should throw error if tenantId is not provided', async () => {
      await expect(client.validateLicense(null, 'license-key')).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error if licenseKey is not provided', async () => {
      await expect(client.validateLicense('test_tenant', null)).rejects.toThrow('License key is required');
    });

    it('should throw error if both parameters are missing', async () => {
      await expect(client.validateLicense(null, null)).rejects.toThrow('Tenant ID is required');
    });
  });

  describe('isModuleEnabled', () => {
    it('should throw error if tenantId is not provided', async () => {
      await expect(client.isModuleEnabled(null, 'surveys')).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error if moduleId is not provided', async () => {
      await expect(client.isModuleEnabled('test_tenant', null)).rejects.toThrow('Module ID is required');
    });

    it('should throw error if both parameters are missing', async () => {
      await expect(client.isModuleEnabled(null, null)).rejects.toThrow('Tenant ID is required');
    });
  });

  describe('getSubscription', () => {
    it('should throw error if tenantId is not provided', async () => {
      await expect(client.getSubscription(null)).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error if tenantId is undefined', async () => {
      await expect(client.getSubscription(undefined)).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error if tenantId is empty string', async () => {
      await expect(client.getSubscription('')).rejects.toThrow('Tenant ID is required');
    });
  });

  describe('LicenseServerError', () => {
    it('should create error with message', () => {
      const error = new LicenseServerError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('LicenseServerError');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create error with original error', () => {
      const originalError = new Error('Original');
      const error = new LicenseServerError('Test error', originalError);
      expect(error.originalError).toBe(originalError);
    });

    it('should create error with status code', () => {
      const error = new LicenseServerError('Test error', null, 404);
      expect(error.statusCode).toBe(404);
    });

    it('should be instance of Error', () => {
      const error = new LicenseServerError('Test error');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('configuration', () => {
    it('should store baseUrl correctly', () => {
      expect(client.baseUrl).toBe('http://localhost:4000');
    });

    it('should store apiKey correctly', () => {
      expect(client.apiKey).toBe('test-api-key');
    });

    it('should have httpClient instance', () => {
      expect(client.httpClient).toBeDefined();
    });

    it('should have correct timeout configuration', () => {
      expect(client.timeout).toBe(1000);
    });

    it('should have correct maxRetries configuration', () => {
      expect(client.maxRetries).toBe(2);
    });
  });
});
